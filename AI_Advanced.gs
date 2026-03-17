/**
 * KHUROSON CARGO BOT - Advanced AI Features
 * 
 * @file AI_Advanced.gs
 * @description Deep AI integration for cargo/logistics automation
 */

// ============================================================================
// 1. AI TRACK CODE EXTRACTION FROM PHOTOS
// ============================================================================

/**
 * Extract track code from ANY photo (handwritten, printed, screenshot)
 * More flexible than OCR - AI understands context
 * 
 * @param {string} fileId - Telegram photo file ID
 * @returns {{code: string|null, confidence: number, note: string}}
 */
function AI_extractTrackCode(fileId) {
  const apiKey = CONFIG.GEMINI_API_KEY;
  const model = CONFIG.GEMINI_MODEL;
  
  try {
    // Download photo
    const fileRes = TG.getFile(fileId);
    if (!fileRes.ok) return {code: null, confidence: 0, note: "Failed to get file"};
    
    const filePath = fileRes.result.file_path;
    const imageBlob = TG.downloadFile(filePath, TIMEOUT_FILE);
    const base64Image = Utilities.base64Encode(imageBlob.getBytes());
    
    // AI prompt for track code extraction
    const prompt = `Анализируй это изображение. Найди трек-код для отслеживания груза.
    
Треки обычно выглядят так:
- YT1234567890123 (15 символов, начинается с YT или JT)
- JT1234567890123
- 123456789012345 (13-15 цифр)

Если видишь трек-код - напиши ТОЛЬКО код, без лишних слов.
Если не видишь трек-код - напиши "NOT_FOUND".

Изображение может быть: фото экрана, скриншот, рукописный текст, чек, этикетка.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: "image/jpeg", data: base64Image } }
        ]
      }],
      generationConfig: {
        temperature: 0.1, // Low temp for precise extraction
        maxOutputTokens: 50
      }
    };
    
    const response = callGeminiAPI(url, payload, TIMEOUT_AI);
    
    if (!response) return {code: null, confidence: 0, note: "AI error"};
    
    const aiText = response.candidates[0].content.parts[0].text.trim().toUpperCase();
    
    // Extract code from AI response
    const codeMatch = aiText.match(/\b(YT|JT)[A-Z0-9]{13}\b|\b\d{13,15}\b/);
    
    if (codeMatch) {
      return {
        code: codeMatch[0],
        confidence: 0.9,
        note: "Extracted by AI"
      };
    }
    
    if (aiText.includes("NOT_FOUND") || aiText.includes("НЕТ")) {
      return {code: null, confidence: 1.0, note: "No track code visible in image"};
    }
    
    return {code: null, confidence: 0.3, note: "Uncertain: " + aiText.substring(0, 50)};
    
  } catch (error) {
    logErrorToSheet("AI_EXTRACT_CODE", error.toString(), "");
    return {code: null, confidence: 0, note: "Error: " + error.message};
  }
}

// ============================================================================
// 2. AI CARGO CLASSIFICATION & PRICING
// ============================================================================

/**
 * Analyze cargo photo and suggest pricing category
 * 
 * @param {string} fileId - Photo file ID
 * @param {string} lang - Language code
 * @returns {{category: string, pricePerKg: string, notes: string[], fragile: boolean}}
 */
function AI_classifyCargo(fileId, lang) {
  const apiKey = CONFIG.GEMINI_API_KEY;
  const model = CONFIG.GEMINI_MODEL;
  
  try {
    const fileRes = TG.getFile(fileId);
    if (!fileRes.ok) return null;
    
    const filePath = fileRes.result.file_path;
    const imageBlob = TG.downloadFile(filePath, TIMEOUT_FILE);
    const base64Image = Utilities.base64Encode(imageBlob.getBytes());
    
    const prompt = `Анализируй товар на фото для транспортной компании Khuroson Cargo.
    
Определи:
1. Категория товара (одежда, электроника, запчасти, продукты, хрупкое, опасное)
2. Нужно ли спецусловия (хрупкое, требует особой упаковки)
3. Рекомендуемая цена за кг (обычная: ${CONFIG.PRICE_KG}, хрупкое: +20%, опасное: +50%)
4. Можно ли перевозить (запрещенные товары)

Ответь в формате JSON:
{
  "category": "категория",
  "fragile": true/false,
  "hazardous": true/false,
  "allowed": true/false,
  "priceModifier": 1.0,
  "notes": ["заметка 1", "заметка 2"]
}

Язык ответа: ${lang === 'tj' ? 'Таджикский' : 'Русский'}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: "image/jpeg", data: base64Image } }
        ]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 300
      }
    };
    
    const response = callGeminiAPI(url, payload, TIMEOUT_AI);
    
    if (!response) return null;
    
    const jsonText = response.candidates[0].content.parts[0].text;
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
    
  } catch (error) {
    logErrorToSheet("AI_CLASSIFY", error.toString(), "");
    return null;
  }
}

