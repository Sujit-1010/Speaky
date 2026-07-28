const ChatMessage = require('../models/ChatMessage');

/**
 * Socket.io connection and event handler initialization.
 * Dedicated module extracted from server.js for cleaner code organization.
 *
 * @param {import('socket.io').Server} io - Socket.io Server instance
 */
function initSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('join_room', (room) => {
            socket.join(room);
            console.log(`User ${socket.id} joined room ${room}`);
        });

        socket.on('register_user', (userId) => {
            if (!userId) return;
            const roomName = `user:${userId}`;
            socket.join(roomName);
            console.log(`User ${socket.id} registered room ${roomName}`);
        });

        socket.on('friend_request_notification', (payload) => {
            if (!payload || !payload.to_user_id) return;
            const roomName = `user:${payload.to_user_id}`;
            io.to(roomName).emit('friend_request_notification', payload);
        });

        socket.on('room_invite_notification', (payload) => {
            if (!payload || !payload.to_user_id) return;
            const roomName = `user:${payload.to_user_id}`;
            io.to(roomName).emit('room_invite_notification', payload);
        });

        socket.on('send_message', async (data, ack) => {
            try {
                const room = data && data.room;
                const from_user_id = data && data.from_user_id;
                const to_user_id = data && data.to_user_id;
                const message = data && data.message;
                const from_user_name = data && data.from_user_name;
                if (!room || !from_user_id || !to_user_id || !message) {
                    if (typeof ack === 'function') ack({ ok: false, error: 'missing_fields' });
                    return;
                }

                // If client already persisted the message and provided id, accept it.
                // Otherwise, persist here so sockets are the source of truth.
                let doc = null;
                if (data.id || data._id) {
                    doc = data;
                } else {
                    const created = await ChatMessage.create({
                        from_user_id: String(from_user_id),
                        from_user_name: from_user_name || null,
                        to_user_id: String(to_user_id),
                        message: String(message),
                        is_read: false,
                    });
                    const plain = created.toObject ? created.toObject() : created;
                    doc = { ...plain, id: (plain._id || plain.id || '').toString() };
                    delete doc._id;
                    delete doc.__v;
                }

                const payload = { ...doc, room };

                // Send to sender instantly
                socket.emit('receive_message', payload);
                // Send to everyone else in the room
                socket.to(room).emit('receive_message', payload);

                // For global UI unread badges
                if (to_user_id) {
                    const userRoom = `user:${to_user_id}`;
                    io.to(userRoom).emit('chat_message_notification', payload);
                }

                if (typeof ack === 'function') ack({ ok: true, message: payload });
            } catch (e) {
                console.error('send_message error', e);
                if (typeof ack === 'function') ack({ ok: false, error: 'server_error' });
            }
        });

        socket.on('message_read', (payload = {}) => {
            const { message_id, from_user_id, to_user_id } = payload;
            if (!message_id || !from_user_id || !to_user_id) return;
            const fromRoom = `user:${from_user_id}`;
            const toRoom = `user:${to_user_id}`;
            io.to(fromRoom).emit('message_read', payload);
            io.to(toRoom).emit('message_read', payload);
        });
    });
}

module.exports = { initSocketHandlers };
