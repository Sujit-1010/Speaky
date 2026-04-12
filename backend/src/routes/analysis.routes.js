const express = require('express');
const path = require('path');
const multer = require('multer');
const { startAnalysis, uploadAudio, getAnalysis, getAnalysisHistory } = require('../controllers/analysis.controller');

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post('/upload-audio', upload.single('audio'), uploadAudio);
router.post('/start', startAnalysis);
router.get('/history/:userId', getAnalysisHistory);
router.get('/:sessionId', getAnalysis);

module.exports = router;
