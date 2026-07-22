const FILLER_WORDS = [
    'um', 'uh', 'like', 'you know', 'basically', 'actually', 'so', 'hmm'
];

// Score weights used in calculateOverallScore and calculateScores.
// Defined once here so changes are made in a single place.
const SCORE_WEIGHTS = {
    participation: 0.25,
    communication: 0.25,
    knowledge:     0.25,
    grammar:       0.15,
    teamwork:      0.10,
};

function clamp(n, min, max) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.max(min, Math.min(max, x));
}

function countFillers(text) {
    const t = String(text || '').toLowerCase();

    let count = 0;
    // phrase fillers first
    const phrases = ['you know'];
    phrases.forEach((p) => {
        const re = new RegExp(`\\b${p.replace(/[-/\\^$*+?.()|[\\]{}]/g, '\\$&')}\\b`, 'g');
        const m = t.match(re);
        if (m) count += m.length;
    });

    // single-word fillers
    const singles = FILLER_WORDS.filter((w) => w !== 'you know');
    const re = new RegExp(`\\b(${singles.map((s) => s.replace(/[-/\\^$*+?.()|[\\]{}]/g, '\\$&')).join('|')})\\b`, 'g');
    const m = t.match(re);
    if (m) count += m.length;

    return count;
}

function calculateMetrics(transcriptData, sessionDurationSeconds) {
    const words = Array.isArray(transcriptData?.words) ? transcriptData.words : [];
    const sentences = Array.isArray(transcriptData?.sentences) ? transcriptData.sentences : [];
    const sentiments = Array.isArray(transcriptData?.sentiment_analysis_results) ? transcriptData.sentiment_analysis_results : [];

    const duration = Number(sessionDurationSeconds) || Number(transcriptData?.audio_duration) || 0;

    const totalWords = words.length;

    // speaking time from word timestamps (AssemblyAI is ms)
    let speakingTime = 0;
    if (words.length > 0) {
        const first = words[0];
        const last = words[words.length - 1];
        const startMs = Number(first?.start) || 0;
        const endMs = Number(last?.end) || 0;
        if (endMs > startMs) speakingTime = (endMs - startMs) / 1000;
    }

    const minutes = duration > 0 ? (duration / 60) : (speakingTime > 0 ? speakingTime / 60 : 0);
    const wpm = minutes > 0 ? Math.round(totalWords / minutes) : 0;

    const transcriptText = transcriptData?.text || '';
    const fillerCount = countFillers(transcriptText);
    const fillerRatio = totalWords > 0 ? fillerCount / totalWords : 0;

    // turn count from sentences
    const turnCount = sentences.length;

    // sentiment score: positive=1, neutral=0, negative=-1 weighted avg
    let sentimentScore = 0;
    if (sentiments.length > 0) {
        const map = { positive: 1, neutral: 0, negative: -1 };
        const sum = sentiments.reduce((acc, s) => acc + (map[String(s?.sentiment || '').toLowerCase()] ?? 0), 0);
        sentimentScore = Math.round((sum / sentiments.length) * 100); // -100..100
    }

    return {
        speakingTime,
        totalWords,
        wpm,
        fillerCount,
        fillerRatio,
        turnCount,
        sentimentScore,
        duration,
    };
}

function calculateParticipationScore(speakingTime, totalSessionDuration) {
    const total = Number(totalSessionDuration) || 0;
    const spk = Number(speakingTime) || 0;
    const p = total > 0 ? (spk / total) * 100 : 0;

    if (p >= 15 && p <= 35) return 90;
    if (p >= 10 && p < 15) return 70;
    if (p > 35 && p <= 50) return 70;
    if (p < 10) return 50;
    if (p > 50) return 40;
    return 50;
}

function calculateParticipationScoreFromPercent(participationPercent) {
    const p = Number(participationPercent) || 0;
    if (p >= 15 && p <= 35) return 90;
    if (p >= 10 && p < 15) return 70;
    if (p > 35 && p <= 50) return 70;
    if (p < 10) return 50;
    if (p > 50) return 40;
    return 50;
}

