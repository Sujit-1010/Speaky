const mongoose = require('mongoose');
const ParticipantSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    name: { type: String },
    joined_at: { type: Date }
}, { _id: false });
const GDRoomSchema = new mongoose.Schema({
    room_code: { type: String, required: true, unique: true },
    host_id: { type: String, required: true },
    mode: { type: String, default: 'custom' },
    tournament_id: { type: String },
    group_number: { type: Number },
    team_size: { type: Number, default: 4 },
    domain: { type: String, default: 'general' },
    duration: { type: Number, default: 15 },
    topic: { type: String },
    participants: { type: [ParticipantSchema], default: [] },
    // Users who explicitly left the room (used by global GD to avoid reusing old rooms)
    leftUsers: { type: [String], default: [] },
    status: { type: String, enum: ['lobby', 'active', 'completed'], default: 'lobby' },
    started_at: { type: Date },
    locked: { type: Boolean, default: false },
    scheduled_time: { type: Date }
}, { timestamps: true });
module.exports = mongoose.model('GDRoom', GDRoomSchema);
