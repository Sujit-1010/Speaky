const ExtemporeSession = require('../models/ExtemporeSession');
const config = require('../config');
const { analyzeExtempore } = require('../services/groq.service');
const { awardXP } = require('../services/xp.service');

async function startExtemporeAnalysis(req, res) {
  try {
    const { sessionId, userId, transcript, topic, duration } = req.body;

    console.log('=== Extempore analysis started ===', { userId, topic, transcriptLength: transcript?.length });

    if (!sessionId) return res.status(400).json({ message: 'Missing sessionId' });

    // Acknowledge immediately so the frontend can start polling
    res.status(201).json({ sessionId, message: 'Analysis started' });

    // Run the heavy pipeline in the background
    runExtemporePipeline(sessionId, req.app, userId, transcript, topic, duration);

  } catch (err) {
    console.error('Start extempore analysis error:', err);
    const msg = (config.nodeEnv !== 'production' && err?.message) ? err.message : 'Server error';
    res.status(500).json({ message: msg });
  }
}

async function runExtemporePipeline(sessionId, app, userId, transcript, topic, duration) {
  try {
    console.log('=== Running extempore pipeline ===');

    // Guard: no transcript
    if (!transcript || transcript.trim().length < 10) {
      await ExtemporeSession.findByIdAndUpdate(sessionId, {
        status: 'completed',
        transcript: transcript || '',
        fluency_score: 0, clarity_score: 0, pacing_score: 0,
        knowledge_score: 0, grammar_score: 0, confidence_score: 0,
        vocabulary_score: 0, content_score: 0,
        filler_words_count: 0, filler_words: [],
        strengths: [],
        improvements: ['No speech was detected. Please ensure your microphone is working.'],
        tips: ['Make sure your microphone permissions are enabled in the browser.'],
        ai_feedback: 'No speech was detected during this session.',
      });

      const io = app.get('io');
      if (io && userId) io.to(`user:${userId}`).emit('extempore_analysis_ready', { sessionId });
      return;
    }

    // Call Groq LLM
    console.log('=== Calling Groq for extempore analysis ===');
    const result = await analyzeExtempore(transcript, topic, duration);

    if (result) {
      const scores = result.scores || {};

      // Calculate overall score 0-100 for XP system
      const scoreValues = Object.values(scores).filter(v => typeof v === 'number');
      const avgScore10 = scoreValues.length > 0
        ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
        : 0;
      const overallScore100 = Math.round(avgScore10 * 10); // Convert /10 → /100

      await ExtemporeSession.findByIdAndUpdate(sessionId, {
        status: 'completed',
        transcript,
        fluency_score:    scores.fluency    || 0,
        clarity_score:    scores.clarity    || 0,
        pacing_score:     scores.pacing     || 0,
        knowledge_score:  scores.knowledge  || 0,
        grammar_score:    scores.grammar    || 0,
        confidence_score: scores.confidence || 0,
        vocabulary_score: scores.vocabulary || 0,
        content_score:    scores.content    || 0,
        filler_words_count: result.fillerWordsData?.count || 0,
        filler_words:       result.fillerWordsData?.wordsDetected || [],
        grammar_errors:   Array.isArray(result.grammarErrors) ? result.grammarErrors : [],
        strengths:    result.strengths    || [],
        improvements: result.improvements || [],
        tips:         result.tips         || [],
        ai_feedback:  result.ai_feedback  || '',
      });

      // Award XP using 0-100 scale matching xp.service.js thresholds
      // 0-29 = 2 XP, 30-59 = 5 XP, 60-89 = 8 XP, 90+ = 10 XP
      try {
        const xpResult = await awardXP(userId, overallScore100);
        console.log(`=== XP awarded: ${xpResult.xpEarned} (score: ${overallScore100}/100) leveledUp: ${xpResult.leveledUp} ===`);
      } catch (e) {
        console.error('XP award error:', e);
      }
    } else {
      // Groq returned null (key missing, parse error, etc.)
      await ExtemporeSession.findByIdAndUpdate(sessionId, {
        status: 'completed',
        transcript,
        ai_feedback: 'Analysis could not be completed. Please try again.',
      });
    }

    // Notify frontend via socket
    const io = app.get('io');
    if (io && userId) io.to(`user:${userId}`).emit('extempore_analysis_ready', { sessionId });

    console.log('=== Extempore analysis complete ===');
  } catch (err) {
    console.error('Extempore pipeline error:', err);
    try {
      await ExtemporeSession.findByIdAndUpdate(sessionId, { status: 'failed' });
    } catch { }
  }
}

module.exports = { startExtemporeAnalysis };