// ============================================================================
// 3. AI CUSTOMER INTENT DETECTION
// ============================================================================

/**
 * Detect what the customer wants (beyond simple keywords)
 * 
 * @param {string} message - User message
 * @param {string} lang - Language code
 * @returns {{intent: string, confidence: number, data: Object}}
 */
function AI_detectIntent(message, lang) {
  const apiKey = CONFIG.GEMINI_API_KEY;
  const model = "gemini-1.5-flash"; // Fast model for intent
  
  const intents = [
    "CHECK_TRACK",           // Where is my package?
    "REGISTER",              // I want to register
    "GET_ADDRESS_CHINA",     // Need China address
    "GET_ADDRESS_KHUROSON",  // Need local address  
    "GET_PRICE",             // How much does it cost?
    "COMPLAINT",             // Something is wrong
    "THANK_YOU",             // Positive feedback
    "HUMAN_OPERATOR",        // Want to talk to human
    "CARGO_PHOTO",           // Sending cargo photo
    "GENERAL_QUESTION"        // Other question
  ];
  
  try {
    const prompt = `Анализируй сообщение клиента службы доставки Khuroson Cargo.
    
Сообщение: "${message}"

Определи намерение (intent) из списка:
${intents.join(', ')}

Ответь ТОЛЬКО JSON:
{
  "intent": "название_намерения",
  "confidence": 0.0-1.0,
  "data": {
    "trackCode": "трек-код если есть",
    "emotion": "positive/neutral/negative",
    "urgency": "low/medium/high"
  }
}

Язык анализа: ${lang === 'tj' ? 'Таджикский' : 'Русский'}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 150
      }
    };
    
    const response = callGeminiAPI(url, payload, 10000); // Fast timeout
    
    if (!response) return {intent: "GENERAL_QUESTION", confidence: 0.5, data: {}};
    
    const jsonText = response.candidates[0].content.parts[0].text;
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {intent: "GENERAL_QUESTION", confidence: 0.5, data: {}};
    
  } catch (error) {
    logErrorToSheet("AI_INTENT", error.toString(), "");
    return {intent: "GENERAL_QUESTION", confidence: 0.5, data: {}};
  }
}

// ============================================================================
// 4. AI SMART RESPONSE GENERATOR
// ============================================================================

/**
 * Generate contextual response based on conversation history
 * 
 * @param {string} userId - User ID
 * @param {string} message - Current message
 * @param {string[]} history - Last 5 messages
 * @param {string} lang - Language code
 * @returns {string} AI-generated response
 */
function AI_generateResponse(userId, message, history, lang) {
  const apiKey = CONFIG.GEMINI_API_KEY;
  const model = CONFIG.GEMINI_MODEL;
  
  // Get user data for context
  const user = DB.getUser(userId);
  const userName = user ? user.name : "Клиент";
  const clientId = user ? user.clientId : "N/A";
  
  try {
    const prompt = `Ты оператор поддержки Khuroson Cargo. Отвечай клиенту.

📋 ИНФОРМАЦИЯ О КЛИЕНТЕ:
- Имя: ${userName}
- Код клиента: ${clientId}
- Язык: ${lang === 'tj' ? 'Таджикский' : 'Русский'}

📦 ДАННЫЕ КОМПАНИИ:
- Адрес ТЧ: ${CONFIG.ADDR_KHUROSON}
- Адрес Китай: ${CONFIG.ADDR_CHINA}-[clientId]-[name]-[phone]
- Тарифы: ${CONFIG.PRICE_KG}/кг, ${CONFIG.PRICE_M3}/куб
- Админ: ${CONFIG.ADMIN_LINK}

💬 ИСТОРИЯ ДИАЛОГА:
${history.slice(-5).join('\n')}

📨 ТЕКУЩЕЕ СООБЩЕНИЕ: ${message}

📝 ПРАВИЛА ОТВЕТА:
1. Отвечай на ${lang === 'tj' ? 'Таджикском' : 'Русском'}
2. Будь дружелюбным, но профессиональным
3. Используй эмодзи (умеренно)
4. Если не знаешь → предложи админа
5. Максимум 5 предложений

Ответ:`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 400
      }
    };
    
    const response = callGeminiAPI(url, payload, TIMEOUT_AI);
    
    if (!response) {
      // Fallback to basic response
      return lang === 'ru' 
        ? "Спасибо за сообщение. Оператор скоро ответит." 
        : "Ташаккур барои паём. Оператор ба наздикӣ ҷавоб медиҳад.";
    }
    
    return response.candidates[0].content.parts[0].text;
    
  } catch (error) {
    logErrorToSheet("AI_RESPONSE", error.toString(), "");
    return null;
  }
}

// ============================================================================
// 5. AI DOCUMENT SCANNER (INVOICE/PACKING LIST)
// ============================================================================

/**
 * Extract data from invoice/packing list photos
 * 
 * @param {string} fileId - Photo file ID
 * @returns {{items: Array, totalValue: number, weight: string, supplier: string}}
 */
function AI_scanInvoice(fileId) {
  const apiKey = CONFIG.GEMINI_API_KEY;
  const model = CONFIG.GEMINI_MODEL;
  
  try {
    const fileRes = TG.getFile(fileId);
    if (!fileRes.ok) return null;
    
    const filePath = fileRes.result.file_path;
    const imageBlob = TG.downloadFile(filePath, TIMEOUT_FILE);
    const base64Image = Utilities.base64Encode(imageBlob.getBytes());
    
    const prompt = `Анализируй фото документа (накладная, инвойс, packing list).
    
Извлеки данные:
1. Список товаров (название, количество, цена)
2. Общая стоимость
3. Вес (если указан)
4. Поставщик (название компании)
5. Дата документа

Ответь в формате JSON:
{
  "items": [{"name": "товар", "qty": 10, "price": 50}],
  "totalValue": 500,
  "weight": "5 кг",
  "supplier": "Название компании",
  "date": "2026-03-17",
  "currency": "USD/CNY"
}

Если какое-то поле не найдено - поставь null.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: "image/jpeg", data: base64Image } }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500
      }
    };
    
    const response = callGeminiAPI(url, payload, TIMEOUT_AI * 2);
    
    if (!response) return null;
    
    const jsonText = response.candidates[0].content.parts[0].text;
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
    
  } catch (error) {
    logErrorToSheet("AI_INVOICE", error.toString(), "");
    return null;
  }
}

