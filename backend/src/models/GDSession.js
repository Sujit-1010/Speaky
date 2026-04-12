const mongoose = require('mongoose');
const GDSessionSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    topic: { type: String },
    
}, { timestamps: true });
module.exports = mongoose.model('GDSession', GDSessionSchema);