function calculateOverallScore(scores) {
    const s = scores || {};
    const participation = clamp(s.participation, 0, 100);
    const communication = clamp(s.communication, 0, 100);
    const knowledge = clamp(s.knowledge, 0, 100);
    const grammar = clamp(s.grammar, 0, 100);
    const teamwork = clamp(s.teamwork, 0, 100);

    return Math.round(
        (participation * SCORE_WEIGHTS.participation) +
        (communication * SCORE_WEIGHTS.communication) +
        (knowledge     * SCORE_WEIGHTS.knowledge) +
        (grammar       * SCORE_WEIGHTS.grammar) +
        (teamwork      * SCORE_WEIGHTS.teamwork)
    );
}

function calculateCommunicationScore(fillerRatio, wpm) {
    const fr = Number(fillerRatio) || 0;
    const fillerScore = clamp(100 - (fr * 500), 0, 100);

    const w = Number(wpm) || 0;
    let wpmScore = 50;
    if (w >= 110 && w <= 150) wpmScore = 100;
    else if (w >= 80 && w < 110) wpmScore = 75;
    else if (w > 150 && w <= 180) wpmScore = 75;
    else if (w < 80) wpmScore = 50;
    else if (w > 180) wpmScore = 40;

    return Math.round((fillerScore * 0.5) + (wpmScore * 0.5));
}

function calculateTeamworkScore(turnCount) {
    const t = Number(turnCount) || 0;
    if (t >= 8) return 95;
    if (t >= 6) return 85;
    if (t >= 4) return 70;
    if (t >= 2) return 55;
    return 35;
}

function calculateScores(metrics, gemini) {
    const participation = calculateParticipationScore(metrics.speakingTime, metrics.duration);
    const communication = calculateCommunicationScore(metrics.fillerRatio, metrics.wpm);
    const teamwork = calculateTeamworkScore(metrics.turnCount);

    const knowledge = clamp(gemini?.knowledgeScore, 0, 100);
    const grammar = clamp(gemini?.grammarScore, 0, 100);

    const overall = Math.round(
        (participation * SCORE_WEIGHTS.participation) +
        (communication * SCORE_WEIGHTS.communication) +
        (knowledge     * SCORE_WEIGHTS.knowledge) +
        (grammar       * SCORE_WEIGHTS.grammar) +
        (teamwork      * SCORE_WEIGHTS.teamwork)
    );

    return {
        overall,
        participation,
        communication,
        knowledge,
        grammar,
        teamwork,
        confidence: 0,
    };
}

function generateStrengthsAndImprovements(scores, metrics) {
    const strengths = [];
    const improvements = [];

    if ((scores.participation || 0) > 25) strengths.push('Good participation level');
    if ((scores.communication || 0) > 70) strengths.push('Clear and fluent speech');
    if ((metrics.fillerCount || 0) < 5) strengths.push('Minimal use of filler words');
    if ((metrics.wpm || 0) >= 110 && (metrics.wpm || 0) <= 150) strengths.push('Good speaking pace');
    if ((scores.teamwork || 0) > 70) strengths.push('Good engagement with others');

    const participationPercent = (metrics.duration || 0) > 0 ? (metrics.speakingTime / metrics.duration) * 100 : 0;
    if (participationPercent < 15) improvements.push('Speak more actively');
    if ((metrics.fillerCount || 0) > 15) improvements.push('Reduce filler words');
    if ((metrics.wpm || 0) > 180) improvements.push('Slow down your speech');
    if ((metrics.wpm || 0) < 80 && (metrics.totalWords || 0) > 0) improvements.push('Speak with more confidence');

    return {
        strengths: strengths.slice(0, 5),
        improvements: improvements.slice(0, 5),
    };
}

module.exports = {
    calculateMetrics,
    calculateScores,
    generateStrengthsAndImprovements,
    calculateParticipationScoreFromPercent,
    calculateOverallScore,
};
