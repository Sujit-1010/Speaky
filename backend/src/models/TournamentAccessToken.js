const mongoose = require('mongoose');
const TournamentAccessTokenSchema = new mongoose.Schema({
    tournament_id: { type: String, required: true },
    role: { type: String, enum: ['organiser', 'judge'], required: true },
    email: { type: String },
    name: { type: String },
    token: { type: String, unique: true, required: true },
    can_publish: { type: Boolean, default: true },
    expires_at: { type: Date },
    revoked: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('TournamentAccessToken', TournamentAccessTokenSchema);
