const mongoose = require('mongoose');
const NotificationSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    type: { type: String },
    title: { type: String },
    message: { type: String },
    from_user_id: { type: String },
    room_id: { type: String },
    is_read: { type: Boolean, default: false }
}, { timestamps: true });
NotificationSchema.index({ user_id: 1 });
module.exports = mongoose.model('Notification', NotificationSchema);
