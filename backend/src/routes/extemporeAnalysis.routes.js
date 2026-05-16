const express = require('express');
const router = express.Router();
const { startExtemporeAnalysis } = require('../controllers/extemporeAnalysis.controller');

router.post('/start', startExtemporeAnalysis);

module.exports = router;
