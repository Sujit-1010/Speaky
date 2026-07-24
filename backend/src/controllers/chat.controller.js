const ChatMessage = require('../models/ChatMessage');

// ---------------------------------------------------------------------------
// PATCH /api/chat-messages/:id/read
//
// Only the intended recipient (to_user_id) may mark a message as read.
// ---------------------------------------------------------------------------
async function markRead(req, res) {
    try {
        const msg = await ChatMessage.findById(req.params.id);
        if (!msg) return res.status(404).json({ message: 'Not found' });

        if (String(msg.to_user_id) !== String(req.user.email)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        msg.is_read = true;
        await msg.save();
        res.json({ success: true });
    } catch (e) {
        console.error('markRead error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// ---------------------------------------------------------------------------
// DELETE /api/chat-messages/:id/party-delete
//
// Either the sender (from_user_id) or the recipient (to_user_id) may delete
// a message they are party to. This covers:
//   - A user deleting their own sent message
//   - A user clearing their side of a conversation (clearConversation)
// ---------------------------------------------------------------------------
async function deleteMessage(req, res) {
    try {
        const msg = await ChatMessage.findById(req.params.id);
        if (!msg) return res.status(404).json({ message: 'Not found' });

        const caller = String(req.user.email);
        if (String(msg.from_user_id) !== caller && String(msg.to_user_id) !== caller) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        await ChatMessage.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) {
        console.error('deleteMessage error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = {
    markRead,
    deleteMessage,
};
