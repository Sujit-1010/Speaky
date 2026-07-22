const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const config = require('./config');
const connectDB = require('./db');
const createCrudRouter = require('./routes/crud');
const { sendTournamentRegistrationEmail, sendJudgeInviteEmail, sendTimeSlotEmail } = require('./utils/mailer');
const cron = require('node-cron');
const { refreshTopics } = require('./services/topicGenerator.service');

const User = require('./models/User');
const UserProfile = require('./models/UserProfile');
const FriendRequest = require('./models/FriendRequest');

const Tournament = require('./models/Tournament');
const TournamentRegistration = require('./models/TournamentRegistration');
const TournamentAccessToken = require('./models/TournamentAccessToken');
const GDRoom = require('./models/GDRoom');
const GDSession = require('./models/GDSession');
const ExtemporeSession = require('./models/ExtemporeSession');
const AIInterview = require('./models/AIInterview');
const ChatMessage = require('./models/ChatMessage');
const ExtemporeTopic = require('./models/ExtemporeTopic');
const ExtemporeMessage = require('./models/ExtemporeMessage');
const SoloPracticeSession = require('./models/SoloPracticeSession');
const AIInterviewSession = require('./models/AIInterviewSession');
const AIInterviewAnalysis = require('./models/AIInterviewAnalysis');

const authRoutes = require('./routes/auth');
const tokenRoutes = require('./routes/token');
const pushRoutes = require('./routes/push');
const notificationsRoutes = require('./routes/notifications');
const globalGdRoutes = require('./routes/globalGd');
const analysisRoutes = require('./routes/analysis.routes');
const interviewAnalysisRoutes = require('./routes/interviewAnalysis.routes');
const extemporeAnalysisRoutes = require('./routes/extemporeAnalysis.routes');
const tournamentPanelRoutes = require('./routes/tournamentPanel.routes');
const tournamentController = require('./controllers/tournament.controller');
const roomController = require('./controllers/room.controller');
const friendController = require('./controllers/friend.controller');
const auth = require('./middleware/auth');

const app = express();

const corsOptions = {
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        // Allow exact matches or wildcard hosts like *.vercel.app when configured
        const allowed = (config.corsOrigins || []);
        const isAllowed = () => {
            if (allowed.includes(origin)) return true;
            try {
                const o = new URL(origin);
                const host = o.hostname;
                return allowed.some((pat) => {
                    if (!pat) return false;
                    if (pat === origin) return true;
                    // Support host wildcard patterns like *.vercel.app
                    if (pat.startsWith('*.')) {
                        const suffix = pat.slice(1); // remove leading '*'
                        return host.endsWith(suffix);
                    }
                    try {
                        // If a full origin was configured (with protocol), compare origins
                        const p = new URL(pat);
                        return p.origin === origin;
                    } catch {
                        return false;
                    }
                });
            } catch {
                return false;
            }
        };
        return isAllowed() ? cb(null, true) : cb(null, false);
    },
    credentials: true
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    skip: (req) => {
        try {
            const url = String(req.originalUrl || req.url || '');
            return url.startsWith('/api/gd-rooms') ||
                   url.startsWith('/api/auth/me');
        } catch {
            return false;
        }
    }
}));

// Stricter limiter for routes that trigger paid AI/STT/storage calls.
// 10 requests per user per 15 minutes. Keyed by userId from request body/query
// (body is already parsed by express.json above), falling back to IP.
const aiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => {
        // req.user is set by auth middleware which runs before this limiter.
        // Fall back to IP only if user is somehow absent (should not happen).
        return String(req.user?.id || req.ip || 'unknown');
    },
    message: { message: 'Too many AI analysis requests. Please wait 15 minutes before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/global-gd', globalGdRoutes);
app.use('/api/analysis', auth, aiRateLimit, analysisRoutes);

