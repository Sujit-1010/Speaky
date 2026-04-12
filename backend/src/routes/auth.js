const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const config = require('../config');
const auth = require('../middleware/auth');
const firebaseAdmin = require('../utils/firebaseAdmin');
const { updateStreak } = require('../controllers/streak.controller');

const router = express.Router();

router.use(cookieParser());

const signToken = (user) => jwt.sign({ id: user._id.toString(), email: user.email }, config.jwtSecret, { expiresIn: '7d' });
// Configure cookie attributes for cross-site usage (Vercel frontend -> Render backend)
const cookieOpts = {
    httpOnly: true,
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    secure: config.nodeEnv === 'production'
};

router.post('/register', async (req, res) => {
    try {
        const { email, password, full_name } = req.body || {};
        if (!email || !password || !full_name) return res.status(400).json({ message: 'Missing fields' });
        const exists = await User.findOne({ email });
        if (exists) return res.status(409).json({ message: 'Email already registered' });
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ email, passwordHash, full_name });
        await UserProfile.create({ user_id: user.email });
        const token = signToken(user);
        res.cookie('token', token, cookieOpts);
        res.json({ token, user: { id: user._id.toString(), email: user.email, full_name: user.full_name, avatar: user.avatar, xp_points: user.xp_points, level: user.level } });
    } catch (e) {
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
        
        const streakResult = await updateStreak(user.email);
        const profile = await UserProfile.findOne({ user_id: user.email });
        
        const token = signToken(user);
        res.cookie('token', token, cookieOpts);
        res.json({ token, user: { id: user._id.toString(), email: user.email, full_name: user.full_name, avatar: user.avatar, xp_points: user.xp_points, level: profile?.level || 1, xp: profile?.xp || 0, totalXP: profile?.totalXP || 0, streak: streakResult.streak ?? profile?.streak ?? 0, longestStreak: profile?.longestStreak || 0, lastActiveDate: profile?.lastActiveDate || null, streakChanged: streakResult.changed || false, streakIncreased: streakResult.increased || false, streakReset: streakResult.reset || false, previousStreak: streakResult.previousStreak ?? 0, isFirstLogin: streakResult.isFirstLogin || false, streakData: streakResult } });
    } catch (e) {
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
            user = await User.create({ email, full_name: displayName, avatar: photoURL, auth_provider: 'google', firebase_uid });
            try { await UserProfile.create({ user_id: user.email }); } catch { }
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
        const profile = await UserProfile.findOne({ user_id: user.email });
        
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
    
    const streakResult = await updateStreak(user.email);
    const profile = await UserProfile.findOne({ user_id: user.email });
    
    console.log('Auth me response:', {
      xp: profile?.xp,
      totalXP: profile?.totalXP,
      level: profile?.level,
      streakResult
    });

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
