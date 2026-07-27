const mongoose = require('mongoose');

const SoloPracticeMessageSchema = new mongoose.Schema({
    role: { type: String },
    content: { type: String },
}, { _id: false });

const SoloPracticeSessionSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    topic: { type: String },
    messages: { type: [SoloPracticeMessageSchema], default: [] },
}, { timestamps: true });

// user_id index: session list is always filtered by user_id.
SoloPracticeSessionSchema.index({ user_id: 1 });

module.exports = mongoose.model('SoloPracticeSession', SoloPracticeSessionSchema);
