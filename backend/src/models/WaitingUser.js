const mongoose = require('mongoose');

// Represents a user waiting to be auto-matched into a Global GD room.
// Stored in MongoDB so that the waiting queue is shared across all backend instances.
const WaitingUserSchema = new mongoose.Schema(
  {
    // Unique identifier for the user (email or internal ID from the app).
    userId: { type: String, required: true, index: true },

    // Display name used in the lobby / room participant list.
    name: { type: String },

    // Time when the user entered the global GD waiting queue. Auto-expires in 120s.
    joinedAt: { type: Date, default: Date.now, expires: 120 },
    
    // Used for atomic pessimistic locking during matching
    batchId: { type: String, default: null, index: true },
    
    // Timestamp for when the lock was acquired (to prevent zombie locks)
    lockedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Compound index for optimal match pulling: active users without a lock, sorted by oldest
WaitingUserSchema.index({ batchId: 1, joinedAt: 1 });

module.exports = mongoose.model('WaitingUser', WaitingUserSchema);
