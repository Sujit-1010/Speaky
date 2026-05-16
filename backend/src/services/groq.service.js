const axios = require('axios');

async function analyzeWithGroq(transcript, topic) {
  const key = (process.env.GROQ_API_KEY || '').trim();
  
  console.log('=== Groq analyzeWithGemini called ===')
  console.log('=== Groq key exists:', !!key)
  console.log('=== Transcript:', transcript)
  
  if (!key) {
    console.warn('=== No Groq key found, using fallback ===')
    return null;
  }

  if (!transcript || transcript.trim().length < 3) {
    return null;
  }

  const prompt = `You are a strict English grammar teacher and Group Discussion evaluator.

GD Topic: "${topic}"
Student transcript: "${transcript}"

RULES:
1. If transcript has less than 5 words, give scores between 5-15 only. Never give 50 as default.
2. Be VERY STRICT about grammar. Catch every single mistake.

GRAMMAR MISTAKES TO CHECK:
- Subject-verb agreement: "She don't like" → WRONG (should be "She doesn't like")
- Wrong tense: "I goed there" → WRONG (should be "I went there")
- Article errors: "Give me pen" → WRONG (should be "Give me a pen")
- Wrong preposition: "good in English" → WRONG (should be "good at English")
- Singular/plural errors: "Two childs" → WRONG (should be "Two children")

Return ONLY this exact JSON, no markdown, no extra text:
{
  "knowledgeScore": 0-100,
  "grammarScore": 0-100,
  "grammarErrors": [
    {
      "wrong": "exact wrong sentence from transcript",
      "correct": "corrected version",
      "explanation": "why it is wrong"
    }
  ],
  "grammarCorrections": ["corrected sentence 1"],
  "strengths": ["specific strength"],
  "improvements": ["specific improvement"],
  "tips": ["tip 1", "tip 2", "tip 3"],
  "argumentQuality": "one line comment"
}`

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )

    console.log('=== Groq response status:', response.status)
    
    const rawText = response.data?.choices?.[0]?.message?.content || ''
    console.log('=== Groq raw text:', rawText.substring(0, 300))
    
    // Clean and parse JSON
    const cleaned = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    
    const result = JSON.parse(cleaned)
    console.log('=== Groq parsed successfully ===')
    return result
    
  } catch (err) {
    console.error('=== Groq API error:', 
      err.response?.status,
      err.response?.data,
      err.message
    )
    return null
  }
}

async function analyzeInterview(
  fullTranscript, userAnswers,
  interviewType, role, company,
  selectedTopics, resumeText
) {
  const key = (process.env.GROQ_API_KEY || '').trim()
  if (!key) return null

  const topicsContext = selectedTopics?.length > 0
    ? `Technical topics covered: ${selectedTopics.join(', ')}`
    : ''

  const resumeContext = resumeText
    ? `Candidate resume provided.`
    : ''

  const prompt = `You are an expert interview coach analyzing a ${interviewType} interview.
Role: ${role}
Company: ${company || 'General Practice'}
${topicsContext}
${resumeContext}

Full Interview Transcript:
${fullTranscript}

Evaluate the CANDIDATE's responses only. Be honest and constructive.

Score each area 0-100:
- Overall performance
- Communication clarity
- Technical knowledge (for technical interviews)
- Confidence and delivery
- Answer relevance to questions

Return ONLY valid JSON, no markdown:
{
  "overallScore": 0,
  "communicationScore": 0,
  "technicalScore": 0,
  "confidenceScore": 0,
  "relevanceScore": 0,
  "strengths": ["specific strength based on answers"],
  "improvements": ["specific area to improve"],
  "tips": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
  "questionFeedback": [
    {
      "question": "question asked by AI",
      "answer": "brief summary of candidate answer",
      "feedback": "specific feedback on this answer",
      "score": 0
    }
  ],
  "overallComment": "2-3 sentence overall assessment"
}`

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      }
    )

    const rawText = response.data?.choices?.[0]?.message?.content || ''
    console.log('=== Interview Groq response:', rawText.substring(0, 200))

    const cleaned = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    return JSON.parse(cleaned)

  } catch (err) {
    console.error('Groq interview error:', err.response?.status, err.message)
    return null
  }
}

