const Analysis = require('../models/Analysis');
const config = require('../config');
const fs = require('fs');
const { transcribeAudio } = require('../services/assemblyai.service');
const { analyzeWithGroq } = require('../services/groq.service');
const { calculateMetrics, calculateScores, generateStrengthsAndImprovements, calculateParticipationScoreFromPercent, calculateOverallScore } = require('../services/scoring.service');
const { uploadAudio: uploadAudioToCloudinary, deleteAudio } = require('../services/cloudinary.service');

async function recalculateParticipationForSession({ sessionId, io }) {
    try {
        const allParticipants = await Analysis.find({ sessionId: String(sessionId), status: 'completed' }).lean();
        if (!Array.isArray(allParticipants) || allParticipants.length < 2) {
            if (Array.isArray(allParticipants) && allParticipants.length === 1) {
                const only = allParticipants[0];
                try {
                    await Analysis.updateOne({ _id: only._id }, { $set: { participationApprox: true } });
                } catch { }
            }
            return;
        }

        const totalGroupSpeakingTime = allParticipants.reduce((acc, p) => acc + (Number(p?.metrics?.speakingTime) || 0), 0);
        if (!(totalGroupSpeakingTime > 0)) return;

        await Promise.all(allParticipants.map(async (p) => {
            try {
                const speakingTime = Number(p?.metrics?.speakingTime) || 0;
                const participationPercent = (speakingTime / totalGroupSpeakingTime) * 100;
                const participation = calculateParticipationScoreFromPercent(participationPercent);

                const nextScores = { ...(p.scores || {}), participation };
                const overall = calculateOverallScore(nextScores);

                await Analysis.updateOne(
                    { _id: p._id },
                    { $set: { 'scores.participation': participation, 'scores.overall': overall, participationApprox: false } }
                );

                try {
                    if (io && p.userId) io.to(`user:${p.userId}`).emit('analysis_updated', { sessionId: String(sessionId), message: 'Participation score updated' });
                } catch { }
            } catch { }
        }));
    } catch { }
}

