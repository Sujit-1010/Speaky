const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const { makeLazyRedisStore } = require('../utils/redisStore');
const authController = require('../controllers/auth.controller');

const router = express.Router();

const resendRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    store: makeLazyRedisStore('email-resend'),
    keyGenerator: (req) => String(req.body?.email || req.ip || 'unknown'),
    message: { message: 'Too many verification requests. Please wait 15 minutes before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', resendRateLimit, authController.resendVerification);
router.post('/firebase', authController.firebaseLogin);
router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.getMe);

module.exports = router;
