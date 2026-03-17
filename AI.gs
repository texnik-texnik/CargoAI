/**
 * KHUROSON CARGO BOT - AI Module
 * 
 * @file AI.gs
 * @description Google Gemini AI integration for text, vision, and voice
 */

// ============================================================================
// AI TEXT ANALYSIS
// ============================================================================

/**
 * Send text to Gemini AI for analysis
 * @param {string} userText - User's message text
 * @param {string} lang - Language code (tj/ru)
 * @returns {string|null} AI response or null on error
 */
function askAiText(userText, lang) {
  const apiKey = CONFIG.GEMINI_API_KEY;
  const model = CONFIG.GEMINI_MODEL;

  if (!apiKey) {
    Logger.log("AI_TEXT: No API key configured");
    return null;
  }

  const systemPrompt = buildSystemPrompt(lang);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{
      role: "user",
      parts: [{ text: `${systemPrompt}\n\nКлиент: ${userText}` }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500
    }
  };

  try {
    const response = callGeminiAPI(url, payload, TIMEOUT_AI);
    
    if (!response) {
      return null;
    }

    return response.candidates[0].content.parts[0].text;

  } catch (error) {
    logErrorToSheet("AI_TEXT", "Critical", error.toString());
    return null;
  }
}

// ============================================================================
// AI VISION ANALYSIS
// ============================================================================

/**
 * Analyze photo with Gemini AI Vision
 * @param {string} fileId - Telegram photo file ID
 * @param {string} [caption] - Optional photo caption
 * @param {string} lang - Language code (tj/ru)
 * @returns {string|null} AI analysis or null on error
 */
