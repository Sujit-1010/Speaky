const Tournament = require('../models/Tournament');
const GDRoom = require('../models/GDRoom');
const AIInterview = require('../models/AIInterview');
const {
    getAccessTokenFromReq,
    validateAccessTokenForTournament,
} = require('./tournament.controller');

// ---------------------------------------------------------------------------
// Private helper — checks whether the request comes from a valid organiser
// magic-link token OR from the tournament's own host (via host_email in body).
// Used by all GD room lobby-control endpoints.
// ---------------------------------------------------------------------------
async function hasOrganiserOrHostAccess(req, tournamentId) {
    const tokenDoc = await validateAccessTokenForTournament(getAccessTokenFromReq(req), tournamentId);
    if (tokenDoc && tokenDoc.role === 'organiser') return true;
    const { host_email } = req.body || {};
    if (host_email) {
        const t = await Tournament.findById(tournamentId);
        if (t && t.host_id === host_email) return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
// GD room lobby controls
// POST /api/gd-rooms/:id/start
// ---------------------------------------------------------------------------
async function startGDRoom(req, res) {
    try {
        const room = await GDRoom.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Not found' });
        if (!(await hasOrganiserOrHostAccess(req, room.tournament_id))) return res.status(403).json({ message: 'Forbidden' });
        room.status = 'active';
        room.started_at = new Date();
        await room.save();
        res.json(room);
    } catch (e) {
        console.error('startGDRoom error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// POST /api/gd-rooms/:id/stop
async function stopGDRoom(req, res) {
    try {
        const room = await GDRoom.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Not found' });
        if (!(await hasOrganiserOrHostAccess(req, room.tournament_id))) return res.status(403).json({ message: 'Forbidden' });
        room.status = 'completed';
        await room.save();
        res.json(room);
    } catch (e) {
        console.error('stopGDRoom error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// POST /api/gd-rooms/:id/restart
async function restartGDRoom(req, res) {
    try {
        const room = await GDRoom.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Not found' });
        if (!(await hasOrganiserOrHostAccess(req, room.tournament_id))) return res.status(403).json({ message: 'Forbidden' });
        room.status = 'lobby';
        room.started_at = null;
        await room.save();
        res.json(room);
    } catch (e) {
        console.error('restartGDRoom error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// POST /api/gd-rooms/:id/force-close
async function forceCloseGDRoom(req, res) {
    try {
        const room = await GDRoom.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Not found' });
        if (!(await hasOrganiserOrHostAccess(req, room.tournament_id))) return res.status(403).json({ message: 'Forbidden' });
        room.status = 'completed';
        room.locked = true;
        await room.save();
        res.json(room);
    } catch (e) {
        console.error('forceCloseGDRoom error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// ---------------------------------------------------------------------------
// POST /api/gd-rooms/:id/participant
//
// Participant self-join — authenticated user adds themselves to the room.
//
// ATOMICITY: uses findOneAndUpdate so that the capacity check (participants
// array size < team_size) and the $push happen in a SINGLE MongoDB operation.
// Two simultaneous requests cannot both pass the check before either write
// lands — whichever arrives second finds the room full (or the user already
// present) and gets a 409 / re-join response, not a double-add.
//
// Two separate atomic queries handle the two cases:
//   (A) New joiner   — filter requires user NOT in participants AND size < cap
//   (B) Re-join      — filter requires user already IN participants (updates fields only)
// If neither query modifies a document the room is either full, ended, or locked.
// ---------------------------------------------------------------------------
async function joinGDRoomAsParticipant(req, res) {
    try {
        const user_id = req.user.email;
        const user_name = (req.body || {}).user_name || null;
        const now = new Date();

        // ── Case A: new joiner ────────────────────────────────────────────────
        // Atomic: capacity check ($expr $lt) + duplicate check (user_id not in
        // participants) + status/locked guards — ALL in the filter, not in JS.
        // $push only executes if the filter matches; MongoDB guarantees this is
        // indivisible from the perspective of concurrent writers.
        const roomA = await GDRoom.findOneAndUpdate(
            {
                _id: req.params.id,
                status: { $ne: 'completed' },
                locked: { $ne: true },
                'participants.user_id': { $ne: user_id },   // not already in
                $expr: {
                    $lt: [
                        { $size: { $ifNull: ['$participants', []] } },
                        { $ifNull: ['$team_size', 4] }       // capacity guard
                    ]
                }
            },
            {
                $push: {
                    participants: { user_id, name: user_name, joined_at: now }
                }
            },
            { new: true }
        );

        if (roomA) return res.json(roomA);

        // ── Case B: idempotent re-join ────────────────────────────────────────
        // User is already in participants — just update joined_at / name.
        // No capacity slot consumed, no race risk.
        const roomB = await GDRoom.findOneAndUpdate(
            {
                _id: req.params.id,
                'participants.user_id': user_id              // must already be in
            },
            {
                $set: {
                    'participants.$.joined_at': now,
                    ...(user_name ? { 'participants.$.name': user_name } : {})
                }
            },
            { new: true }
        );

        if (roomB) return res.json(roomB);

        // ── Neither query matched ─────────────────────────────────────────────
        // Determine the specific reason so we can return the right status code.
        const room = await GDRoom.findById(req.params.id).lean();
        if (!room) return res.status(404).json({ message: 'Not found' });
        if (room.status === 'completed') return res.status(400).json({ message: 'Room has ended' });
        if (room.locked) return res.status(403).json({ message: 'Room is locked' });
        // Capacity was exceeded (the only remaining reason case A could fail)
        return res.status(409).json({ message: 'Room is full' });

    } catch (e) {
        console.error('joinGDRoomAsParticipant error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// ---------------------------------------------------------------------------
// DELETE /api/gd-rooms/:id/participant
//
// Participant self-removal — removes ONLY the authenticated user from
// the participants array. Cannot remove others.
// ---------------------------------------------------------------------------
async function leaveGDRoomAsParticipant(req, res) {
    try {
        const user_id = req.user.email;
        const room = await GDRoom.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Not found' });

        room.participants = (room.participants || []).filter(p => p.user_id !== user_id);
        await room.save();
        res.json({ success: true });
    } catch (e) {
        console.error('leaveGDRoomAsParticipant error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// ---------------------------------------------------------------------------
// POST /api/ai-interviews/:id/join
//
// Non-host participant join for AI Interview rooms.
// Adds the authenticated user to the participants array.
// Idempotent: if already present, returns the room without error.
// ---------------------------------------------------------------------------
async function joinAIInterview(req, res) {
    try {
        const user_id = req.user.email;
        const user_name = (req.body || {}).user_name || null;
        const room = await AIInterview.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Not found' });
        if (room.status === 'completed') return res.status(400).json({ message: 'Room has ended' });

        const participants = room.participants || [];
        const idx = participants.findIndex(p => p.user_id === user_id);

        if (idx === -1) {
            room.participants.push({ user_id, name: user_name, joined_at: new Date() });
        } else {
            if (!room.participants[idx].joined_at) room.participants[idx].joined_at = new Date();
            if (!room.participants[idx].name && user_name) room.participants[idx].name = user_name;
        }

        await room.save();
        res.json(room);
    } catch (e) {
        console.error('joinAIInterview error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = {
    startGDRoom,
    stopGDRoom,
    restartGDRoom,
    forceCloseGDRoom,
    joinGDRoomAsParticipant,
    leaveGDRoomAsParticipant,
    joinAIInterview,
};
