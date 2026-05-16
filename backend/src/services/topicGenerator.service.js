const Parser = require('rss-parser');
const parser = new Parser();
const { generateTopicsFromNews } = require('./groq.service');

// Google News RSS for Top Stories (India or Global)
const RSS_URL = 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en';

let cachedTopics = [
  'The impact of artificial intelligence on employment',
  'Social media regulation and freedom of speech',
  'Climate change and individual responsibility',
  'Remote work vs office culture',
  'Is social media doing more harm than good?',
  'The future of online education',
  'Data privacy in a connected world',
];

async function refreshTopics() {
  try {
    console.log('Fetching latest news for GD topics...');
    const feed = await parser.parseURL(RSS_URL);
    
    // Extract top 15 headlines
    const headlines = feed.items.slice(0, 15).map(item => item.title);
    
    if (headlines.length === 0) {
      console.warn('No headlines found in RSS feed.');
      return;
    }

    console.log(`Sending ${headlines.length} headlines to Groq...`);
    const newTopics = await generateTopicsFromNews(headlines);
    
    if (newTopics && Array.isArray(newTopics) && newTopics.length > 0) {
      cachedTopics = newTopics;
      console.log('Successfully updated GD topics cache with current affairs:', cachedTopics);
    } else {
      console.warn('Groq failed to generate topics, keeping old cache.');
    }
  } catch (err) {
    console.error('Error refreshing topics from news:', err.message);
  }
}

function getRandomTopic() {
  return cachedTopics[Math.floor(Math.random() * cachedTopics.length)];
}

module.exports = { refreshTopics, getRandomTopic };
