const express = require('express');
const auth = require('../middleware/auth');
const PushToken = require('../models/PushToken');
const { sendPushToUser } = require('../utils/pushNotifications');

const router = express.Router();

router.post('/subscribe', auth, async (req, res) => {
    try {
        const { token, platform, user_agent } = req.body || {};
        if (!token) return res.status(400).json({ message: 'Missing token' });

        const doc = await PushToken.findOneAndUpdate(
            { token: String(token) },
            {
                $set: {
                    user_id: req.user.email,
                    token: String(token),
                    platform: platform || 'web',
                    user_agent: user_agent || req.headers['user-agent'] || null,
                    last_seen_at: new Date(),
                }
            },
            { new: true, upsert: true }
        );

        res.status(201).json({ success: true, id: doc._id.toString() });
    } catch (e) {
        console.error('push subscribe error', e);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/unsubscribe', auth, async (req, res) => {
    try {
        const { token } = req.body || {};
        if (!token) return res.status(400).json({ message: 'Missing token' });
        await PushToken.deleteOne({ token: String(token), user_id: req.user.email });
        res.json({ success: true });
    } catch (e) {
        console.error('push unsubscribe error', e);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/status', auth, async (req, res) => {
    try {
        const tokens = await PushToken.find({ user_id: req.user.email }).sort('-updatedAt').lean();
        res.json({
            user_id: req.user.email,
            count: (tokens || []).length,
            tokens: (tokens || []).map((t) => ({
                id: String(t._id || ''),
                token: String(t.token || '').slice(0, 12) + '…',
                platform: t.platform || null,
                last_seen_at: t.last_seen_at || null,
                createdAt: t.createdAt || null,
                updatedAt: t.updatedAt || null,
            }))
        });
    } catch (e) {
        console.error('push status error', e);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/test', auth, async (req, res) => {
    try {
        const { title, body, url } = req.body || {};
        const result = await sendPushToUser(req.user.email, {
            title: title || 'Test Notification',
            body: body || 'This is a test web push from SpeakUp.',
            url: url || '/Dashboard',
            icon: '/logo.png',
            badge: '/logo.png',
            requireInteraction: true,
            actions: [
                { action: 'open_admin', title: 'Open Admin' },
                { action: 'dismiss', title: 'Dismiss' },
            ],
            actionUrls: { open_admin: url || '/Dashboard' },
            data: {
                type: 'test',
                ts: String(Date.now()),
            }
        });
        res.json({ success: true, result });
    } catch (e) {
        console.error('push test error', e);
        res.status(500).json({ message: 'Failed to send test push', error: e?.message || String(e) });
    }
});

module.exports = router;
