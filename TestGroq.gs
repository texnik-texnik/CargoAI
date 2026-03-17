/**
 * Test Groq AI Integration
 * Run this to verify Groq is working
 */

function testGroq() {
  console.log('=== Testing Groq AI ===\n');
  
  // Test 1: Check API key
  console.log('Test 1: Checking API key...');
  const apiKey = PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');
  if (!apiKey) {
    console.log('❌ GROQ_API_KEY not found in Script Properties!');
    console.log('Add it: Settings → Script Properties → GROQ_API_KEY');
    return;
  }
  console.log('✅ API key found (starts with: ' + apiKey.substring(0, 4) + '...)\n');
  
  // Test 2: Simple question
  console.log('Test 2: Asking simple question...');
  const response1 = askGroqAI('Привет! Как дела?', 'ru');
  console.log('Question: Привет! Как дела?');
  console.log('Response:', response1 || '❌ No response\n');
  
  // Test 3: Cargo question
  console.log('\nTest 3: Asking cargo question...');
  const response2 = askGroqAI('Сколько стоит доставка 10 кг груза из Китая?', 'ru');
  console.log('Question: Сколько стоит доставка 10 кг груза из Китая?');
  console.log('Response:', response2 || '❌ No response\n');
  
  // Test 4: Tajik language
  console.log('\nTest 4: Tajik language test...');
  const response3 = askGroqAI('Салом! Чӣ хел шумо?', 'tj');
  console.log('Question: Салом! Чӣ хел шумо?');
  console.log('Response:', response3 || '❌ No response\n');
  
  // Test 5: Intent detection
  console.log('\nTest 5: Intent detection...');
  const intent = Groq_detectIntent('Где моя посылка YT1234567890123?', 'ru');
  console.log('Message: Где моя посылка YT1234567890123?');
  console.log('Intent:', intent);
  
  // Test 6: Sentiment analysis
  console.log('\nTest 6: Sentiment analysis...');
  const sentiment = Groq_analyzeSentiment('Где мой груз?! Уже неделю жду!', 'ru');
  console.log('Message: Где мой груз?! Уже неделю жду!');
  console.log('Sentiment:', sentiment);
  
  console.log('\n=== Tests Complete ===');
  console.log('✅ If you see responses above, Groq is working!');
}
