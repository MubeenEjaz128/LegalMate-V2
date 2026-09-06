const mongoose = require('mongoose');
const ragService = require('./services/ragService');

require('dotenv').config();

async function runTest() {
  console.log('--- Started test ---');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const question = 'What is the punishment for theft in Pakistan?';
  console.log('Query:', question);

  const startTime = Date.now();
  const response = await ragService.query(question, []);
  
  console.log('\n--- RESPONSE START ---');
  console.log(response.answer);
  console.log('--- RESPONSE END ---');
  
  if (response.sources && response.sources.length > 0) {
    console.log('\nSources:', response.sources.map(s => s.file).join(', '));
  } else {
    console.log('\nNo sources found.');
  }

  console.log(`\nTime taken: ${(Date.now() - startTime) / 1000}s`);

  await mongoose.disconnect();
  process.exit(0);
}

runTest().catch(console.error);
