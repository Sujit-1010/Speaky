const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const config = require('../config');
const auth = require('../middleware/auth');
const firebaseAdmin = require('../utils/firebaseAdmin');
const { updateStreak } = require('../controllers/streak.controller');
const { sendVerificationEmail } = require('../utils/mailer');
const { makeLazyRedisStore } = require('../utils/redisStore');

const router = express.Router();

// Grandfather existing accounts created before email verification feature
User.updateMany({ emailVerified: { $exists: false } }, { $set: { emailVerified: true } })
    .then(res => {
        if (res.modifiedCount > 0) {
            console.log(`[Auth Migration] Grandfathered ${res.modifiedCount} existing users as emailVerified: true`);
        }
    })
    .catch(err => console.error('[Auth Migration] Error grandfathering existing users:', err?.message || err));

function getFrontendBaseUrl() {
    return process.env.FRONTEND_URL || (config.corsOrigins || [])[0] || 'http://localhost:5173';
}

const signToken = (user) => jwt.sign({ id: user._id.toString(), email: user.email }, config.jwtSecret, { expiresIn: '7d' });
// Configure cookie attributes for cross-site usage (Vercel frontend -> Render backend)
const cookieOpts = {
    httpOnly: true,
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    secure: config.nodeEnv === 'production'
};

const resendRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    store: makeLazyRedisStore('email-resend'),
    keyGenerator: (req) => String(req.body?.email || req.ip || 'unknown'),
    message: { message: 'Too many verification requests. Please wait 15 minutes before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/register', async (req, res) => {
    try {
        const { email, password, full_name } = req.body || {};
        if (!email || !password || !full_name) return res.status(400).json({ message: 'Missing fields' });
        const exists = await User.findOne({ email });
        if (exists) return res.status(409).json({ message: 'Email already registered' });
        
        const passwordHash = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const user = await User.create({
            email,
            passwordHash,
            full_name,
            emailVerified: false,
            verificationToken,
            verificationTokenExpiry
        });
        await UserProfile.create({ user_id: user.email });

        const frontendBase = getFrontendBaseUrl();
        const verificationUrl = `${frontendBase}/verify-email?token=${verificationToken}`;

        try {
            await sendVerificationEmail({ to: user.email, userName: user.full_name, verificationUrl });
        } catch (mailErr) {
            console.error('Error sending verification email during signup:', mailErr?.message || mailErr);
        }

        res.status(201).json({
            message: 'Registration successful! Please check your email to verify your account before logging in.',
            requiresVerification: true,
            email: user.email
        });
    } catch (e) {
        console.error('Register error:', e);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

        if (user.emailVerified === false) {
            return res.status(403).json({
                message: 'Please verify your email before logging in.',
                unverified: true,
                email: user.email
            });
        }

        const streakResult = await updateStreak(user.email);
        const profile = streakResult.profile;

        const token = signToken(user);
        res.cookie('token', token, cookieOpts);
        res.json({ token, user: { id: user._id.toString(), email: user.email, full_name: user.full_name, avatar: user.avatar, xp_points: user.xp_points, level: profile?.level || 1, xp: profile?.xp || 0, totalXP: profile?.totalXP || 0, streak: streakResult.streak ?? profile?.streak ?? 0, longestStreak: profile?.longestStreak || 0, lastActiveDate: profile?.lastActiveDate || null, streakChanged: streakResult.changed || false, streakIncreased: streakResult.increased || false, streakReset: streakResult.reset || false, previousStreak: streakResult.previousStreak ?? 0, isFirstLogin: streakResult.isFirstLogin || false, streakData: streakResult } });
    } catch (e) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query || {};
        if (!token) return res.status(400).json({ message: 'Verification token is required' });

        const user = await User.findOne({ verificationToken: token });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }
        if (user.verificationTokenExpiry && new Date(user.verificationTokenExpiry) < new Date()) {
            return res.status(400).json({ message: 'Verification token has expired. Please request a new verification email.' });
        }

        user.emailVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiry = undefined;
        await user.save();

        res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
    } catch (e) {
        console.error('Verify email error:', e);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/resend-verification', resendRateLimit, async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User with this email was not found' });

        if (user.emailVerified) {
            return res.status(400).json({ message: 'This email is already verified. You can log in.' });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        user.verificationToken = verificationToken;
        user.verificationTokenExpiry = verificationTokenExpiry;
        await user.save();

        const frontendBase = getFrontendBaseUrl();
        const verificationUrl = `${frontendBase}/verify-email?token=${verificationToken}`;

        try {
            await sendVerificationEmail({ to: user.email, userName: user.full_name, verificationUrl });
        } catch (mailErr) {
            console.error('Error sending resend verification email:', mailErr?.message || mailErr);
        }

        res.json({ success: true, message: 'Verification email sent successfully. Please check your inbox.' });
    } catch (e) {
        console.error('Resend verification error:', e);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/firebase', async (req, res) => {
    try {
        const { idToken, full_name, avatar } = req.body || {};
        if (!idToken) return res.status(400).json({ message: 'Missing idToken' });
        const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
        const email = decoded.email;
        if (!email) return res.status(400).json({ message: 'Email not present in token' });
        const firebase_uid = decoded.uid;
        const displayName = full_name || decoded.name || (email.split('@')[0]);
        const photoURL = avatar || decoded.picture;
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ email, full_name: displayName, avatar: photoURL, auth_provider: 'google', firebase_uid, emailVerified: true });
            try { await UserProfile.create({ user_id: user.email }); } catch (err) { console.error('[auth] Profile creation error on Google login:', err?.message || err); }
        } else {
            const updates = {};
            if (!user.firebase_uid) updates.firebase_uid = firebase_uid;
            if (user.auth_provider !== 'google') updates.auth_provider = 'google';
            if (!user.avatar && photoURL) updates.avatar = photoURL;
            if (Object.keys(updates).length) {
                await User.updateOne({ _id: user._id }, { $set: updates });
                user = await User.findById(user._id);
            }
        }

        const streakResult = await updateStreak(user.email);
        const profile = streakResult.profile;

        const token = signToken(user);
        res.cookie('token', token, cookieOpts);
        res.json({ token, user: { id: user._id.toString(), email: user.email, full_name: user.full_name, avatar: user.avatar, xp_points: user.xp_points, level: profile?.level || 1, xp: profile?.xp || 0, totalXP: profile?.totalXP || 0, streak: streakResult.streak ?? profile?.streak ?? 0, longestStreak: profile?.longestStreak || 0, lastActiveDate: profile?.lastActiveDate || null, streakChanged: streakResult.changed || false, streakIncreased: streakResult.increased || false, streakReset: streakResult.reset || false, previousStreak: streakResult.previousStreak ?? 0, isFirstLogin: streakResult.isFirstLogin || false, streakData: streakResult } });
    } catch (e) {
        console.error('Firebase verify error:', e);
        const msg = (config.nodeEnv !== 'production' && (e?.message || e?.errorInfo?.message)) ? (e.message || e.errorInfo.message) : 'Invalid Firebase token';
        res.status(401).json({ message: msg });
    }
});

