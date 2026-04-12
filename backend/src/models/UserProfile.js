const mongoose = require('mongoose');
const UserProfileSchema = new mongoose.Schema({
    user_id: { type: String, required: true, unique: true },
    bio: { type: String },
    avatar: { type: String },
    friends: { type: [String], default: [] },
    streak: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: null },
    longestStreak: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    totalXP: { type: Number, default: 0 }
}, { timestamps: true });
module.exports = mongoose.model('UserProfile', UserProfileSchema);
