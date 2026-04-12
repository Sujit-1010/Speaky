const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
    sessionId: { type: String, required: true },
    userId: { type: String, required: true },
    topic: { type: String },
    duration: { type: Number },
    scores: {
        overall: { type: Number, default: 0 },
        participation: { type: Number, default: 0 },
        communication: { type: Number, default: 0 },
        knowledge: { type: Number, default: 0 },
        grammar: { type: Number, default: 0 },
        teamwork: { type: Number, default: 0 },
        confidence: { type: Number, default: 0 },
    },
    metrics: {
        speakingTime: { type: Number, default: 0 },
        totalWords: { type: Number, default: 0 },
        wpm: { type: Number, default: 0 },
        fillerCount: { type: Number, default: 0 },
        turnCount: { type: Number, default: 0 },
        sentimentScore: { type: Number, default: 0 },
    },
    feedback: {
        strengths: [String],
        improvements: [String],
        tips: [String],
        grammarErrors: [mongoose.Schema.Types.Mixed],
        grammarCorrections: [String],
    },
    transcript: { type: String },
    audioUrl: { type: String },
    participantCount: { type: Number, default: 0 },
    errorReason: { type: String, default: null },
    geminiUsed: { type: Boolean, default: true },
    participationApprox: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    createdAt: { type: Date, default: Date.now }
});

AnalysisSchema.index({ sessionId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Analysis', AnalysisSchema);
