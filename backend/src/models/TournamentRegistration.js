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
// Compound index covering the most common dedup/lookup pattern (tournament + user).
TournamentRegistrationSchema.index({ tournament_id: 1, user_id: 1 });
// Standalone tournament_id index: used by countDocuments({tournament_id}) in registerForTournament
// and by the Organiser panel's bulk registration fetch (filter by tournament_id alone).
TournamentRegistrationSchema.index({ tournament_id: 1 });
// group_number index: used when the organiser loads registrations filtered by group.
TournamentRegistrationSchema.index({ group_number: 1 });
module.exports = mongoose.model('TournamentRegistration', TournamentRegistrationSchema);
     