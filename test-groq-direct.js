#!/usr/bin/env node
/**
 * Test Groq AI directly with Node.js
 * This bypasses gas-fakes and tests Groq API directly
 * 
 * Usage: node test-groq-direct.js
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not set!');
  console.error('Set it: export GROQ_API_KEY=gsk_your_key_here');
  process.exit(1);
}

async function testGroq() {
  console.log('=== GROQ AI DIRECT TEST ===\n');
  
  const tests = [
    {
      name: 'Russian greeting',
      message: 'Привет! Как дела?',
      model: 'llama-3.1-70b-versatile'
    },
    {
      name: 'Cargo question',
      message: 'Сколько стоит доставка 10 кг из Китая?',
      model: 'llama-3.1-70b-versatile'
    },
    {
      name: 'Tajik greeting',
      message: 'Салом! Чӣ хел шумо?',
      model: 'llama-3.1-70b-versatile'
    },
    {
      name: 'Intent detection',
      message: 'Где моя посылка YT1234567890123?',
      model: 'llama-3.1-70b-versatile',
      system: 'Detect intent. Reply JSON: {"intent": "...", "confidence": 0.0}'
    }
  ];
  
  for (const test of tests) {
    console.log(`Test: ${test.name}`);
    console.log(`Q: ${test.message}`);
    
    try {
      const response = await callGroq(test.message, test.model, test.system);
      console.log(`A: ${response}\n`);
    } catch (error) {
      console.error(`❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('=== TESTS COMPLETE ===');
}

async function callGroq(message, model, systemPrompt) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  
  const payload = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt || 'Ты помощник Khuroson Cargo. Отвечай кратко.' },
      { role: 'user', content: message }
    ],
    temperature: 0.7,
    max_tokens: 500
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message);
  }
  
  return data.choices[0].message.content;
}

// Run tests
testGroq().catch(console.error);
