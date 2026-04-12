const jwt = require('jsonwebtoken');
const config = require('../config');
module.exports = (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = (req.cookies && req.cookies.token) || (header.startsWith('Bearer ') ? header.slice(7) : null);
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const payload = jwt.verify(token, config.jwtSecret);
        req.user = { id: payload.id, email: payload.email };
        next();
    } catch (e) {
        res.status(401).json({ message: 'Unauthorized' });
    }
};
