const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  sessionId: String,
  userId: String,
  interviewType: String,
  company: String,
  role: String,
  duration: Number,
  status: { type: String, default: 'processing' },
  scores: {
    overall: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    technical: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
    relevance: { type: Number, default: 0 }
  },
  feedback: {
    strengths: [String],
    improvements: [String],
    tips: [String],
    questionFeedback: [mongoose.Schema.Types.Mixed],
    overallComment: String
  },
  transcript: String
}, { timestamps: true })
schema.index({ sessionId: 1 });
schema.index({ userId: 1 });
// Compound unique index: ensures at most one analysis record per (sessionId, userId).
// This makes the findOneAndUpdate upsert in the controller safe under concurrent
// double-submits — MongoDB rejects any second insert that would violate uniqueness.
schema.index({ sessionId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('AIInterviewAnalysis', schema)