app.use('/api/users', createCrudRouter(User));
app.use('/api/user-profiles', createCrudRouter(UserProfile));
app.use('/api/friend-requests', createCrudRouter(FriendRequest));
app.use('/api/notifications', notificationsRoutes);
// Panel-data route MUST be mounted before the generic CRUD router for /api/tournaments
// so that /api/tournaments/:id/panel-data is matched here before /:id swallows it.
app.use('/api/tournaments', tournamentPanelRoutes);
app.use('/api/tournaments', createCrudRouter(Tournament));
app.use('/api/tournament-registrations', createCrudRouter(TournamentRegistration));
app.use('/api/gd-rooms', createCrudRouter(GDRoom));
app.use('/api/gd-sessions', createCrudRouter(GDSession));
app.use('/api/extempore-sessions', createCrudRouter(ExtemporeSession));
app.use('/api/ai-interviews', createCrudRouter(AIInterview));
app.use('/api/chat-messages', createCrudRouter(ChatMessage));
app.use('/api/extempore-topics', createCrudRouter(ExtemporeTopic));
app.use('/api/extempore-messages', createCrudRouter(ExtemporeMessage));
app.use('/api/solo-practice-sessions', createCrudRouter(SoloPracticeSession));
app.use('/api/zego', tokenRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/ai-interview-sessions', createCrudRouter(AIInterviewSession));
app.use('/api/interview-analysis', auth, aiRateLimit, interviewAnalysisRoutes);
app.use('/api/extempore-analysis', auth, aiRateLimit, extemporeAnalysisRoutes);

app.post('/api/friend-requests/:id/accept', friendController.acceptFriendRequest);

app.post('/api/gd-rooms/:id/join', auth, async (req, res) => {
    const { user_name } = req.body || {};
    const user_id = (req.user && (req.user.email || req.user.id)) ? (req.user.email || req.user.id) : null;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });
    const room = await GDRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Not found' });
    if (room.status === 'completed') return res.status(400).json({ message: 'Room has ended' });
    if (room.locked) return res.status(403).json({ message: 'Room is locked' });
    const now = new Date();
    const participants = (room.participants || []);
    const idx = participants.findIndex(p => p.user_id === user_id);
    if (idx === -1) {
        const teamSize = Number(room.team_size || 0) || 4;
        if (participants.length >= teamSize) {
            return res.status(409).json({ message: 'Room is full' });
        }
        room.participants.push({ user_id, name: user_name, joined_at: now });
    } else {
        // Ensure joined_at is set when user re-joins
        if (!room.participants[idx].joined_at) room.participants[idx].joined_at = now;
        if (!room.participants[idx].name && user_name) room.participants[idx].name = user_name;
    }
    await room.save();
    res.json(room);
});

app.post('/api/tournaments/:id/register', tournamentController.registerForTournament);


app.post('/api/tournaments/:id/start', tournamentController.startTournament);

app.post('/api/tournaments/:id/restart', tournamentController.restartTournament);

app.post('/api/tournament-registrations/:id/join', tournamentController.joinTournamentRegistration);

// Create an organiser magic link (host-only via auth)
app.post('/api/tournaments/:id/organiser-link', auth, tournamentController.createOrganiserLink);

// Validate an access token for a tournament
app.get('/api/tournaments/:id/validate-access', tournamentController.validateAccess);

// Validate organiser via authenticated session (host account)
app.get('/api/tournaments/:id/validate-organiser', auth, tournamentController.validateOrganiserSession);

// Invite a judge (host via host_email or organiser via token)
app.post('/api/tournaments/:id/invite-judge', tournamentController.inviteJudge);

// Send custom time slot emails
app.post('/api/tournaments/:id/send-time-slot', tournamentController.sendTimeSlot);

// Lobby controls for GD rooms
app.post('/api/gd-rooms/:id/start', roomController.startGDRoom);
app.post('/api/gd-rooms/:id/stop', roomController.stopGDRoom);
app.post('/api/gd-rooms/:id/restart', roomController.restartGDRoom);
app.post('/api/gd-rooms/:id/force-close', roomController.forceCloseGDRoom);



