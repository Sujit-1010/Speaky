const mongoose = require('mongoose');

const PushTokenSchema = new mongoose.Schema({
    user_id: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String },
    user_agent: { type: String },
    last_seen_at: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('PushToken', PushTokenSchema);