async function runAnalysisPipeline({ analysisId, sessionId, audioUrl, topic, duration, userId, io }) {
    console.log('=== runAnalysisPipeline started ===', {
        analysisId,
        audioUrl,
        topic,
        duration
    })
    try {
        await Analysis.updateOne({ _id: analysisId }, { $set: { status: 'processing' } });

        let transcriptData;
        console.log('=== Calling AssemblyAI now ===')
        try {
            transcriptData = await transcribeAudio(audioUrl);
            console.log('=== AssemblyAI SUCCESS ===', {
                textLength: transcriptData?.text?.length,
                duration: transcriptData?.audio_duration
            })

            // Transcription succeeded — delete the Cloudinary audio file.
            // This is a cleanup step only; any failure is logged and swallowed so the
            // analysis pipeline is never blocked or interrupted by a Cloudinary hiccup.
            const cloudinaryPublicId = `speakup/recordings/${sessionId}_${userId}`;
            deleteAudio(cloudinaryPublicId).catch((err) => {
                console.error('[Cloudinary cleanup] Failed to delete audio after transcription:', cloudinaryPublicId, err?.message);
            });
        } catch (e) {
            console.error('=== AssemblyAI FAILED ===', {
                message: e.message,
                stack: e.stack
            })
            const reason = 'Transcription service unavailable';
            try {
                await Analysis.updateOne(
                    { _id: analysisId },
                    { $set: { status: 'failed', errorReason: reason } }
                );
            } catch { }
            try {
                if (io && userId) io.to(`user:${userId}`).emit('analysis_failed', { analysisId: analysisId.toString(), userId, reason });
            } catch { }
            return;
        }

        if (!transcriptData?.text || transcriptData.text.trim().length < 10) {
            await Analysis.updateOne(
                { _id: analysisId },
                {
                    $set: {
                        status: 'completed',
                        scores: {
                            overall: 0, participation: 0,
                            communication: 0, knowledge: 0,
                            grammar: 0, teamwork: 0
                        },
                        metrics: {
                            speakingTime: 0, totalWords: 0,
                            wpm: 0, fillerCount: 0,
                            turnCount: 0, sentimentScore: 0
                        },
                        feedback: {
                            strengths: [],
                            improvements: ['No speech detected in this session'],
                            tips: [
                                'Make sure your microphone is not muted',
                                'Speak clearly and loud enough',
                                'Try speaking for at least 2-3 minutes'
                            ],
                            grammarErrors: [],
                            grammarCorrections: []
                        },
                        transcript: ''
                    }
                }
            );
            
            const { awardXP } = require('../services/xp.service');
            const xpResult = await awardXP(userId, 0);
            
            try {
                if (io && userId) io.to(`user:${userId}`).emit('analysis_ready', { 
                    sessionId: String(sessionId), 
                    analysisId: analysisId.toString(), 
                    userId,
                    xpEarned: xpResult.xpEarned || 0,
                    newTotalXP: xpResult.newTotalXP || 0,
                    newLevel: xpResult.newLevel || 1,
                    leveledUp: xpResult.leveledUp || false
                });
            } catch { }
            return;
        }

        const transcript = transcriptData?.text || '';
        const metrics = calculateMetrics(transcriptData, duration);

        let groqResult;
        let groqUsed = true;
        try {
            groqResult = await analyzeWithGroq(transcript, topic);
        } catch {
            groqUsed = false;
            
            const wordCount = transcriptData?.text?.split(' ')?.length || 0;
            const fallbackKnowledge = wordCount < 10 ? 15 : 50;
            const fallbackGrammar = wordCount < 10 ? 15 : 50;

            groqResult = {
                knowledgeScore: fallbackKnowledge,
                grammarScore: fallbackGrammar,
                grammarErrors: [],
                grammarCorrections: [],
                strengths: wordCount < 10 
                    ? [] 
                    : ['Participated in discussion'],
                improvements: wordCount < 10 
                    ? ['Speak more to get proper analysis'] 
                    : ['Could not analyze in detail'],
                tips: [
                    'Practice speaking clearly',
                    'Stay on topic',
                    'Engage with other participants'
                ],
                argumentQuality: 'Insufficient speech for analysis'
            };
        }

        const scores = calculateScores(metrics, groqResult);
        const ruleFeedback = generateStrengthsAndImprovements(scores, metrics);

        const feedback = {
            strengths: Array.isArray(groqResult?.strengths) ? groqResult.strengths : (ruleFeedback.strengths || []),
            improvements: Array.isArray(groqResult?.improvements) ? groqResult.improvements : (ruleFeedback.improvements || []),
            tips: Array.isArray(groqResult?.tips) ? groqResult.tips : [],
            grammarErrors: Array.isArray(groqResult?.grammarErrors) ? groqResult.grammarErrors : [],
            grammarCorrections: Array.isArray(groqResult?.grammarCorrections) ? groqResult.grammarCorrections : [],
        };

        await Analysis.updateOne(
            { _id: analysisId },
            {
                $set: {
                    topic: topic || null,
                    duration: metrics.duration || duration || null,
                    transcript,
                    audioUrl,
                    geminiUsed: groqUsed,  // DB field name kept as-is; renaming would break existing documents
                    metrics: {
                        speakingTime: metrics.speakingTime,
                        totalWords: metrics.totalWords,
                        wpm: metrics.wpm,
                        fillerCount: metrics.fillerCount,
                        turnCount: metrics.turnCount,
                        sentimentScore: metrics.sentimentScore,
                    },
                    scores,
                    feedback,
                    status: 'completed',
                }
            }
        );

        recalculateParticipationForSession({ sessionId, io }).catch(() => { });

        const { awardXP } = require('../services/xp.service');
        const overallScore = scores.overall || 0;
        const xpResult = await awardXP(userId, overallScore);
        console.log('XP awarded:', xpResult);

        try {
            if (io && userId) io.to(`user:${userId}`).emit('analysis_ready', { 
                sessionId: String(sessionId), 
                analysisId: analysisId.toString(), 
                userId,
                xpEarned: xpResult.xpEarned || 0,
                newTotalXP: xpResult.newTotalXP || 0,
                newLevel: xpResult.newLevel || 1,
                leveledUp: xpResult.leveledUp || false
            });
        } catch { }
    } catch (error) {
        console.error('Pipeline failed:', error);
        const msg = (config.nodeEnv !== 'production' && error?.message) ? error.message : (error?.code === 'missing_assemblyai_key' || error?.code === 'missing_gemini_key' ? 'Analysis unavailable. Please contact administrator.' : 'Analysis failed');
        try {
            await Analysis.updateOne({ _id: analysisId }, { $set: { status: 'failed', errorReason: msg } });
        } catch { }
        try {
            if (io && userId) io.to(`user:${userId}`).emit('analysis_failed', { analysisId: analysisId.toString(), userId, message: msg });
        } catch { }
    }
}

