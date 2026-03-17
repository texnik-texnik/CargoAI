/**
 * KHUROSON CARGO BOT - Groq AI Module (FREE Alternative to Gemini)
 * 
 * @file AI_Groq.gs
 * @description Free AI integration using Groq Cloud API (Llama 3, Mixtral, etc.)
 * 
 * SETUP:
 * 1. Get free API key: https://console.groq.com
 * 2. Add to Script Properties: GROQ_API_KEY=your_key_here
 * 3. Add to Script Properties: GROQ_MODEL=llama-3.1-70b-versatile
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/** @type {string} Groq API Key (add to Script Properties) */
const GROQ_API_KEY = PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');

/** @type {string} Default model (fast & powerful) */
const GROQ_MODEL = PropertiesService.getScriptProperties().getProperty('GROQ_MODEL') || 'llama-3.1-70b-versatile';

/** @type {number} Request timeout (ms) */
const GROQ_TIMEOUT = 30000;

// ============================================================================
// AI TEXT CHAT (Main Function)
// ============================================================================

/**
 * Send text to Groq AI for analysis (FREE!)
 * @param {string} userText - User's message text
 * @param {string} lang - Language code (tj/ru)
 * @returns {string|null} AI response or null on error
 */
function askGroqAI(userText, lang) {
  if (!GROQ_API_KEY) {
    Logger.log("GROQ: No API key configured");
    return null;
  }

  const systemPrompt = buildGroqSystemPrompt(lang);
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const payload = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText }
    ],
    temperature: 0.7,
    max_tokens: 500,
    top_p: 1,
    stream: false,
    stop: null
  };

  try {
    const response = callGroqAPI(url, payload);

    if (!response || !response.choices || !response.choices[0]) {
      Logger.log("GROQ: Invalid response");
      return null;
    }

    return response.choices[0].message.content;

  } catch (error) {
    logErrorToSheet("GROQ_AI", "Critical", error.toString());
    return null;
  }
}

// ============================================================================
// AI VISION ANALYSIS (Image Understanding)
// ============================================================================

/**
 * Analyze photo with Groq AI Vision (Llama 3.2 Vision - FREE!)
 * @param {string} fileId - Telegram photo file ID
 * @param {string} [caption] - Optional photo caption
 * @param {string} lang - Language code (tj/ru)
 * @returns {string|null} AI analysis or null on error
 */
function askGroqVision(fileId, caption, lang) {
  if (!GROQ_API_KEY) {
    return "Error: No API Key";
  }

  try {
    // 1. Get file info from Telegram
    const fileRes = TG.getFile(fileId);
    if (!fileRes.ok) {
      Logger.log(`GROQ_VISION: getFile failed - ${fileRes.description}`);
      return null;
    }

    // 2. Download photo
    const filePath = fileRes.result.file_path;
    const imageBlob = TG.downloadFile(filePath, TIMEOUT_FILE);

    if (!imageBlob) {
      Logger.log("GROQ_VISION: Failed to download photo");
      return null;
    }

    // 3. Convert to Base64
    const base64Image = Utilities.base64Encode(imageBlob.getBytes());
    const mimeType = imageBlob.getContentType() || 'image/jpeg';

    // 4. Prepare API request (Llama 3.2 Vision)
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const systemPrompt = buildGroqVisionPrompt(lang);

    const payload = {
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: caption || 'Что на этом изображении?' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
          ]
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    };

    // 5. Call Groq API
    const response = callGroqAPI(url, payload);

    if (!response || !response.choices || !response.choices[0]) {
      return null;
    }

    return response.choices[0].message.content;

  } catch (error) {
    Logger.log(`GROQ_VISION error: ${error.toString()}`);
    return null;
  }
}

// ============================================================================
// AI TRACK CODE EXTRACTION
// ============================================================================

/**
 * Extract track code from photo using Groq Vision (FREE!)
 * @param {string} fileId - Telegram photo file ID
 * @returns {{code: string|null, confidence: number, note: string}}
 */
function Groq_extractTrackCode(fileId) {
  if (!GROQ_API_KEY) {
    return {code: null, confidence: 0, note: "No API key"};
  }

  try {
    const fileRes = TG.getFile(fileId);
    if (!fileRes.ok) return {code: null, confidence: 0, note: "Failed to get file"};

    const filePath = fileRes.result.file_path;
    const imageBlob = TG.downloadFile(filePath, TIMEOUT_FILE);
    const base64Image = Utilities.base64Encode(imageBlob.getBytes());
    const mimeType = imageBlob.getContentType() || 'image/jpeg';

    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const prompt = `Find the tracking code in this image. Tracking codes look like:
- YT1234567890123 (15 chars, starts with YT or JT)
- JT1234567890123
- 123456789012345 (13-15 digits)

If you see a tracking code, reply with ONLY the code.
If no tracking code visible, reply "NOT_FOUND".

Image may be: screenshot, handwritten, receipt, label.`;

    const payload = {
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 50
    };

    const response = callGroqAPI(url, payload);

    if (!response) return {code: null, confidence: 0, note: "AI error"};

    const aiText = response.choices[0].message.content.trim().toUpperCase();
    const codeMatch = aiText.match(/\b(YT|JT)[A-Z0-9]{13}\b|\b\d{13,15}\b/);

    if (codeMatch) {
      return {code: codeMatch[0], confidence: 0.9, note: "Extracted by Groq AI"};
    }

    if (aiText.includes("NOT_FOUND")) {
      return {code: null, confidence: 1.0, note: "No track code visible"};
    }

    return {code: null, confidence: 0.3, note: "Uncertain: " + aiText.substring(0, 50)};

  } catch (error) {
    logErrorToSheet("GROQ_EXTRACT", error.toString(), "");
    return {code: null, confidence: 0, note: "Error"};
  }
}

