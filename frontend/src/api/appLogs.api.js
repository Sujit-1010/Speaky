export const appLogs = {
  async logUserInApp(pageName) {
    try {
      const key = 'app_logs';
      const logs = JSON.parse(localStorage.getItem(key) || '[]');
      logs.push({ page: pageName, ts: Date.now() });
      localStorage.setItem(key, JSON.stringify(logs));
    } catch { }
    return { success: true };
  },
};

export const integrations = {
  Core: {
    async InvokeLLM(args) {
      const prompt = args && args.prompt;
      const response_json_schema = args && args.response_json_schema;
      const props = response_json_schema?.properties || {};
      const keys = Object.keys(props);
      if (keys.includes('message') && keys.includes('question')) {
        return { message: "Hello! Let's begin your interview.", question: 'Tell me about yourself.' };
      }
      if (keys.includes('feedback') && keys.includes('next_question')) {
        return { feedback: 'Thanks, that was a clear response.', next_question: "What's a challenging problem you've solved recently?" };
      }
      if (keys.includes('response')) {
        return { response: 'Welcome! Please introduce yourself and share your background briefly.' };
      }
      if (keys.includes('participationSummary') && keys.includes('overallScore') && keys.includes('knowledgeScore')) {
        return {
          overallScore: 70,
          communicationScore: 72,
          knowledgeScore: 66,
          participationSummary: 'Shared multiple points and responded to peers with respect.',
          strengths: ['Structured points', 'Good eye contact', 'Calm tone'],
          improvements: ['Add data points', 'Trim filler words', 'Summarize more often']
        };
      }
      return { content: `LLM is not connected. Stub for prompt: ${String(prompt || '').slice(0, 80)}...` };
    },
  }
};
