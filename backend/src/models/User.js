const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    full_name: { type: String, required: true, trim: true },
    avatar: { type: String },
    auth_provider: { type: String, enum: ['password', 'google'], default: 'password' },
    firebase_uid: { type: String },
    xp_points: { type: Number, default: 0 },
    level: { type: Number, default: 1 }
}, { timestamps: true });
module.exports = mongoose.model('User', UserSchema);
