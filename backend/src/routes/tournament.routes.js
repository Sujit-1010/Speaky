const express = require('express');
const tournamentController = require('../controllers/tournament.controller');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

const router = express.Router();

router.post('/:id/register', auth, tournamentController.registerForTournament);
router.patch('/:id/registrations/:regId', auth, tournamentController.patchRegistration);
router.post('/:id/start', optionalAuth, tournamentController.startTournament);
router.post('/:id/restart', optionalAuth, tournamentController.restartTournament);
router.post('/:id/organiser-link', auth, tournamentController.createOrganiserLink);
router.get('/:id/validate-access', tournamentController.validateAccess);
router.get('/:id/validate-organiser', auth, tournamentController.validateOrganiserSession);
router.post('/:id/invite-judge', optionalAuth, tournamentController.inviteJudge);
router.post('/:id/send-time-slot', optionalAuth, tournamentController.sendTimeSlot);

module.exports = router;
