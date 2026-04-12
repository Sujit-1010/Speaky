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

module.exports = mongoose.model('SoloPracticeSession', SoloPracticeSessionSchema);
