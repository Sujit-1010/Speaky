const express = require('express');
const roomController = require('../controllers/room.controller');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

const gdRoomRouter = express.Router();
gdRoomRouter.post('/:id/participant', auth, roomController.joinGDRoomAsParticipant);
gdRoomRouter.delete('/:id/participant', auth, roomController.leaveGDRoomAsParticipant);
gdRoomRouter.post('/:id/start', optionalAuth, roomController.startGDRoom);
gdRoomRouter.post('/:id/stop', optionalAuth, roomController.stopGDRoom);
gdRoomRouter.post('/:id/restart', optionalAuth, roomController.restartGDRoom);
gdRoomRouter.post('/:id/force-close', optionalAuth, roomController.forceCloseGDRoom);

const aiInterviewRouter = express.Router();
aiInterviewRouter.post('/:id/join', auth, roomController.joinAIInterview);

module.exports = {
    gdRoomRouter,
    aiInterviewRouter,
};
