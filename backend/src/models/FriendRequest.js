const mongoose = require('mongoose');
const FriendRequestSchema = new mongoose.Schema({
    from_user_id: { type: String, required: true },
    to_user_id: { type: String, required: true },
    from_user_name: { type: String },
    message: { type: String },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
}, { timestamps: true });
FriendRequestSchema.index({ to_user_id: 1, status: 1 });
FriendRequestSchema.index({ from_user_id: 1 });
module.exports = mongoose.model('FriendRequest', FriendRequestSchema);