// ============================================================================
// AI INTENT DETECTION
// ============================================================================

/**
 * Detect user intent using Groq AI (FREE!)
 * @param {string} message - User message
 * @param {string} lang - Language code
 * @returns {{intent: string, confidence: number, data: Object}}
 */
function Groq_detectIntent(message, lang) {
  if (!GROQ_API_KEY) {
    return {intent: "GENERAL_QUESTION", confidence: 0.5, data: {}};
  }

  const intents = [
    "CHECK_TRACK", "REGISTER", "GET_ADDRESS_CHINA", "GET_ADDRESS_KHUROSON",
    "GET_PRICE", "COMPLAINT", "THANK_YOU", "HUMAN_OPERATOR",
    "CARGO_PHOTO", "GENERAL_QUESTION"
  ];

  try {
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const prompt = `Analyze this customer message for Khuroson Cargo delivery service.

Message: "${message}"

Detect intent from: ${intents.join(', ')}

Reply ONLY with JSON:
{
  "intent": "intent_name",
  "confidence": 0.0-1.0,
  "data": {
    "trackCode": "code if found",
    "emotion": "positive/neutral/negative",
    "urgency": "low/medium/high"
  }
}

Language: ${lang === 'tj' ? 'Tajik' : 'Russian'}`;

    const payload = {
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 150
    };

    const response = callGroqAPI(url, payload);

    if (!response) return {intent: "GENERAL_QUESTION", confidence: 0.5, data: {}};

    const jsonText = response.choices[0].message.content;
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {intent: "GENERAL_QUESTION", confidence: 0.5, data: {}};

  } catch (error) {
    return {intent: "GENERAL_QUESTION", confidence: 0.5, data: {}};
  }
}

// ============================================================================
// AI SENTIMENT ANALYSIS
// ============================================================================

/**
 * Detect if customer is angry using Groq AI (FREE!)
 * @param {string} message - User message
 * @param {string} lang - Language code
 * @returns {{sentiment: string, score: number, needsHuman: boolean}}
 */
function Groq_analyzeSentiment(message, lang) {
  if (!GROQ_API_KEY) {
    return {sentiment: "neutral", score: 0.5, needsHuman: false};
  }

  try {
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const prompt = `Analyze customer emotion.

Message: "${message}"

Determine:
- sentiment: "positive", "neutral", "negative", "angry"
- score: 0.0-1.0 (intensity)
- needsHuman: true if customer is angry or very upset

Reply JSON: {"sentiment": "...", "score": 0.0, "needsHuman": true/false}`;

    const payload = {
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 100
    };

    const response = callGroqAPI(url, payload);

    if (!response) return {sentiment: "neutral", score: 0.5, needsHuman: false};

    const jsonMatch = response.choices[0].message.content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {sentiment: "neutral", score: 0.5, needsHuman: false};

  } catch (error) {
    return {sentiment: "neutral", score: 0.5, needsHuman: false};
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build system prompt for Groq AI
 * @param {string} lang - Language code
 * @returns {string}
 */
function buildGroqSystemPrompt(lang) {
  return `Ты оператор поддержки "Khuroson Cargo".

📋 ДАННЫЕ КОМПАНИИ:
- Адрес ТЧ (Хуросон): ${CONFIG.ADDR_KHUROSON}
- Адрес Китай: Клиенту нужно нажать кнопку "Адрес Китай" в меню
- Тариф: ${CONFIG.PRICE_KG} за кг, ${CONFIG.PRICE_M3} за куб
- Админ: ${CONFIG.ADMIN_LINK}

📝 ПРАВИЛА:
1. Отвечай на ${lang === 'tj' ? 'Таджикском' : 'Русском'} языке
2. Будь краток (максимум 5 предложений)
3. Если спрашивают "Где груз?" → отправь в меню "Проверить трек"
4. Если вопрос не по теме карго → вежливо скажи, что ты помощник Khuroson Cargo
5. Не выдумывай информацию, если не знаешь → предложи связаться с админом`;
}

/**
 * Build system prompt for Groq Vision
 * @param {string} lang - Language code
 * @returns {string}
 */
function buildGroqVisionPrompt(lang) {
  return `Ты эксперт по закупкам из Китая. Проанализируй фото товара.
Язык ответа: ${lang === 'tj' ? 'Таджикский' : 'Русский'}.

Формат:
- Товар: что на фото
- Риски: хрупкое, требования к упаковке
- Совет: рекомендации по заказу
- Доверие: оценка продавца

Отвечай кратко (3-5 предложений).`;
}

/**
 * Call Groq API with error handling
 * @param {string} url - API endpoint
 * @param {Object} payload - Request payload
 * @returns {Object|null} Parsed response
 */
function callGroqAPI(url, payload) {
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      timeout: GROQ_TIMEOUT
    });

    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (!responseText) {
      Logger.log("Groq API: Empty response");
      return null;
    }

    const json = JSON.parse(responseText);

    if (json.error) {
      logErrorToSheet("GROQ_API", "API Error", json.error.message);
      return null;
    }

    return json;

  } catch (error) {
    Logger.log(`Groq API error: ${error.toString()}`);
    return null;
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Example: Replace Gemini with Groq in Main.gs
 * 
 * BEFORE (Gemini - paid):
 * const response = askAiText(userMessage, lang);
 * 
 * AFTER (Groq - FREE):
 * const response = askGroqAI(userMessage, lang);
 * 
 * Same function signature, just different name!
 */
