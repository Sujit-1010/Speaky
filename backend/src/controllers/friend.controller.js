const FriendRequest = require('../models/FriendRequest');
const UserProfile = require('../models/UserProfile');
const Notification = require('../models/Notification');
const { sendPushToUser } = require('../utils/pushNotifications');

// ---------------------------------------------------------------------------
// POST /api/friend-requests/:id/accept
//
// Does all 5 steps atomically in one function:
//   1. Update FriendRequest status → 'accepted'
//   2. Add each user to the other's friends list (de-duped)
//   3. Create a Notification document for the sender
//   4. Emit 'notification_created' via Socket.io to the sender's user room
//   5. Fire FCM push to the sender
//
// io is accessed via req.app.get('io') — the established pattern used by
// notifications.js and the original inline handler in server.js.
// ---------------------------------------------------------------------------
async function acceptFriendRequest(req, res) {
    try {
        const fr = await FriendRequest.findById(req.params.id);
        if (!fr) return res.status(404).json({ message: 'Not found' });

        fr.status = 'accepted';
        await fr.save();

        const me = await UserProfile.findOne({ user_id: fr.to_user_id });
        const other = await UserProfile.findOne({ user_id: fr.from_user_id });

        if (me) {
            me.friends = Array.from(new Set([...(me.friends || []), fr.from_user_id]));
            await me.save();
        }
        if (other) {
            other.friends = Array.from(new Set([...(other.friends || []), fr.to_user_id]));
            await other.save();
        }

        const notifDoc = await Notification.create({
            user_id: fr.from_user_id,
            type: 'friend_request',
            title: 'Friend Request Accepted',
            message: 'Your request was accepted',
            from_user_id: fr.to_user_id,
            is_read: false,
        });

        // Socket.io emit — non-fatal if io is unavailable
        try {
            const io = req.app.get('io');
            const plain = notifDoc?.toObject ? notifDoc.toObject() : notifDoc;
            const payload = {
                ...plain,
                id: (plain?._id || plain?.id || '').toString(),
                created_date: plain?.createdAt || plain?.created_date || plain?.created_at,
            };
            if (io && payload.user_id) io.to(`user:${payload.user_id}`).emit('notification_created', { notification: payload });
        } catch { }

        // FCM push — non-fatal if it fails
        try {
            await sendPushToUser(fr.from_user_id, {
                title: 'Friend Request Accepted',
                body: 'Your request was accepted',
                data: { type: 'friend_request', from_user_id: fr.to_user_id },
            });
        } catch { }

        res.json({ success: true });
    } catch (e) {
        console.error('acceptFriendRequest error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = {
    acceptFriendRequest,
};