// ============================================================================
// 6. AI SENTIMENT ANALYSIS (ANGRY DETECTOR)
// ============================================================================

/**
 * Detect if customer is angry/frustrated
 * 
 * @param {string} message - User message
 * @param {string} lang - Language code
 * @returns {{sentiment: string, score: number, needsHuman: boolean}}
 */
function AI_analyzeSentiment(message, lang) {
  const apiKey = CONFIG.GEMINI_API_KEY;
  const model = "gemini-1.5-flash";
  
  try {
    const prompt = `Анализируй эмоциональное состояние клиента.
    
Сообщение: "${message}"

Определи:
- sentiment: "positive", "neutral", "negative", "angry"
- score: 0.0-1.0 (насколько сильный)
- needsHuman: true если клиент зол или очень расстроен

Ответь JSON:
{"sentiment": "...", "score": 0.0, "needsHuman": true/false}

Язык: ${lang === 'tj' ? 'Таджикский' : 'Русский'}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 100
      }
    };
    
    const response = callGeminiAPI(url, payload, 10000);
    
    if (!response) return {sentiment: "neutral", score: 0.5, needsHuman: false};
    
    const jsonMatch = response.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {sentiment: "neutral", score: 0.5, needsHuman: false};
    
  } catch (error) {
    return {sentiment: "neutral", score: 0.5, needsHuman: false};
  }
}

// ============================================================================
// 7. AI AUTO-TRANSLATION (TJ ↔ RU ↔ ZH)
// ============================================================================

/**
 * Translate text between Tajik, Russian, Chinese
 * 
 * @param {string} text - Text to translate
 * @param {string} fromLang - Source language (tj/ru/zh)
 * @param {string} toLang - Target language (tj/ru/zh)
 * @returns {string} Translated text
 */
function AI_translate(text, fromLang, toLang) {
  const apiKey = CONFIG.GEMINI_API_KEY;
  const model = "gemini-1.5-flash";
  
  const langNames = {
    tj: 'Таджикский',
    ru: 'Русский', 
    zh: 'Китайский (упрощенный)'
  };
  
  try {
    const prompt = `Переведи текст с ${langNames[fromLang]} на ${langNames[toLang]}.
    
Текст: "${text}"

Контекст: транспортная компания Khuroson Cargo (грузы из Китая).

Переведи ТОЛЬКО текст, без пояснений.
Сохраняй имена собственные и трек-коды без изменений.

Перевод:`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500
      }
    };
    
    const response = callGeminiAPI(url, payload, 15000);
    
    if (!response) return text; // Return original on error
    
    return response.candidates[0].content.parts[0].text;
    
  } catch (error) {
    logErrorToSheet("AI_TRANSLATE", error.toString(), "");
    return text;
  }
}

// ============================================================================
// USAGE EXAMPLES FOR Main.gs
// ============================================================================

/**
 * Example: Enhanced message handler with AI
 * Add this to Main.gs
 */
function AI_enhancedHandler(userId, chatId, text, lang) {
  const L = getLocalization(lang);
  
  // 1. Detect intent
  const intent = AI_detectIntent(text, lang);
  
  // 2. Check sentiment
  const sentiment = AI_analyzeSentiment(text, lang);
  
  // 3. If angry customer → alert admin
  if (sentiment.needsHuman) {
    TG.sendMessage(
      CONFIG.ADMIN_IDS[0],
      `⚠️ <b>Расстроенный клиент!</b>\n\n` +
      `ID: ${userId}\n` +
      `Сообщение: ${text}\n` +
      `Эмоция: ${sentiment.sentiment} (${sentiment.score})`
    );
  }
  
  // 4. Handle by intent
  switch (intent.intent) {
    case 'CHECK_TRACK':
      const code = intent.data.trackCode;
      if (code) {
        const results = SearchEngine.find([code]);
        // ... send results
      }
      break;
      
    case 'COMPLAINT':
      // Generate empathetic response
      const response = AI_generateResponse(userId, text, [], lang);
      TG.sendMessage(chatId, response);
      break;
      
    case 'HUMAN_OPERATOR':
      TG.sendMessage(chatId, L.btn_admin);
      break;
      
    default:
      // Use AI for general questions
      const aiResponse = AI_generateResponse(userId, text, [], lang);
      if (aiResponse) {
        TG.sendMessage(chatId, aiResponse);
      } else {
        // Fallback to menu
        showMainMenu(chatId, lang);
      }
  }
}
