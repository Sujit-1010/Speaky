const mongoose = require('mongoose');
const ParticipantSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  name: { type: String },
  joined_at: { type: Date }
}, { _id: false });

const AIInterviewSchema = new mongoose.Schema({
  room_code: { type: String, required: true, unique: true },
  host_id: { type: String, required: true },
  host_name: { type: String },
  interview_type: { type: String, default: 'hr' },
  company: { type: String },
  role: { type: String },
  duration: { type: Number, default: 30 },
  status: { type: String, enum: ['lobby', 'active', 'completed'], default: 'lobby' },
  participants: { type: [ParticipantSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('AIInterview', AIInterviewSchema);
