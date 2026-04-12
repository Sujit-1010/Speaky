const mongoose = require('mongoose');
const TournamentRegistrationSchema = new mongoose.Schema({
    tournament_id: { type: String, required: true },
    tournament_code: { type: String },
    user_id: { type: String, required: true },
    user_name: { type: String },
    user_email: { type: String },
    password: { type: String },
    status: { type: String, enum: ['registered', 'joined'], default: 'registered' },
    group_number: { type: Number },
    registration_code: { type: String },
    accepted_rules: { type: Boolean, default: false },
    accepted_at: { type: Date }
}, { timestamps: true });
module.exports = mongoose.model('TournamentRegistration', TournamentRegistrationSchema);
     