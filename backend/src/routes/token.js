const express = require('express');
const config = require('../config');
const { generateRoomToken } = require('../utils/zegoToken');

const router = express.Router();

router.post('/token', async (req, res) => {
    try {
        const { roomId, user_id, user_name, canPublish } = req.body || {};
        if (!roomId || !user_id) {
            return res.status(400).json({ message: 'Missing roomId or user_id' });
        }

        const appId = config.zegoAppId;
        const serverSecret = (config.zegoServerSecret || '').trim();
        if (!appId || !serverSecret) {
            return res.status(500).json({ message: 'Zego configuration missing on server' });
        }

        const { token, expireAt } = generateRoomToken({
            appId,
            serverSecret,
            userId: user_id,
            roomId,
            expiresInSeconds: config.zegoTokenExpirationSeconds || 60 * 60,
            canPublish: typeof canPublish === 'boolean' ? !!canPublish : true,
        });

        const serverURL = (config.zegoServerUrl || '').trim();

        return res.json({
            appID: appId,
            serverURL,
            token,
            userID: String(user_id),
            userName: user_name || String(user_id),
            roomID: String(roomId),
            expireAt,
        });
    } catch (e) {
        console.error('Error generating Zego token', e);
        return res.status(500).json({ message: 'Failed to generate token' });
    }
});

module.exports = router;
