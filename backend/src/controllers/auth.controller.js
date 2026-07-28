const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const config = require('../config');
const firebaseAdmin = require('../utils/firebaseAdmin');
const { updateStreak } = require('./streak.controller');
const { sendVerificationEmail } = require('../utils/mailer');

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

const cookieOpts = {
    httpOnly: true,
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    secure: config.nodeEnv === 'production'
};

async function register(req, res) {
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
}

async function login(req, res) {
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
}

async function verifyEmail(req, res) {
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
}

async function resendVerification(req, res) {
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
}

async function firebaseLogin(req, res) {
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
}

async function logout(req, res) {
    res.clearCookie('token', cookieOpts);
    res.json({ success: true });
}

async function getMe(req, res) {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Not found' });

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
        streakChanged: streakResult.changed || false,
        streakIncreased: streakResult.increased || false,
        streakReset: streakResult.reset || false,
        previousStreak: streakResult.previousStreak ?? 0,
        isFirstLogin: streakResult.isFirstLogin || false,
        streakData: streakResult
    });
}

module.exports = {
    register,
    login,
    verifyEmail,
    resendVerification,
    firebaseLogin,
    logout,
    getMe,
};
