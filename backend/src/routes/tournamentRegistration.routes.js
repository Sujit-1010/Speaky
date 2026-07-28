const express = require('express');
const tournamentController = require('../controllers/tournament.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/:id/join', auth, tournamentController.joinTournamentRegistration);

module.exports = router;
