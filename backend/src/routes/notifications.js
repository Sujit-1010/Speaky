const express = require('express');
const Notification = require('../models/Notification');
const { sendPushToUser } = require('../utils/pushNotifications');

const { toPlain, crudError } = require('./crud');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const filter = { ...req.query };
        Object.keys(filter).forEach((k) => { if (filter[k] === 'true') filter[k] = true; if (filter[k] === 'false') filter[k] = false; });
        const items = await Notification.find(filter).sort(req.query.sort || '-createdAt');
        res.json(items.map(toPlain));
    } catch (e) {
        crudError(res, req, e);
    }
});

router.get('/:id', async (req, res) => {
    try {
        const item = await Notification.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Not found' });
        res.json(toPlain(item));
    } catch (e) {
        crudError(res, req, e);
    }
});

router.post('/', async (req, res) => {
    try {
        const created = await Notification.create(req.body || {});
        const plain = toPlain(created);

        // Realtime socket emit (in-app)
        try {
            const io = req.app.get('io');
            const userId = plain?.user_id;
            if (io && userId) {
                io.to(`user:${userId}`).emit('notification_created', { notification: plain });
            }
        } catch { }

        // Web push via FCM (device-level)
        try {
            const userId = plain?.user_id;
            if (userId) {
                const defaultUrl = '/Dashboard';
                await sendPushToUser(userId, {
                    title: plain.title || 'SpeakUp',
                    body: plain.message || '',
                    url: defaultUrl,
                    icon: '/logo.png',
                    badge: '/logo.png',
                    requireInteraction: true,
                    actions: [
                        { action: 'open_admin', title: 'Open Admin' },
                        { action: 'dismiss', title: 'Dismiss' },
                    ],
                    actionUrls: {
                        open_admin: defaultUrl,
                    },
                    data: {
                        notificationId: plain.id,
                        type: plain.type || '',
                        room_id: plain.room_id || '',
                        from_user_id: plain.from_user_id || '',
                    }
                });
            }
        } catch { }

        res.status(201).json(plain);
    } catch (e) {
        crudError(res, req, e);
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const updated = await Notification.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
        if (!updated) return res.status(404).json({ message: 'Not found' });
        res.json(toPlain(updated));
    } catch (e) {
        crudError(res, req, e);
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Notification.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Not found' });
        res.json({ success: true });
    } catch (e) {
        crudError(res, req, e);
    }
});

module.exports = router;
