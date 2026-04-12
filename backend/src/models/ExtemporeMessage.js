const mongoose = require('mongoose');

const ExtemporeMessageSchema = new mongoose.Schema({
    session_id: { type: String, required: true },
    user_id: { type: String, required: true },
    text: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ExtemporeMessage', ExtemporeMessageSchema);