async function uploadAudio(req, res) {
    console.log('Upload audio request received', {
        hasFile: !!req.file,
        sessionId: req.body?.sessionId,
        userId: req.body?.userId
    });
    if (req.file) {
        console.log('File details:', req.file);
    }

    if (!req.file || !req.file.path) {
        return res.status(400).json({ message: 'No audio file received' });
    }

    const { sessionId, userId } = req.body || {};

    try {
        let audioUrl;
        try {
            console.log('Uploading to Cloudinary...');
            audioUrl = await uploadAudioToCloudinary(req.file.path, sessionId, userId);
            console.log('Cloudinary upload success:', audioUrl);
        } finally {
            try {
                fs.unlinkSync(req.file.path);
            } catch { }
        }

        return res.json({ success: true, audioUrl });
    } catch (e) {
        console.error('Upload audio error:', e?.message, e);
        try {
            fs.unlinkSync(req.file.path);
        } catch { }
        return res.status(500).json({ message: 'Audio upload failed' });
    }
}

async function getAnalysisHistory(req, res) {
    try {
        const userId = req?.params?.userId ? String(req.params.userId) : null;
        if (!userId) return res.status(400).json({ message: 'Missing fields' });

        const docs = await Analysis.find({ userId, status: 'completed' })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        const result = (docs || []).map((d) => ({
            analysisId: d._id,
            sessionId: d.sessionId,
            topic: d.topic,
            duration: d.duration,
            participantCount: d.participantCount || 0,
            createdAt: d.createdAt,
            scores: {
                overall: d?.scores?.overall,
                participation: d?.scores?.participation,
                communication: d?.scores?.communication,
                knowledge: d?.scores?.knowledge,
                grammar: d?.scores?.grammar,
                teamwork: d?.scores?.teamwork,
            },
            metrics: {
                speakingTime: d?.metrics?.speakingTime,
                wpm: d?.metrics?.wpm,
                fillerCount: d?.metrics?.fillerCount,
                turnCount: d?.metrics?.turnCount,
                totalWords: d?.metrics?.totalWords,
            }
        }));

        res.json(result);
    } catch (e) {
        res.status(500).json({ message: 'Server error' });
    }
}

async function startAnalysis(req, res) {
    try {
        const { sessionId, userId, audioUrl, topic, duration, participantCount } = req.body || {};
        console.log('Received audioUrl:', audioUrl);
        if (!sessionId || !userId || !audioUrl || typeof audioUrl !== 'string' || !/^https?:\/\//i.test(audioUrl.trim())) {
            return res.status(400).json({
                message: 'Invalid audio file. Please try again.'
            });
        }

        console.log('=== startAnalysis env check ===')
        console.log('ASSEMBLYAI_KEY exists:', !!(process.env.ASSEMBLYAI_KEY))
        console.log('ASSEMBLYAI_KEY length:', process.env.ASSEMBLYAI_KEY?.trim().length)
        console.log('GROQ_API_KEY exists:', !!(process.env.GROQ_API_KEY))
        console.log('GROQ_API_KEY length:', process.env.GROQ_API_KEY?.trim().length)

        const hasAssemblyKey = (process.env.ASSEMBLYAI_KEY || '').trim().length > 0;
        const hasGroqKey = (process.env.GROQ_API_KEY || '').trim().length > 0;
        if (!hasAssemblyKey || !hasGroqKey) {
            return res.status(503).json({ message: 'Analysis unavailable. Please contact administrator.' });
        }

        const created = await Analysis.findOneAndUpdate(
            { sessionId: String(sessionId), userId: String(userId) },
            {
                $set: {
                    sessionId: String(sessionId),
                    userId: String(userId),
                    audioUrl: String(audioUrl),
                    topic: topic || null,
                    duration: Number(duration) || 0,
                    participantCount: Number(participantCount) || 0,
                    status: 'pending',
                }
            },
            { upsert: true, new: true }
        );

        const analysisId = created._id.toString();
        res.status(201).json({ success: true, analysisId });

        const io = req.app.get('io');
        setImmediate(() => {
            runAnalysisPipeline({ analysisId: created._id, sessionId, audioUrl, topic, duration, userId, io }).catch(() => { });
        });
    } catch (e) {
        res.status(500).json({ message: 'Server error' });
    }
}

async function getAnalysis(req, res) {
    try {
        const { sessionId } = req.params;
        const userId = (req.query && req.query.userId) ? String(req.query.userId) : null;
        if (!sessionId || !userId) return res.status(400).json({ message: 'Missing fields' });

        const doc = await Analysis.findOne({ sessionId: String(sessionId), userId }).lean();
        if (!doc) return res.status(404).json({ message: 'Not found' });

        res.json({
            ...doc,
            id: doc._id.toString(),
            _id: undefined,
            __v: undefined,
        });
    } catch (e) {
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = {
    startAnalysis,
    uploadAudio,
    getAnalysis,
    getAnalysisHistory,
};
