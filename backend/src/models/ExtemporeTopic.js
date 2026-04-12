const mongoose = require('mongoose');
const ExtemporeTopicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  difficulty: { type: String, enum: ['easy','medium','hard'], default: 'medium' },
  category: { type: String, default: 'General' },
  tags: { type: [String], default: [] }
}, { timestamps: true });
module.exports = mongoose.model('ExtemporeTopic', ExtemporeTopicSchema);
