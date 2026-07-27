const mongoose = require('mongoose');

const ExtemporeMessageSchema = new mongoose.Schema({
    session_id: { type: String, required: true },
    user_id: { type: String, required: true },
    text: { type: String, default: '' }
}, { timestamps: true });

// Compound index: messages are always fetched by session_id; user_id as
// secondary field covers per-user lookups within a session efficiently.
ExtemporeMessageSchema.index({ session_id: 1, user_id: 1 });

module.exports = mongoose.model('ExtemporeMessage', ExtemporeMessageSchema);
