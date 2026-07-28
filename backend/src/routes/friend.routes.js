const express = require('express');
const friendController = require('../controllers/friend.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/:id/accept', auth, friendController.acceptFriendRequest);
router.post('/:id/reject', auth, friendController.rejectFriendRequest);

module.exports = router;
