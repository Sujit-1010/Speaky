const axios = require('axios');

async function analyzeWithGemini(transcript, topic) {
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

module.exports = { analyzeWithGemini, analyzeInterview }
