const express = require('express')
const router = express.Router()
const { startInterviewAnalysis, getInterviewAnalysis, getInterviewHistory } = require('../controllers/interviewAnalysis.controller')

router.post('/start', startInterviewAnalysis)
router.get('/history/:userId', getInterviewHistory)
router.get('/:sessionId', getInterviewAnalysis)

module.exports = router
