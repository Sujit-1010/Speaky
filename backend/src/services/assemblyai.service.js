const axios = require('axios');

const BASE_URL = 'https://api.assemblyai.com/v2';

function getKey() {
    return (process.env.ASSEMBLYAI_KEY || '').trim();
}

async function sleep(ms) {
    return await new Promise((r) => setTimeout(r, ms));
}

async function transcribeAudio(audioUrl) {
    console.log('=== transcribeAudio called with:', audioUrl)
    console.log('=== API Key exists:', !!process.env.ASSEMBLYAI_KEY)
    const key = getKey();
    if (!key) {
        const err = new Error('Analysis unavailable. Please contact administrator.');
        err.code = 'missing_assemblyai_key';
        throw err;
    }
    if (!audioUrl) throw new Error('Missing audioUrl');

    const headers = {
        authorization: key,
        'content-type': 'application/json'
    };

    let createResp;
    try {
        createResp = await axios.post(
            `${BASE_URL}/transcript`,
            {
                audio_url: audioUrl,
                speech_models: ['universal-2'],
                sentiment_analysis: true,
                filter_profanity: true,
            },
            { headers }
        );
    } catch (err) {
        if (err.response?.data?.error?.includes('no spoken audio') ||
            err.response?.data?.error?.includes('language_detection')) {
            return {
                text: '',
                words: [],
                sentences: [],
                sentiment_analysis_results: [],
                audio_duration: 0,
                noSpeechDetected: true
            };
        }
        console.error('AssemblyAI 400 error details:', {
            status: err.response?.status,
            statusText: err.response?.statusText,
            errorData: JSON.stringify(err.response?.data),
            headers: err.response?.headers,
            requestUrl: `${BASE_URL}/transcript`,
            requestBody: JSON.stringify({
                audio_url: audioUrl?.substring(0, 100)
            })
        });
        throw err;
    }

    const id = createResp?.data?.id;
    if (!id) throw new Error('AssemblyAI did not return transcript id');

    for (let i = 0; i < 120; i++) {
        const pollResp = await axios.get(`${BASE_URL}/transcript/${id}`, { headers });
        const data = pollResp?.data;
        const status = data?.status;

        if (status === 'completed') {
            return {
                text: data?.text || '',
                words: Array.isArray(data?.words) ? data.words : [],
                sentences: Array.isArray(data?.sentences) ? data.sentences : [],
                sentiment_analysis_results: Array.isArray(data?.sentiment_analysis_results) ? data.sentiment_analysis_results : [],
                audio_duration: data?.audio_duration || data?.audio_duration_seconds || null,
            };
        }
        if (status === 'error') {
            const msg = data?.error || 'Transcription failed';

            // If no speech detected, return empty transcript
            // instead of throwing error
            if (msg.includes('no spoken audio') || 
                msg.includes('language_detection') ||
                msg.includes('no audio') ||
                msg.includes('silent')) {
                return {
                    text: '',
                    words: [],
                    sentences: [],
                    sentiment_analysis_results: [],
                    audio_duration: 0,
                    noSpeechDetected: true
                };
            }

            throw new Error(msg);
        }

        await sleep(3000);
    }

    throw new Error('Transcription timed out');
}

module.exports = {
    transcribeAudio,
};
