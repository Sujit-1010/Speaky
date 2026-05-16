require('dotenv').config({ path: './.env' });
const { refreshTopics, getRandomTopic } = require('./src/services/topicGenerator.service');

async function test() {
  console.log('Testing topic generation...');
  await refreshTopics();
  console.log('Random topic selected from cache:', getRandomTopic());
  process.exit(0);
}

test();
