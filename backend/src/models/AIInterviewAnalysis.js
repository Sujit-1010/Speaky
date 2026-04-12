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

module.exports = mongoose.model('AIInterviewAnalysis', schema)
