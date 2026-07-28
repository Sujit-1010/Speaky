const express = require('express');
const chatController = require('../controllers/chat.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.patch('/:id/read', auth, chatController.markRead);
router.delete('/:id/party-delete', auth, chatController.deleteMessage);

module.exports = router;
