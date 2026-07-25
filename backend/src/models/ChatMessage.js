const mongoose = require('mongoose');
const ChatMessageSchema = new mongoose.Schema({
  from_user_id: { type: String, required: true },
  from_user_name: { type: String },
  to_user_id: { type: String, required: true },
  message: { type: String, required: true },
  is_read: { type: Boolean, default: false },
}, { timestamps: true });
// Bidirectional conversation lookup: both directions of (sender → recipient) queries.
ChatMessageSchema.index({ from_user_id: 1, to_user_id: 1 });
ChatMessageSchema.index({ to_user_id: 1, from_user_id: 1 });
// Unread-message queries (Chat.jsx loadMessages and markRead controller).
ChatMessageSchema.index({ to_user_id: 1, is_read: 1 });
module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
