const mongoose = require('mongoose');
const GDSessionSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    topic: { type: String },
    
}, { timestamps: true });
// user_id index: GDSession is always queried filtered by user_id (e.g., user history).
GDSessionSchema.index({ user_id: 1 });
module.exports = mongoose.model('GDSession', GDSessionSchema);
