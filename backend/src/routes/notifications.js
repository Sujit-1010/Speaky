const express = require('express');
const Notification = require('../models/Notification');
const { sendPushToUser } = require('../utils/pushNotifications');
const auth = require('../middleware/auth');

const { toPlain, crudError } = require('./crud');

const router = express.Router();

// ---------------------------------------------------------------------------
// M6 FIX: All notification routes now require authentication (auth middleware).
// Ownership is enforced per verb:
//   GET /       — filter forced to caller's user_id (cannot read others')
//   GET /:id    — must own the notification
//   POST /      — user_id is forced from JWT (body value ignored)
//   PATCH /:id  — must own the notification
//   DELETE /:id — must own the notification
// ---------------------------------------------------------------------------

// GET / — list notifications for the authenticated user only.
// Any user_id value in the query string is ignored; we always force it to
// the caller's JWT identity so a user can never read another user's notifications.
router.get('/', auth, async (req, res) => {
    try {
        const filter = { ...req.query };
        Object.keys(filter).forEach((k) => { if (filter[k] === 'true') filter[k] = true; if (filter[k] === 'false') filter[k] = false; });
        // Ownership: override whatever user_id was in the query string.
        filter.user_id = req.user.email;
        const items = await Notification.find(filter).sort(req.query.sort || '-createdAt');
        res.json(items.map(toPlain));
    } catch (e) {
        crudError(res, req, e);
    }
});

// GET /:id — fetch a single notification; reject if not owned by caller.
router.get('/:id', auth, async (req, res) => {
    try {
        const item = await Notification.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Not found' });
        if (String(item.user_id) !== String(req.user.email)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        res.json(toPlain(item));
    } catch (e) {
        crudError(res, req, e);
    }
});

// POST / — create a notification.
// user_id is forced from the JWT so callers cannot create notifications for
// other users by supplying a different user_id in the body.
router.post('/', auth, async (req, res) => {
    try {
        const body = { ...(req.body || {}), user_id: req.user.email };
        const created = await Notification.create(body);
        const plain = toPlain(created);

        // Realtime socket emit (in-app)
        try {
            const io = req.app.get('io');
            const userId = plain?.user_id;
            if (io && userId) {
                io.to(`user:${userId}`).emit('notification_created', { notification: plain });
            }
        } catch (err) {
            console.error('[notifications] Socket notification emit error:', err?.message || err);
        }

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
        } catch (err) {
            console.error('[notifications] FCM push notification error:', err?.message || err);
        }

        res.status(201).json(plain);
    } catch (e) {
        crudError(res, req, e);
    }
});

// PATCH /:id — update (e.g., mark as read); must own the notification.
router.patch('/:id', auth, async (req, res) => {
    try {
        const item = await Notification.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Not found' });
        if (String(item.user_id) !== String(req.user.email)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const updated = await Notification.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
        res.json(toPlain(updated));
    } catch (e) {
        crudError(res, req, e);
    }
});

// DELETE /:id — delete; must own the notification.
router.delete('/:id', auth, async (req, res) => {
    try {
        const item = await Notification.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Not found' });
        if (String(item.user_id) !== String(req.user.email)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        await Notification.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) {
        crudError(res, req, e);
    }
});

module.exports = router;