function askAiVision(fileId, caption, lang) {
  const apiKey = CONFIG.GEMINI_API_KEY;
  const model = CONFIG.GEMINI_MODEL;

  if (!apiKey) {
    return "Error: No API Key";
  }

  try {
    // 1. Get file info from Telegram
    const fileRes = TG.getFile(fileId);
    if (!fileRes.ok) {
      Logger.log(`AI_VISION: getFile failed - ${fileRes.description}`);
      return null;
    }

    // 2. Download photo
    const filePath = fileRes.result.file_path;
    const imageBlob = TG.downloadFile(filePath, TIMEOUT_FILE);
    
    if (!imageBlob) {
      Logger.log("AI_VISION: Failed to download photo");
      return null;
    }

    // 3. Convert to Base64
    const base64Image = Utilities.base64Encode(imageBlob.getBytes());

    // 4. Prepare API request
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const systemPrompt = `Ты эксперт по закупкам из Китая. Проанализируй фото товара на языке: ${lang === 'tj' ? 'Таджикский' : 'Русский'}.
    Формат ответа:
    - Товар: что на фото
    - Риски: хрупкое, требования к упаковке
    - Совет: рекомендации по заказу
    - Доверие: оценка продавца
    
    Отвечай кратко (3-5 предложений).`;

    const payload = {
      contents: [{
        parts: [
          { text: systemPrompt + (caption ? `\nКонтекст: ${caption}` : "") },
          { inline_data: { mime_type: "image/jpeg", data: base64Image } }
        ]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500
      }
    };

    // 5. Call Gemini API
    const response = callGeminiAPI(url, payload, TIMEOUT_AI * 2); // Extra time for image
    
    if (!response) {
      return null;
    }

    return response.candidates[0].content.parts[0].text;

  } catch (error) {
    Logger.log(`AI_VISION error: ${error.toString()}`);
    return null;
  }
}

// ============================================================================
// AI VOICE TRANSCRIPTION
// ============================================================================

/**
 * Transcribe and analyze voice message with Gemini AI
 * @param {string} fileId - Telegram voice file ID
 * @param {string} lang - Language code (tj/ru)
 * @returns {string|null} AI response or null on error
 */
function askAiVoice(fileId, lang) {
  const apiKey = CONFIG.GEMINI_API_KEY;
  const model = CONFIG.GEMINI_MODEL;

  if (!apiKey) {
    logErrorToSheet("AI_VOICE", "No API Key", "GOOGLE_API_KEY not set");
    return null;
  }

  try {
    // 1. Get file info
    const fileRes = TG.getFile(fileId);
    if (!fileRes.ok) {
      logErrorToSheet("AI_VOICE", "getFile failed", JSON.stringify(fileRes));
      return null;
    }

    const filePath = fileRes.result.file_path;
    const fileSize = fileRes.result.file_size || 0;

    // 2. Check file size (limit: 10MB for GAS)
    if (fileSize > 10 * 1024 * 1024) {
      logErrorToSheet("AI_VOICE", "File too large", `${fileSize} bytes`);
      return lang === 'ru'
        ? "⚠️ Аудио слишком длинное (макс. ~3 мин)."
        : "⚠️ Аудио хеле дароз аст (макс. ~3 дақиқа).";
    }

    // 3. Download audio file
    const audioBlob = TG.downloadFile(filePath, TIMEOUT_FILE);
    if (!audioBlob) {
      Logger.log("AI_VOICE: Failed to download audio");
      return null;
    }

    // 4. Determine MIME type
    const mimeType = detectMimeType(filePath);

    // 5. Convert to Base64
    const base64Audio = Utilities.base64Encode(audioBlob.getBytes());

    // 6. Build system prompt
    const systemPrompt = buildVoiceSystemPrompt(lang);

    // 7. Prepare API request
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{
        parts: [
          { text: systemPrompt },
          { inline_data: { mime_type: mimeType, data: base64Audio } }
        ]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500
      }
    };

    // 8. Call Gemini API with retry
    const response = callGeminiAPIWithRetry(url, payload, TIMEOUT_AI * 3, 2);

    if (!response) {
      return null;
    }

    // 9. Check response
    if (!response.candidates || !response.candidates[0]) {
      logErrorToSheet("AI_VOICE", "No candidates", JSON.stringify(response));
      return null;
    }

    const candidate = response.candidates[0];

    // Check for safety block
    if (candidate.finishReason === "SAFETY") {
      return lang === 'ru'
        ? "⚠️ Не могу обработать это сообщение."
        : "⚠️ Ин паёмро коркард карда наметавонам.";
    }

    return candidate.content.parts[0].text;

  } catch (error) {
    logErrorToSheet("AI_VOICE", "Critical Error", error.toString());
    return null;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build system prompt for text AI
 * @param {string} lang - Language code
 * @returns {string}
 */
function buildSystemPrompt(lang) {
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
 * Build system prompt for voice AI
 * @param {string} lang - Language code
 * @returns {string}
 */
function buildVoiceSystemPrompt(lang) {
  return `Ты — голосовой помощник службы доставки "Khuroson Cargo".

📋 ТВОИ ДАННЫЕ:
- Адрес склада в Таджикистане: ${CONFIG.ADDR_KHUROSON}
- Адрес в Китае: клиенту нужно нажать кнопку "Адрес Китай" в меню
- Тариф: ${CONFIG.PRICE_KG} за кг, ${CONFIG.PRICE_M3} за куб
- Связь с админом: ${CONFIG.ADMIN_LINK}

📝 ИНСТРУКЦИИ:
1. Прослушай голосовое сообщение клиента
2. Пойми суть вопроса (даже если речь нечёткая или с акцентом)
3. Ответь КРАТКО (2-4 предложения) на языке: ${lang === 'tj' ? 'ТАДЖИКСКОМ' : 'РУССКОМ'}
4. Если спрашивают "где посылка/трек" — скажи нажать кнопку "Проверить трек"
5. Если вопрос не по теме карго — вежливо скажи, что ты помощник Khuroson Cargo

🗣️ ФОРМАТ ОТВЕТА:
Вы спросили: [суть вопроса]
Ответ: [твой ответ]`;
}

/**
 * Detect MIME type from file path
 * @param {string} filePath - Telegram file path
 * @returns {string}
 */
function detectMimeType(filePath) {
  if (filePath.endsWith(".mp3")) return "audio/mpeg";
  if (filePath.endsWith(".m4a")) return "audio/mp4";
  if (filePath.endsWith(".wav")) return "audio/wav";
  if (filePath.endsWith(".mp4")) return "video/mp4";
  if (filePath.endsWith(".ogg")) return "audio/ogg";
  return "audio/ogg"; // Default for voice messages
}

/**
 * Call Gemini API with error handling
 * @param {string} url - API endpoint URL
 * @param {Object} payload - Request payload
 * @param {number} timeout - Request timeout in ms
 * @returns {Object|null} Parsed response or null on error
 */
function callGeminiAPI(url, payload, timeout) {
  try {
    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      timeout: timeout
    });

    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (!responseText) {
      Logger.log("Gemini API: Empty response");
      return null;
    }

    const json = JSON.parse(responseText);

    // Check for API error
    if (json.error) {
      logErrorToSheet("GEMINI_API", "API Error", json.error.message);
      return null;
    }

    // Check for empty response
    if (!json.candidates || !json.candidates[0]) {
      Logger.log("Gemini API: No candidates in response");
      return null;
    }

    return json;

  } catch (error) {
    Logger.log(`Gemini API error: ${error.toString()}`);
    return null;
  }
}

/**
 * Call Gemini API with retry logic
 * @param {string} url - API endpoint URL
 * @param {Object} payload - Request payload
 * @param {number} timeout - Request timeout in ms
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Object|null} Parsed response or null on error
 */
function callGeminiAPIWithRetry(url, payload, timeout, maxRetries) {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = callGeminiAPI(url, payload, timeout);
    
    if (response) {
      return response;
    }

    lastError = "API call failed";

    // Exponential backoff before retry
    if (attempt < maxRetries) {
      const delay = 1000 * Math.pow(2, attempt);
      Logger.log(`Gemini API retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      Utilities.sleep(delay);
    }
  }

  logErrorToSheet("GEMINI_API", "Retry Exhausted", lastError);
  return null;
}
