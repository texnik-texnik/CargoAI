#!/bin/bash
# Test Groq AI directly from terminal
# Usage: ./test-groq.sh

# Get Groq API key from environment or prompt
if [ -z "$GROQ_API_KEY" ]; then
    echo "Enter your Groq API key (starts with gsk_...):"
    read -r GROQ_API_KEY
fi

if [ -z "$GROQ_API_KEY" ]; then
    echo "❌ API key required!"
    exit 1
fi

echo "=== GROQ AI TEST ==="
echo ""

# Test 1: Simple greeting
echo "Test 1: Russian greeting"
echo "Q: Привет! Как дела?"

RESPONSE=$(curl -s -X POST https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.1-70b-versatile",
    "messages": [
      {"role": "system", "content": "Ты помощник. Отвечай кратко."},
      {"role": "user", "content": "Привет! Как дела?"}
    ],
    "temperature": 0.7,
    "max_tokens": 100
  }' | grep -oP '"content":\s*"\K[^"]+' | head -1)

echo "A: $RESPONSE"
echo ""

# Test 2: Cargo question
echo "Test 2: Cargo pricing"
echo "Q: Сколько стоит 10 кг из Китая?"

RESPONSE=$(curl -s -X POST https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.1-70b-versatile",
    "messages": [
      {"role": "system", "content": "Ты помощник Khuroson Cargo. Тариф: 25 сомони/кг."},
      {"role": "user", "content": "Сколько стоит доставка 10 кг из Китая?"}
    ],
    "temperature": 0.7,
    "max_tokens": 100
  }' | grep -oP '"content":\s*"\K[^"]+' | head -1)

echo "A: $RESPONSE"
echo ""

echo "=== TESTS COMPLETE ==="
echo "✅ If you see responses above, Groq is working!"
