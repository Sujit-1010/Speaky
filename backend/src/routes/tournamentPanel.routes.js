const express = require('express');
const rateLimit = require('express-rate-limit');
const Tournament = require('../models/Tournament');
const TournamentRegistration = require('../models/TournamentRegistration');
const GDRoom = require('../models/GDRoom');
const TournamentAccessToken = require('../models/TournamentAccessToken');

const router = express.Router();

// Primary IP-based limiter: caps total requests per IP regardless of token value.
// Stops a scanner spraying random tokens from burning unlimited Mongo reads.
// 30 req/min gives legitimate JudgePanel polling (12/min) comfortable headroom.
const ipRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: (req) => String(req.ip || 'unknown'),
    message: { message: 'Too many requests from this IP. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Secondary per-token limiter: caps requests per specific token string.
// JudgePanel polls every 5 s → 12 req/min at most, so 20 gives headroom.
const panelRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    keyGenerator: (req) => String(req.query.token || req.headers['x-access-token'] || req.ip || 'unknown'),
    message: { message: 'Too many panel requests for this token. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

function isExpired(date) {
    if (!date) return false;
    try { return new Date(date).getTime() < Date.now(); } catch { return true; }
}

function getTokenFromReq(req) {
    // Accepts ?token= query param (magic-link URL) or x-access-token header.
    const header = req.headers['x-access-token'] || '';
    return (header || req.query.token || '').toString().trim();
}

/**
 * GET /api/tournaments/:id/panel-data?token=<accessToken>
 *
 * Single endpoint for Organiser and JudgePanel pages.
 * Validates the magic-link access token, then returns:
 *   - tournament:     safe subset of Tournament fields (no password, no judges list)
 *   - registrations:  safe subset of TournamentRegistration fields (no password)
 *   - rooms:          GDRoom fields needed for room management
 *   - tokenRole:      'organiser' | 'judge' (so the page knows what controls to show)
 *
 * Requires no JWT — the access token IS the credential for these pages.
 */
router.get('/:id/panel-data', ipRateLimit, panelRateLimit, async (req, res) => {
    try {
        const tokenStr = getTokenFromReq(req);
        if (!tokenStr) {
            return res.status(401).json({ message: 'Missing access token' });
        }

        // Validate token against this specific tournament.
        const tokenDoc = await TournamentAccessToken.findOne({
            token: tokenStr,
            tournament_id: req.params.id,
            revoked: { $ne: true },
        }).lean();

        if (!tokenDoc) {
            return res.status(401).json({ message: 'Invalid or expired access token' });
        }
        if (isExpired(tokenDoc.expires_at)) {
            return res.status(401).json({ message: 'Access token has expired' });
        }

        // Run the three DB queries in parallel.
        const [tournament, registrations, rooms] = await Promise.all([
            Tournament.findById(req.params.id).lean(),
            TournamentRegistration.find({ tournament_id: req.params.id }).lean(),
            GDRoom.find({ tournament_id: req.params.id }).lean(),
        ]);

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        // --- Field whitelisting ---
        // Tournament: strip password and judges list (private).
        // host_id is included for organisers (needed to create room lobbies) but hidden from judges.
        const safeTournament = {
            id:               tournament._id.toString(),
            tournament_id:    tournament.tournament_id,
            name:             tournament.name,
            type:             tournament.type,
            host_name:        tournament.host_name,
            organizer:        tournament.organizer,
            description:      tournament.description,
            visibility:       tournament.visibility,
            status:           tournament.status,
            group_size:       tournament.group_size,
            max_participants: tournament.max_participants,
            domain:           tournament.domain,
            duration:         tournament.duration,
            start_date:       tournament.start_date,
            prize:            tournament.prize,
            rules:            tournament.rules,
            createdAt:        tournament.createdAt,
            ...(tokenDoc.role === 'organiser' ? { host_id: tournament.host_id } : {}),
        };

        // TournamentRegistration: omit password, registration_code (used for entry only).
        const safeRegistrations = (registrations || []).map((r) => ({
            id:             r._id.toString(),
            tournament_id:  r.tournament_id,
            user_id:        r.user_id,
            user_name:      r.user_name,
            user_email:     r.user_email,
            status:         r.status,
            group_number:   r.group_number,
            accepted_rules: r.accepted_rules,
            accepted_at:    r.accepted_at,
            createdAt:      r.createdAt,
        }));

        // GDRoom: include all fields needed by Organiser room controls; omit host_id.
        const safeRooms = (rooms || []).map((r) => ({
            id:            r._id.toString(),
            room_code:     r.room_code,
            tournament_id: r.tournament_id,
            group_number:  r.group_number,
            team_size:     r.team_size,
            domain:        r.domain,
            duration:      r.duration,
            topic:         r.topic,
            status:        r.status,
            participants:  (r.participants || []).map((p) => ({
                user_id:   p.user_id,
                name:      p.name,
                joined_at: p.joined_at,
            })),
            started_at:     r.started_at,
            scheduled_time: r.scheduled_time,
            createdAt:      r.createdAt,
        }));

        res.json({
            tokenRole:     tokenDoc.role,      // 'organiser' | 'judge'
            tokenEmail:    tokenDoc.email,
            tokenName:     tokenDoc.name,
            tournament:    safeTournament,
            registrations: safeRegistrations,
            rooms:         safeRooms,
        });
    } catch (e) {
        console.error('panel-data error', e);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