router.post('/logout', auth, async (req, res) => {
    res.clearCookie('token', cookieOpts);
    res.json({ success: true });
});

router.get('/me', auth, async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Not found' });

    // updateStreak returns the profile in all code paths (changed or not),
    // eliminating the redundant second UserProfile.findOne that was here before.
    // Query count: User.findById (1) + UserProfile.findOne inside streak (2)
    // + UserProfile.findOneAndUpdate only on the first call of a new day (3, conditional).
    const streakResult = await updateStreak(user.email);
    const profile = streakResult.profile;

    res.json({
        id: user._id.toString(),
        email: user.email,
        full_name: user.full_name,
        avatar: user.avatar,
        xp_points: user.xp_points,
        level: profile?.level || 1,
        xp: profile?.xp || 0,
        totalXP: profile?.totalXP || 0,
        streak: streakResult.streak ?? profile?.streak ?? 0,
        longestStreak: profile?.longestStreak || 0,
        lastActiveDate: profile?.lastActiveDate || null,
        // Flat streak metadata for popup logic
        streakChanged: streakResult.changed || false,
        streakIncreased: streakResult.increased || false,
        streakReset: streakResult.reset || false,
        previousStreak: streakResult.previousStreak ?? 0,
        isFirstLogin: streakResult.isFirstLogin || false,
        // Keep nested for backward compat
        streakData: streakResult
    });
});

module.exports = router;
