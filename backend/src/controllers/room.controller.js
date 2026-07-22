const Tournament = require('../models/Tournament');
const GDRoom = require('../models/GDRoom');
const DebateRoom = require('../models/DebateRoom');
const {
    getAccessTokenFromReq,
    validateAccessTokenForTournament,
} = require('./tournament.controller');

// ---------------------------------------------------------------------------
// Private helper — checks whether the request comes from a valid organiser
// magic-link token OR from the tournament's own host (via host_email in body).
// Used by all GD and Debate room lobby-control endpoints.
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
// Debate room lobby controls
// POST /api/debate-rooms/:id/start
// ---------------------------------------------------------------------------
async function startDebateRoom(req, res) {
    try {
        const room = await DebateRoom.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Not found' });
        if (!(await hasOrganiserOrHostAccess(req, room.tournament_id))) return res.status(403).json({ message: 'Forbidden' });
        room.status = 'active';
        await room.save();
        res.json(room);
    } catch (e) {
        console.error('startDebateRoom error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// POST /api/debate-rooms/:id/stop
async function stopDebateRoom(req, res) {
    try {
        const room = await DebateRoom.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Not found' });
        if (!(await hasOrganiserOrHostAccess(req, room.tournament_id))) return res.status(403).json({ message: 'Forbidden' });
        room.status = 'completed';
        await room.save();
        res.json(room);
    } catch (e) {
        console.error('stopDebateRoom error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// POST /api/debate-rooms/:id/restart
async function restartDebateRoom(req, res) {
    try {
        const room = await DebateRoom.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Not found' });
        if (!(await hasOrganiserOrHostAccess(req, room.tournament_id))) return res.status(403).json({ message: 'Forbidden' });
        room.status = 'pending';
        await room.save();
        res.json(room);
    } catch (e) {
        console.error('restartDebateRoom error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// POST /api/debate-rooms/:id/force-close
async function forceCloseDebateRoom(req, res) {
    try {
        const room = await DebateRoom.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Not found' });
        if (!(await hasOrganiserOrHostAccess(req, room.tournament_id))) return res.status(403).json({ message: 'Forbidden' });
        room.status = 'completed';
        await room.save();
        res.json(room);
    } catch (e) {
        console.error('forceCloseDebateRoom error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// ---------------------------------------------------------------------------
// NOTE: GD and Debate handlers share an identical structure (same auth check,
// same status transitions). Consolidation into a shared generic function is
// possible but deferred — flagged for a separate decision/pass.
// ---------------------------------------------------------------------------

module.exports = {
    startGDRoom,
    stopGDRoom,
    restartGDRoom,
    forceCloseGDRoom,
    startDebateRoom,
    stopDebateRoom,
    restartDebateRoom,
    forceCloseDebateRoom,
};
