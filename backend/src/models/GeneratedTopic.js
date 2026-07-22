const mongoose = require('mongoose');

const GeneratedTopicSchema = new mongoose.Schema({
    text: { type: String, required: true },
}, { timestamps: true });

// Index on createdAt so fetching the latest batch is fast
GeneratedTopicSchema.index({ createdAt: -1 });

module.exports = mongoose.model('GeneratedTopic', GeneratedTopicSchema);
