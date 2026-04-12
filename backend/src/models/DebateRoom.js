const mongoose = require('mongoose');
const ParticipantSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    user_name: { type: String },
    side: { type: String, enum: ['for', 'against', 'neutral'], default: 'neutral' }
}, { _id: false });
const DebateRoomSchema = new mongoose.Schema({
    room_code: { type: String, required: true, unique: true },
    host_id: { type: String, required: true },
    mode: { type: String, enum: ['tournament', 'practice'], default: 'practice' },
    tournament_id: { type: String },
    participants: { type: [ParticipantSchema], default: [] },
    status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' }
}, { timestamps: true });
module.exports = mongoose.model('DebateRoom', DebateRoomSchema);
