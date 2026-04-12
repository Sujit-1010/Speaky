const mongoose = require('mongoose');
const ChatMessageSchema = new mongoose.Schema({
  from_user_id: { type: String, required: true },
  from_user_name: { type: String },
  to_user_id: { type: String, required: true },
  message: { type: String, required: true },
  is_read: { type: Boolean, default: false },
}, { timestamps: true });
module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
