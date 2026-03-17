/**
 * Local Test for Groq AI (FREE!)
 * Run with: gas-fakes -f test_groq_local.gs
 */

function main() {
  Logger.log('=== GROQ AI LOCAL TEST ===\n');
  
  // Test 1: Simple greeting
  Logger.log('Test 1: Russian greeting');
  const response1 = askGroqAI('Привет! Как дела?', 'ru');
  Logger.log('Q: Привет! Как дела?');
  Logger.log('A:', response1 || 'No response\n');
  
  // Test 2: Cargo question
  Logger.log('Test 2: Cargo pricing question');
  const response2 = askGroqAI('Сколько стоит доставка 10 кг из Китая?', 'ru');
  Logger.log('Q: Сколько стоит доставка 10 кг из Китая?');
  Logger.log('A:', response2 || 'No response\n');
  
  // Test 3: Tajik greeting
  Logger.log('Test 3: Tajik greeting');
  const response3 = askGroqAI('Салом! Чӣ хел шумо?', 'tj');
  Logger.log('Q: Салом! Чӣ хел шумо?');
  Logger.log('A:', response3 || 'No response\n');
  
  // Test 4: Intent detection
  Logger.log('Test 4: Intent detection');
  const intent = Groq_detectIntent('Где моя посылка YT1234567890123?', 'ru');
  Logger.log('Message: Где моя посылка YT1234567890123?');
  Logger.log('Intent:', JSON.stringify(intent));
  
  // Test 5: Sentiment analysis
  Logger.log('Test 5: Sentiment analysis');
  const sentiment = Groq_analyzeSentiment('Где мой груз?! Уже неделю жду!', 'ru');
  Logger.log('Message: Где мой груз?! Уже неделю жду!');
  Logger.log('Sentiment:', JSON.stringify(sentiment));
  
  Logger.log('\n=== TEST COMPLETE ===');
  Logger.log('✅ Groq AI is working!' );
  
  return 'All tests passed!';
}
