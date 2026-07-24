const crypto = require('crypto');
const config = require('../config');
const Tournament = require('../models/Tournament');
const TournamentRegistration = require('../models/TournamentRegistration');
const TournamentAccessToken = require('../models/TournamentAccessToken');
const { sendTournamentRegistrationEmail, sendJudgeInviteEmail, sendTimeSlotEmail } = require('../utils/mailer');

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function generateTournamentPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
}

function getDefaultFrontendBase() {
    const first = (config.corsOrigins || [])[0];
    if (first && /^https?:\/\//i.test(first)) return first;
    return 'http://localhost:5173';
}

function getAccessTokenFromReq(req) {
    const header = req.headers['x-access-token'] || '';
    const bearer = (req.headers['authorization'] || '').startsWith('Bearer ')
        ? req.headers['authorization'].slice(7)
        : '';
    return (header || bearer || req.query.accessToken || (req.body && req.body.accessToken) || '').toString();
}

function isExpired(date) {
    if (!date) return false;
    try { return new Date(date).getTime() < Date.now(); } catch { return true; }
}

async function validateAccessTokenForTournament(tokenStr, tournamentId) {
    if (!tokenStr) return null;
    const doc = await TournamentAccessToken.findOne({ token: tokenStr, tournament_id: tournamentId, revoked: { $ne: true } });
    if (!doc) return null;
    if (isExpired(doc.expires_at)) return null;
    return doc;
}

function makeRandomToken() {
    return crypto.randomBytes(24).toString('hex');
}

// ---------------------------------------------------------------------------
// POST /api/tournaments/:id/register
// ---------------------------------------------------------------------------
async function registerForTournament(req, res) {
    try {
        const { user_id, user_name, user_email, group_number, accepted_rules } = req.body || {};
        if (!user_id || !user_email) return res.status(400).json({ message: 'Missing user details' });
        if (!accepted_rules) return res.status(400).json({ message: 'You must accept the tournament rules to register' });

        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

        // Prevent the host/organiser from registering as a participant
        if (String(user_id) === String(tournament.host_id)) {
            return res.status(400).json({ message: 'Host cannot register as a participant' });
        }

        if (tournament.status !== 'registering') {
            return res.status(400).json({ message: 'Registration is not open for this tournament' });
        }

        const tournamentIdStr = tournament._id.toString();

        const existing = await TournamentRegistration.findOne({ tournament_id: tournamentIdStr, user_id });
        if (existing) {
            return res.status(409).json({ message: 'User already registered for this tournament', registration: existing });
        }

        if (tournament.max_participants) {
            const count = await TournamentRegistration.countDocuments({ tournament_id: tournamentIdStr });
            if (count >= tournament.max_participants) {
                return res.status(400).json({ message: 'Tournament is full' });
            }
        }

        let password = (tournament.password || '').trim();
        if (!password) {
            password = generateTournamentPassword();
            tournament.password = password.toUpperCase();
            await tournament.save();
        }
        const normalizedPassword = password.toUpperCase();

        const registration = await TournamentRegistration.create({
            tournament_id: tournamentIdStr,
            tournament_code: tournament.tournament_id,
            user_id,
            user_name,
            user_email,
            password: normalizedPassword,
            status: 'registered',
            group_number,
            accepted_rules: true,
            accepted_at: new Date(),
        });

        const registrationId = registration._id.toString();

        await sendTournamentRegistrationEmail({
            to: user_email,
            userName: user_name || user_id,
            tournament,
            password: normalizedPassword,
            registrationId,
        });

        const plain = registration.toObject ? registration.toObject() : registration;
        res.status(201).json({ ...plain, id: registrationId });
    } catch (e) {
        console.error('Tournament registration error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// ---------------------------------------------------------------------------
// POST /api/tournaments/:id/start
// ---------------------------------------------------------------------------
async function startTournament(req, res) {
    try {
        const t = await Tournament.findById(req.params.id);
        if (!t) return res.status(404).json({ message: 'Not found' });
        t.status = 'active';
        await t.save();
        res.json(t);
    } catch (e) {
        console.error('Tournament start error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// ---------------------------------------------------------------------------
// POST /api/tournaments/:id/restart
// ---------------------------------------------------------------------------
async function restartTournament(req, res) {
    try {
        const t = await Tournament.findById(req.params.id);
        if (!t) return res.status(404).json({ message: 'Not found' });
        // Reset to registering so participants can (re)join and organiser can re-prepare rooms
        t.status = 'registering';
        await t.save();
        res.json(t);
    } catch (e) {
        console.error('Tournament restart error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// ---------------------------------------------------------------------------
// POST /api/tournament-registrations/:id/join
// ---------------------------------------------------------------------------
async function joinTournamentRegistration(req, res) {
    try {
        const reg = await TournamentRegistration.findById(req.params.id);
        if (!reg) return res.status(404).json({ message: 'Not found' });
        reg.status = 'joined';
        await reg.save();
        res.json(reg);
    } catch (e) {
        console.error('Tournament registration join error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// ---------------------------------------------------------------------------
// POST /api/tournaments/:id/organiser-link
// ---------------------------------------------------------------------------
async function createOrganiserLink(req, res) {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
        if (!req.user || tournament.host_id !== req.user.email) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const { organiser_email, organiser_name, expires_in_hours = 72 } = req.body || {};
        const token = makeRandomToken();
        const expiresAt = new Date(Date.now() + Number(expires_in_hours) * 3600 * 1000);
        const created = await TournamentAccessToken.create({
            tournament_id: tournament._id.toString(),
            role: 'organiser',
            email: organiser_email || null,
            name: organiser_name || null,
            token,
            can_publish: false,
            expires_at: expiresAt,
        });
        const base = getDefaultFrontendBase();
        const url = `${base}/Organiser?tournamentId=${tournament._id.toString()}&token=${token}`;
        res.status(201).json({ token: created.token, url, expires_at: expiresAt.toISOString() });
    } catch (e) {
        console.error('organiser-link error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// ---------------------------------------------------------------------------
// GET /api/tournaments/:id/validate-access
// ---------------------------------------------------------------------------
async function validateAccess(req, res) {
    try {
        const tokenStr = getAccessTokenFromReq(req);
        const doc = await validateAccessTokenForTournament(tokenStr, req.params.id);
        if (!doc) return res.status(401).json({ valid: false });
        res.json({ valid: true, role: doc.role, email: doc.email, name: doc.name, can_publish: !!doc.can_publish });
    } catch (e) {
        res.status(500).json({ message: 'Server error' });
    }
}

// ---------------------------------------------------------------------------
// GET /api/tournaments/:id/validate-organiser
// ---------------------------------------------------------------------------
async function validateOrganiserSession(req, res) {
    try {
        const t = await Tournament.findById(req.params.id);
        if (!t) return res.status(404).json({ message: 'Tournament not found' });
        if (!req.user || String(req.user.email) !== String(t.host_id)) {
            return res.status(403).json({ valid: false });
        }
        return res.json({ valid: true, role: 'organiser', email: req.user.email, name: req.user.full_name || req.user.name || null, can_publish: false });
    } catch (e) {
        return res.status(500).json({ message: 'Server error' });
    }
}

// ---------------------------------------------------------------------------
// POST /api/tournaments/:id/invite-judge
// ---------------------------------------------------------------------------
async function inviteJudge(req, res) {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

        let allowed = false;
        const tokenDoc = await validateAccessTokenForTournament(getAccessTokenFromReq(req), req.params.id);
        if (tokenDoc && tokenDoc.role === 'organiser') allowed = true;
        const { host_email } = req.body || {};
        if (!allowed && host_email && host_email === tournament.host_id) allowed = true;
        if (!allowed) return res.status(403).json({ message: 'Forbidden' });

        const { email, name, expires_in_hours = 72, frontendUrl } = req.body || {};
        if (!email) return res.status(400).json({ message: 'Missing judge email' });
        const token = makeRandomToken();
        const expiresAt = new Date(Date.now() + Number(expires_in_hours) * 3600 * 1000);
        const created = await TournamentAccessToken.create({
            tournament_id: tournament._id.toString(),
            role: 'judge',
            email,
            name: name || null,
            token,
            can_publish: false,
            expires_at: expiresAt,
        });

        // Track judges on tournament doc
        const exists = (tournament.judges || []).some(j => j.email === email);
        if (!exists) {
            tournament.judges = [...(tournament.judges || []), { email, name: name || null, status: 'invited', invited_at: new Date() }];
            await tournament.save();
        }

        const base = (frontendUrl && /^https?:\/\//i.test(frontendUrl)) ? frontendUrl : getDefaultFrontendBase();
        const inviteUrl = `${base}/JudgePanel?tournamentId=${tournament._id.toString()}&token=${token}`;
        try {
            await sendJudgeInviteEmail({ to: email, judgeName: name, tournament, inviteUrl });
        } catch (e) {
            console.warn('sendJudgeInviteEmail failed', e && e.message ? e.message : e);
        }
        res.status(201).json({ token: created.token, inviteUrl, expires_at: expiresAt.toISOString() });
    } catch (e) {
        console.error('invite-judge error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// ---------------------------------------------------------------------------
// POST /api/tournaments/:id/send-time-slot
// ---------------------------------------------------------------------------
async function sendTimeSlot(req, res) {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

        let allowed = false;
        const tokenDoc = await validateAccessTokenForTournament(getAccessTokenFromReq(req), req.params.id);
        if (tokenDoc && tokenDoc.role === 'organiser') allowed = true;
        const { host_email } = req.body || {};
        if (!allowed && host_email && host_email === tournament.host_id) allowed = true;
        if (!allowed) return res.status(403).json({ message: 'Forbidden' });

        const { registration_id, user_email, group_number, room_code, time_slot } = req.body || {};
        if (!time_slot) return res.status(400).json({ message: 'Missing time_slot' });

        const sendOne = async (reg) => {
            try {
                await sendTimeSlotEmail({
                    to: reg.user_email || reg.user_id,
                    userName: reg.user_name || reg.user_id,
                    tournament,
                    groupNumber: reg.group_number,
                    roomCode: room_code,
                    timeSlot: time_slot,
                });
            } catch (e) {
                console.warn('sendTimeSlotEmail failed for', reg.user_id, e && e.message ? e.message : e);
            }
        };

        if (registration_id) {
            const reg = await TournamentRegistration.findById(registration_id);
            if (!reg) return res.status(404).json({ message: 'Registration not found' });
            await sendOne(reg);
            return res.json({ success: true, sent: 1 });
        }

        if (user_email) {
            const regs = await TournamentRegistration.find({ tournament_id: tournament._id.toString(), user_id: user_email });
            await Promise.all(regs.map(sendOne));
            return res.json({ success: true, sent: regs.length });
        }

        if (group_number != null) {
            const regs = await TournamentRegistration.find({ tournament_id: tournament._id.toString(), group_number: Number(group_number) });
            await Promise.all(regs.map(sendOne));
            return res.json({ success: true, sent: regs.length });
        }

        return res.status(400).json({ message: 'Provide registration_id or user_email or group_number' });
    } catch (e) {
        console.error('send-time-slot error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

// ---------------------------------------------------------------------------
// PATCH /api/tournaments/:id/registrations/:regId
//
// Host-only: verifies the caller is the tournament host before patching
// any field on a participant's registration (group_number, status, etc.).
// ---------------------------------------------------------------------------
async function patchRegistration(req, res) {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
        if (!req.user || String(tournament.host_id) !== String(req.user.email)) {
            return res.status(403).json({ message: 'Forbidden — host only' });
        }
        const reg = await TournamentRegistration.findById(req.params.regId);
        if (!reg) return res.status(404).json({ message: 'Registration not found' });
        const patch = req.body || {};
        Object.assign(reg, patch);
        await reg.save();
        const plain = reg.toObject ? reg.toObject() : reg;
        res.json({ ...plain, id: reg._id.toString() });
    } catch (e) {
        console.error('patchRegistration error', e);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = {
    // Route handlers
    registerForTournament,
    startTournament,
    restartTournament,
    joinTournamentRegistration,
    createOrganiserLink,
    validateAccess,
    validateOrganiserSession,
    inviteJudge,
    sendTimeSlot,
    patchRegistration,
    // Shared helpers — used by room.controller.js for access-token validation
    getAccessTokenFromReq,
    validateAccessTokenForTournament,
};

