const mongoose = require('mongoose');
const ExtemporeSessionSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    topic: { type: String },
    difficulty: { type: String, default: 'medium' },
    category: { type: String, default: 'General' },
    prep_time: { type: Number, default: 30 },
    speaking_duration: { type: Number, default: 0 },
    transcript: { type: String, default: '' },
    status: { type: String, default: 'processing', enum: ['processing', 'completed', 'failed'] },

    // Scores (0–10 scale)
    fluency_score:    { type: Number, default: 0 },
    clarity_score:    { type: Number, default: 0 },
    pacing_score:     { type: Number, default: 0 },
    knowledge_score:  { type: Number, default: 0 },
    grammar_score:    { type: Number, default: 0 },
    confidence_score: { type: Number, default: 0 },
    vocabulary_score: { type: Number, default: 0 },
    content_score:    { type: Number, default: 0 },

    // Filler words
    filler_words_count: { type: Number, default: 0 },
    filler_words: { type: [String], default: [] },

    // Qualitative feedback
    strengths:     { type: [String], default: [] },
    improvements:  { type: [String], default: [] },
    tips:          { type: [String], default: [] },
    ai_feedback:   { type: String, default: '' },
    grammar_errors: { type: Array, default: [] },
}, { timestamps: true });
module.exports = mongoose.model('ExtemporeSession', ExtemporeSessionSchema);

