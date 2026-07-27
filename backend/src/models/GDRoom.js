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
// Compound index for the globalGd.js findRoomByUser query: mode + status are
// always filtered together. participants.user_id covers the $elemMatch lookup.
GDRoomSchema.index({ mode: 1, status: 1 });
GDRoomSchema.index({ 'participants.user_id': 1 });
GDRoomSchema.index({ status: 1 });
// tournament_id index: used by Organiser.jsx and room-creation logic to filter
// rooms belonging to a specific tournament (GDRoom.filter({tournament_id})).
GDRoomSchema.index({ tournament_id: 1 });
module.exports = mongoose.model('GDRoom', GDRoomSchema);
