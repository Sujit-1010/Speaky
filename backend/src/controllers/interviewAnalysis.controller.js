const AIInterviewAnalysis = require('../models/AIInterviewAnalysis')
const { analyzeInterview } = require('../services/gemini.service')
const { awardXP } = require('../services/xp.service')

async function startInterviewAnalysis(req, res) {
  try {
    const {
      sessionId, userId, messages,
      interviewType, company, role,
      duration, selectedTopics, resumeText
    } = req.body

    console.log('=== Interview analysis started ===', {
      userId, interviewType, role,
      messageCount: messages?.length
    })

    const analysis = await AIInterviewAnalysis.create({
      sessionId,
      userId,
      interviewType,
      company,
      role,
      duration,
      status: 'processing'
    })

    res.status(201).json({
      analysisId: analysis._id,
      message: 'Analysis started'
    })

    // Run pipeline in background without awaiting
    runInterviewPipeline(
      analysis._id,
      req.app,
      userId, messages,
      interviewType, company, role,
      selectedTopics, resumeText
    )

  } catch (err) {
    console.error('Start interview analysis error:', err)
    res.status(500).json({ message: err.message })
  }
}

async function runInterviewPipeline(
  analysisId, app,
  userId, messages,
  interviewType, company, role,
  selectedTopics, resumeText
) {
  try {
    console.log('=== Running interview pipeline ===')

    const fullTranscript = (messages || [])
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n')

    const userAnswers = (messages || [])
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ')

    // If no meaningful content
    if (userAnswers.trim().length < 10) {
      await AIInterviewAnalysis.findByIdAndUpdate(analysisId, {
        status: 'completed',
        scores: {
          overall: 0, communication: 0,
          technical: 0, confidence: 0, relevance: 0
        },
        feedback: {
          strengths: [],
          improvements: ['No responses detected'],
          tips: [
            'Make sure microphone is working',
            'Speak clearly when answering'
          ],
          questionFeedback: [],
          overallComment: 'No speech detected in this session'
        },
        transcript: fullTranscript
      })

      const io = app.get('io')
      if (io) io.to(`user:${userId}`).emit('interview_analysis_ready', { analysisId })
      return
    }

    // Analyze with Groq
    console.log('=== Calling Groq for interview analysis ===')
    const groqResult = await analyzeInterview(
      fullTranscript, userAnswers,
      interviewType, role, company,
      selectedTopics, resumeText
    )

    const scores = groqResult ? {
      overall: groqResult.overallScore || 0,
      communication: groqResult.communicationScore || 0,
      technical: groqResult.technicalScore || 0,
      confidence: groqResult.confidenceScore || 0,
      relevance: groqResult.relevanceScore || 0
    } : {
      overall: 20, communication: 20,
      technical: 20, confidence: 20, relevance: 20
    }

    await AIInterviewAnalysis.findByIdAndUpdate(analysisId, {
      status: 'completed',
      scores,
      feedback: {
        strengths: groqResult?.strengths || [],
        improvements: groqResult?.improvements || [],
        tips: groqResult?.tips || [],
        questionFeedback: groqResult?.questionFeedback || [],
        overallComment: groqResult?.overallComment || ''
      },
      transcript: fullTranscript
    })

    // Award XP
    try {
      await awardXP(userId, scores.overall)
    } catch (e) {
      console.error('XP award error:', e)
    }

    // Emit socket event
    const io = app.get('io')
    if (io) io.to(`user:${userId}`).emit('interview_analysis_ready', { analysisId })

    console.log('=== Interview analysis complete ===', scores)

  } catch (err) {
    console.error('Interview pipeline error:', err)
    await AIInterviewAnalysis.findByIdAndUpdate(analysisId, { status: 'failed' })
  }
}

async function getInterviewAnalysis(req, res) {
  try {
    const { sessionId } = req.params
    const { userId } = req.query

    const analysis = await AIInterviewAnalysis.findOne({
      $or: [
        { _id: sessionId.match(/^[a-f\d]{24}$/i) ? sessionId : null },
        { sessionId: sessionId }
      ].filter(c => Object.values(c)[0] !== null),
      userId
    })

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' })
    }

    res.json(analysis)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

async function getInterviewHistory(req, res) {
  try {
    const { userId } = req.params;
    const sessions = await AIInterviewAnalysis
      .find({ userId, status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { startInterviewAnalysis, getInterviewAnalysis, getInterviewHistory }