async function analyzeExtempore(transcript, topic, duration) {
  const key = (process.env.GROQ_API_KEY || '').trim();
  if (!key) return null;

  if (!transcript || transcript.trim().length < 5) return null;

  const prompt = `You are an expert communication coach and English evaluator analyzing a student's Extempore speech.

Topic Given: "${topic}"
Student Transcript: "${transcript}"
Speaking Duration: ${duration || 0} seconds

RULES:
1. Evaluate the transcript objectively based on standard public speaking and extempore rubrics.
2. If the transcript has very few words (less than 10 words), give all scores between 1-3 only.
3. Detect actual filler words used in the transcript such as "um", "uh", "like", "basically", "you know", "so", "right".
4. Be VERY STRICT about grammar — check subject-verb agreement, tense, articles, prepositions, singular/plural.
5. Scores are on a scale of 0 to 10.
6. For grammarErrors: find exact wrong phrases or sentences from the transcript. If no errors found, return an empty array.

GRAMMAR MISTAKES TO CATCH:
- Subject-verb agreement: "He go to market" → "He goes to market"
- Wrong tense: "I goed there" → "I went there"
- Missing article: "Give me pen" → "Give me a pen"
- Wrong preposition: "good in English" → "good at English"
- Singular/plural: "Two childs" → "Two children"

Score the following:
- fluency: Smoothness and flow of speech without unnecessary pauses or repetition.
- clarity: Clear articulation and easy-to-understand sentences.
- pacing: Appropriate speaking speed — not too fast, not too slow.
- knowledge: Accuracy, depth, and relevance of facts about the given topic.
- grammar: Correct sentence structure, tenses, articles, and subject-verb agreement.
- confidence: Assuredness in delivery, judged by strong phrasing and continuity.
- vocabulary: Use of varied, precise, and impressive words relevant to the topic.
- content: Quality, structure, and logical flow of the arguments presented.

Return ONLY valid JSON. No markdown, no explanation, no extra text outside the JSON:
{
  "scores": {
    "fluency": 0,
    "clarity": 0,
    "pacing": 0,
    "knowledge": 0,
    "grammar": 0,
    "confidence": 0,
    "vocabulary": 0,
    "content": 0
  },
  "fillerWordsData": {
    "count": 0,
    "wordsDetected": []
  },
  "grammarErrors": [
    {
      "wrong": "the exact wrong phrase or sentence from the transcript",
      "correct": "the grammatically corrected version",
      "explanation": "short reason why it is wrong"
    }
  ],
  "strengths": ["specific strength from the actual speech"],
  "improvements": ["specific area to improve with actionable advice"],
  "tips": ["practical tip 1", "practical tip 2", "practical tip 3"],
  "ai_feedback": "A 2-3 sentence honest overall assessment of the student's extempore performance on this specific topic."
}`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1200
      },
      {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        timeout: 40000
      }
    );

    const rawText = response.data?.choices?.[0]?.message?.content || '';
    console.log('=== Extempore Groq response:', rawText.substring(0, 300));

    const cleaned = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    return JSON.parse(cleaned);
  } catch (err) {
    console.error('=== Extempore Groq error:', err.response?.status, err.message);
    return null;
  }
}

async function generateTopicsFromNews(headlines) {
  const key = (process.env.GROQ_API_KEY || '').trim();
  if (!key) return null;

  if (!headlines || headlines.length === 0) return null;

  const prompt = `You are an expert Group Discussion moderator. I will provide you with a list of current news headlines. Your task is to generate exactly 5 debatable, engaging Group Discussion topics based on these current affairs.

News Headlines:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Rules:
1. The topics must be phrased as clear statements or questions that invite debate (e.g., "The rise of AI: A threat to jobs or an opportunity for growth?").
2. Ensure topics are diverse and cover technology, society, or global affairs if present in the headlines.
3. Return ONLY a valid JSON array of 5 strings. No markdown, no intro text.
Example format:
[
  "Topic 1",
  "Topic 2",
  "Topic 3",
  "Topic 4",
  "Topic 5"
]`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const rawText = response.data?.choices?.[0]?.message?.content || '';
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.error('Groq topic generation error:', err.response?.status, err.message);
    return null;
  }
}

module.exports = { analyzeWithGroq, analyzeInterview, analyzeExtempore, generateTopicsFromNews }
