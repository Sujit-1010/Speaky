const express = require('express');
const globalGdService = require('../services/globalGd.service');

const router = express.Router();

router.post('/join', async (req, res) => {
  const { userId, name } = req.body || {};
  if (!userId || !name) {
    return res.status(400).json({ message: 'Missing userId or name' });
  }

  try {
    const result = await globalGdService.joinQueue(req, { userId, name });
    return res.json(result);
  } catch (e) {
    console.error('Error in /api/global-gd/join', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/status', async (req, res) => {
  const { userId } = req.query || {};
  if (!userId) {
    return res.status(400).json({ message: 'Missing userId' });
  }

  try {
    const result = await globalGdService.getStatus({ userId });
    return res.json(result);
  } catch (e) {
    console.error('Error in /api/global-gd/status', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/leave', async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ message: 'Missing userId' });
  }

  try {
    const result = await globalGdService.leaveQueue({ userId });
    return res.json(result);
  } catch (e) {
    console.error('Error in /api/global-gd/leave', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/leave-room', async (req, res) => {
  const { userId, roomId } = req.body || {};
  if (!userId || !roomId) {
    return res.status(400).json({ message: 'Missing userId or roomId' });
  }

  try {
    const result = await globalGdService.leaveRoom({ userId, roomId });
    return res.json(result);
  } catch (e) {
    console.error('Error in /api/global-gd/leave-room', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
