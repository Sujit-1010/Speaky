const mongoose = require('mongoose');
const ExtemporeSessionSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    topic: { type: String },
    difficulty: { type: String, default: 'medium' },
    category: { type: String, default: 'General' },
    prep_time: { type: Number, default: 30 },
    speaking_duration: { type: Number, default: 0 },
    filler_words_count: { type: Number, default: 0 },
    filler_words: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    improvements: { type: [String], default: [] },
}, { timestamps: true });
module.exports = mongoose.model('ExtemporeSession', ExtemporeSessionSchema);
