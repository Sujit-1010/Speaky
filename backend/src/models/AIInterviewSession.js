const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    role: { type: String },
    content: { type: String },
}, { _id: false });

const AIInterviewSessionSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    interview_type: { type: String },
    company: { type: String },
    role: { type: String },
    messages: { type: [MessageSchema], default: [] },
}, { timestamps: true });

// user_id index: session list is always filtered by user_id.
AIInterviewSessionSchema.index({ user_id: 1 });

module.exports = mongoose.model('AIInterviewSession', AIInterviewSessionSchema);