app.use((err, req, res, next) => {
    res.status(500).json({ message: 'Server error' });
});

const http = require('http');
const { Server } = require('socket.io');
const { buildRedisAdapter } = require('./redisAdapter');

const start = async () => {
    await connectDB(config.mongoUri);

    const server = http.createServer(app);
    const io = new Server(server, {
        cors: {
            origin: config.corsOrigins,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Attach Redis adapter for cross-instance Socket.io event sync.
    // Must complete before refreshTopics() so the distributed lock can use
    // the shared Redis client (getRedisClient()) on boot.
    const redisAdapter = await buildRedisAdapter();
    if (redisAdapter) io.adapter(redisAdapter);

    // Initial fetch of topics (runs through the distributed lock, same as cron)
    refreshTopics();

    // Schedule to fetch topics every 12 hours
    cron.schedule('0 */12 * * *', () => {
        refreshTopics();
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('join_room', (room) => {
            socket.join(room);
            console.log(`User ${socket.id} joined room ${room}`);
        });

        socket.on('register_user', (userId) => {
            if (!userId) return;
            const roomName = `user:${userId}`;
            socket.join(roomName);
            console.log(`User ${socket.id} registered room ${roomName}`);
        });

        socket.on('friend_request_notification', (payload) => {
            if (!payload || !payload.to_user_id) return;
            const roomName = `user:${payload.to_user_id}`;
            io.to(roomName).emit('friend_request_notification', payload);
        });

        socket.on('room_invite_notification', (payload) => {
            if (!payload || !payload.to_user_id) return;
            const roomName = `user:${payload.to_user_id}`;
            io.to(roomName).emit('room_invite_notification', payload);
        });

        socket.on('send_message', async (data, ack) => {
            try {
                const room = data && data.room;
                const from_user_id = data && data.from_user_id;
                const to_user_id = data && data.to_user_id;
                const message = data && data.message;
                const from_user_name = data && data.from_user_name;
                if (!room || !from_user_id || !to_user_id || !message) {
                    if (typeof ack === 'function') ack({ ok: false, error: 'missing_fields' });
                    return;
                }

                // If client already persisted the message and provided id, accept it.
                // Otherwise, persist here so sockets are the source of truth.
                let doc = null;
                if (data.id || data._id) {
                    doc = data;
                } else {
                    const created = await ChatMessage.create({
                        from_user_id: String(from_user_id),
                        from_user_name: from_user_name || null,
                        to_user_id: String(to_user_id),
                        message: String(message),
                        is_read: false,
                    });
                    const plain = created.toObject ? created.toObject() : created;
                    doc = { ...plain, id: (plain._id || plain.id || '').toString() };
                    delete doc._id;
                    delete doc.__v;
                }

                const payload = { ...doc, room };

                // Send to sender instantly
                socket.emit('receive_message', payload);
                // Send to everyone else in the room
                socket.to(room).emit('receive_message', payload);

                // For global UI unread badges
                if (to_user_id) {
                    const userRoom = `user:${to_user_id}`;
                    io.to(userRoom).emit('chat_message_notification', payload);
                }

                if (typeof ack === 'function') ack({ ok: true, message: payload });
            } catch (e) {
                console.error('send_message error', e);
                if (typeof ack === 'function') ack({ ok: false, error: 'server_error' });
            }
        });

        socket.on('message_read', (payload = {}) => {
            const { message_id, from_user_id, to_user_id } = payload;
            if (!message_id || !from_user_id || !to_user_id) return;
            const fromRoom = `user:${from_user_id}`;
            const toRoom = `user:${to_user_id}`;
            io.to(fromRoom).emit('message_read', payload);
            io.to(toRoom).emit('message_read', payload);
        });
    });

    // Make io accessible in routes if needed
    app.set('io', io);

    server.listen(config.port, () => {
        console.log(`Server listening on http://localhost:${config.port}`);
    });
};

start();
