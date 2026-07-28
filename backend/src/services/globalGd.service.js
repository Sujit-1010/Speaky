const mongoose = require('mongoose');
const GDRoom = require('../models/GDRoom');
const WaitingUser = require('../models/WaitingUser');
const { getRandomTopic } = require('./topicGenerator.service');

const GROUP_SIZE = 3;

// Find an active GLOBAL GDRoom from MongoDB that contains the given user
// and where the user has not explicitly left via /leave-room.
async function findRoomByUser(userId) {
  if (!userId) return null;

  return GDRoom.findOne({
    mode: 'global',
    status: 'active',
    participants: { $elemMatch: { user_id: userId } },
    $or: [
      { leftUsers: { $exists: false } },
      { leftUsers: { $nin: [userId] } },
    ],
  }).lean();
}

// Notify all matched users in real-time via Socket.io when a global room is created.
function notifyRoomCreated(req, room) {
  try {
    const io = req && req.app && req.app.get && req.app.get('io');
    if (!io || !room) return;

    const rawParticipants = room.participants || [];

    const participants = rawParticipants.map((p) => ({
      userId: p.user_id || p.userId,
      name: p.name,
    }));

    const payload = {
      status: 'matched',
      roomId: room._id ? room._id.toString() : room.roomId,
      topic: room.topic,
      participants,
      teamSize: participants.length || GROUP_SIZE,
      groupSize: GROUP_SIZE,
    };

    participants.forEach((p) => {
      if (!p || !p.userId) return;
      const userRoom = `user:${p.userId}`;
      io.to(userRoom).emit('global_gd_room_created', payload);
    });
  } catch (e) {
    console.error('Error notifying global GD room creation', e);
  }
}

async function joinQueue(req, { userId, name }) {
  const now = new Date();

  // 1) If user is already in an active global room, immediately return that match.
  const existingRoom = await findRoomByUser(userId);
  if (existingRoom) {
    const participants = (existingRoom.participants || []).map((p) => ({
      userId: p.user_id,
      name: p.name,
    }));

    return {
      status: 'matched',
      roomId: existingRoom._id.toString(),
      topic: existingRoom.topic,
      teamSize: participants.length || GROUP_SIZE,
      groupSize: GROUP_SIZE,
      participants,
    };
  }

  // 2) CLEANUP & ENQUEUE
  const activeCutoff = new Date(Date.now() - 120000);
  const lockCutoff = new Date(Date.now() - 10000); // 10s zombie lock timeout

  await WaitingUser.deleteMany({ joinedAt: { $lt: activeCutoff } });

  await WaitingUser.updateMany(
    { batchId: { $ne: null }, lockedAt: { $lt: lockCutoff } },
    { $set: { batchId: null, lockedAt: null } }
  );

  await WaitingUser.deleteMany({ userId });
  await WaitingUser.create({ userId, name, joinedAt: now });

  // 3) ATOMIC MATCHMAKING LOGIC
  const candidates = await WaitingUser.find({ batchId: null })
    .sort({ joinedAt: 1, _id: 1 })
    .limit(GROUP_SIZE)
    .lean();

  if (candidates.length === GROUP_SIZE) {
    const candidateIds = candidates.map(c => c._id);
    const currentBatchId = new mongoose.Types.ObjectId().toString();

    const lockResult = await WaitingUser.updateMany(
      { _id: { $in: candidateIds }, batchId: null },
      { $set: { batchId: currentBatchId, lockedAt: new Date() } }
    );

    if (lockResult.modifiedCount === GROUP_SIZE) {
      try {
        const matchedUserIds = candidates.map((u) => u.userId);
        const topic = await getRandomTopic();

        const participantsDocs = candidates.map((u) => ({
          user_id: u.userId,
          name: u.name || u.userId,
          joined_at: u.joinedAt,
        }));

        const roomDoc = await GDRoom.create({
          room_code: `gd_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          host_id: matchedUserIds[0],
          mode: 'global',
          team_size: GROUP_SIZE,
          topic,
          participants: participantsDocs,
          status: 'active',
          started_at: new Date(),
        });

        await WaitingUser.deleteMany({ batchId: currentBatchId });

        const roomId = roomDoc._id.toString();
        const participants = participantsDocs.map((p) => ({ userId: p.user_id, name: p.name }));

        notifyRoomCreated(req, roomDoc);

        return {
          status: 'matched',
          roomId,
          topic,
          teamSize: GROUP_SIZE,
          groupSize: GROUP_SIZE,
          participants,
        };
      } catch (matchError) {
        console.error('Room creation failed', matchError);
        await WaitingUser.updateMany({ batchId: currentBatchId }, { $set: { batchId: null, lockedAt: null } });
      }
    } else if (lockResult.modifiedCount > 0) {
      await WaitingUser.updateMany(
        { batchId: currentBatchId },
        { $set: { batchId: null, lockedAt: null } }
      );
    }
  }

  // 4) Return waiting status
  const waitingUsers = await WaitingUser.find({ batchId: null })
    .sort({ joinedAt: 1 })
    .select('userId')
    .lean();
    
  const positionIndex = waitingUsers.findIndex((u) => u.userId === userId);

  return {
    status: 'waiting',
    queueSize: waitingUsers.length,
    position: positionIndex === -1 ? null : positionIndex + 1,
    groupSize: GROUP_SIZE,
  };
}

async function getStatus({ userId }) {
  const room = await findRoomByUser(userId);
  if (room) {
    const participants = (room.participants || []).map((p) => ({
      userId: p.user_id,
      name: p.name,
    }));

    return {
      status: 'matched',
      roomId: room._id.toString(),
      topic: room.topic,
      teamSize: participants.length || GROUP_SIZE,
      groupSize: GROUP_SIZE,
      participants,
    };
  }

  const waiting = await WaitingUser.find({}).sort({ joinedAt: 1, _id: 1 }).lean();
  const queueSize = waiting.length;
  const positionIndex = waiting.findIndex((u) => u.userId === userId);

  if (positionIndex !== -1) {
    return {
      status: 'waiting',
      queueSize,
      position: positionIndex + 1,
      groupSize: GROUP_SIZE,
    };
  }

  return {
    status: 'waiting',
    queueSize,
    position: null,
    groupSize: GROUP_SIZE,
  };
}

async function leaveQueue({ userId }) {
  await WaitingUser.deleteMany({ userId });
  return { success: true };
}

async function leaveRoom({ userId, roomId }) {
  const afterAdd = await GDRoom.findOneAndUpdate(
    { _id: roomId, mode: 'global' },
    { $addToSet: { leftUsers: userId } },
    { new: true }
  );

  if (!afterAdd) {
    return { success: true };
  }

  const allLeft = Array.isArray(afterAdd.participants) &&
                  Array.isArray(afterAdd.leftUsers) &&
                  afterAdd.leftUsers.length >= afterAdd.participants.length;

  let finalStatus = afterAdd.status;
  if (allLeft && afterAdd.status !== 'completed') {
    await GDRoom.findByIdAndUpdate(roomId, { $set: { status: 'completed' } });
    finalStatus = 'completed';
  }

  return {
    success: true,
    status: finalStatus,
    leftUsers: afterAdd.leftUsers,
  };
}

module.exports = {
  findRoomByUser,
  notifyRoomCreated,
  joinQueue,
  getStatus,
  leaveQueue,
  leaveRoom,
};
