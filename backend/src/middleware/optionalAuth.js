const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Optional auth middleware.
 *
 * If a valid JWT is present (in cookie or Authorization header) it populates
 * req.user and calls next(). If there is no token, or the token is invalid,
 * req.user is left undefined and the request continues — the route handler
 * is responsible for deciding whether req.user is required.
 *
 * Use this on routes that accept BOTH:
 *   (a) authenticated JWT callers  (host logged in via browser)
 *   (b) access-token-only callers  (magic-link organiser, no account session)
 */
module.exports = (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = (req.cookies && req.cookies.token) || (header.startsWith('Bearer ') ? header.slice(7) : null);
    if (token) {
        try {
            const payload = jwt.verify(token, config.jwtSecret);
            req.user = { id: payload.id, email: payload.email };
        } catch {
            // Invalid token — treat as unauthenticated; route handler decides.
        }
    }
    next();
};
