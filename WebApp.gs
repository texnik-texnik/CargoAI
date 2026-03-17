/**
 * KHUROSON CARGO BOT - Web App
 * 
 * @file WebApp.gs
 * @description Web App interface for profile management and track search
 */

// ============================================================================
// WEB APP ENTRY POINT
// ============================================================================

/**
 * Handle GET requests to Web App
 * @param {GoogleAppsScript.Events.DoGet} e - Event object
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet(e) {
  try {
    const template = HtmlService.createTemplateFromFile('KhurosonCarAIminiApp');
    
    // Extract user ID from URL parameter
    template.userId = sanitizeUserId(e.parameter.uid);

    return template.evaluate()
      .setTitle('Khuroson Cargo - Профиль')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (error) {
    Logger.log(`WebApp doGet error: ${error.toString()}`);
    return HtmlService.createHtmlOutput(`
      <div style="padding: 20px; text-align: center; font-family: sans-serif;">
        <h2 style="color: #f44336;">⚠️ Ошибка загрузки</h2>
        <p>Не удалось загрузить веб-приложение.</p>
        <p>Пожалуйста, откройте приложение заново из Telegram.</p>
      </div>
    `);
  }
}

// ============================================================================
// USER DATA API
// ============================================================================

/**
 * Get user data for Web App
 * @param {string} userId - User ID
 * @returns {{success: boolean, user?: Object, tracks?: Array, statusCounts?: Object, error?: string}}
 */
function getUserDataForWebApp(userId) {
  try {
    const cleanUserId = sanitizeUserId(userId);

    if (!cleanUserId) {
      return { success: false, error: "Неверный ID пользователя" };
    }

    const user = DB.getUser(cleanUserId);

    if (!user) {
      return { success: false, error: "Пользователь не найден" };
    }

    // Get track history
    const historyCodes = user.history
      ? String(user.history).split(",").filter(Boolean)
      : [];

    let tracks = [];
    if (historyCodes.length > 0) {
      tracks = SearchEngine.find(historyCodes);
    }

    // NEW: Calculate status counts
    const statusCounts = countTrackStatuses(tracks);

    return {
      success: true,
      user: {
        clientId: user.clientId,
        name: sanitizeHTML(user.name),
        phone: sanitizeHTML(user.phone),
        lang: user.lang || 'tj'
      },
      tracks: tracks,
      statusCounts: statusCounts
    };

  } catch (error) {
    logErrorToSheet("WEB_APP", "getUserData", error.toString());
    return { success: false, error: error.message };
  }
}

// ============================================================================
// PROFILE UPDATE API
// ============================================================================

/**
 * Update user profile from Web App
 * @param {{userId: string, newName: string, newPhone: string}} data - Update data
 * @returns {{success: boolean, error?: string}}
 */
function updateProfileFromWebApp(data) {
  try {
    const userId = sanitizeUserId(data.userId);
    const newName = sanitizeHTML(String(data.newName || "").trim());
    const newPhone = sanitizePhone(String(data.newPhone || ""));

    // Validate user ID
    if (!userId) {
      return { success: false, error: "Неверный ID пользователя" };
    }

    // Validate name (2-50 chars, letters and spaces only)
    if (!isValidName(newName)) {
      return { 
        success: false, 
        error: "Имя должно быть от 2 до 50 символов (только буквы)" 
      };
    }

    // Validate phone (basic validation)
    if (!isValidPhone(newPhone)) {
      return { 
        success: false, 
        error: "Некорректный номер телефона" 
      };
    }

    // Check user exists
    const user = DB.getUser(userId);
    if (!user) {
      return { success: false, error: "Пользователь не найден" };
    }

    // Update fields
    const nameUpdated = DB.updateUser(userId, "name", newName);
    const phoneUpdated = DB.updateUser(userId, "phone", newPhone);

    if (!nameUpdated || !phoneUpdated) {
      return { success: false, error: "Ошибка обновления данных" };
    }

    // Send confirmation
    TG.sendMessage(userId, "✅ Ваши данные успешно обновлены!");

    return { success: true };

  } catch (error) {
    logErrorToSheet("WEB_APP", "updateProfile", error.toString());
    return { success: false, error: error.message };
  }
}

// ============================================================================
// TRACK SEARCH API
// ============================================================================

/**
 * Search for track from Web App
 * @param {{userId: string, code: string}} data - Search data
 * @returns {{success: boolean, result?: Object, error?: string}}
 */
function searchTrackFromWebApp(data) {
  try {
    const userId = sanitizeUserId(data.userId);
    const code = String(data.code || "").trim().toUpperCase();

    // Validate
    if (!userId) {
      return { success: false, error: "Неверный ID пользователя" };
    }

    if (code.length < 4) {
      return { success: false, error: "Код слишком короткий" };
    }

    // Search
    const results = SearchEngine.find([code]);
    const result = results[0];

    // Add to history if found
    if (result && result.found) {
      DB.updateHistory(userId, [result.code]);
    }

    return { success: true, result: result };

  } catch (error) {
    logErrorToSheet("WEB_APP", "searchTrack", error.toString());
    return { success: false, error: error.message };
  }
}

// ============================================================================
// AI ASSISTANT API (NEW - Groq Powered)
// ============================================================================

/**
 * AI Chat assistant for Web App (Groq AI - FREE!)
 * @param {{userId: string, message: string}} data - Chat data
 * @returns {{success: boolean, response?: string, error?: string}}
 */
function askAIAssistant(data) {
  try {
    const userId = sanitizeUserId(data.userId);
    const message = String(data.message || "").trim();
    
    if (!userId) {
      return { success: false, error: "Неверный ID пользователя" };
    }
    
    if (!message) {
      return { success: false, error: "Сообщение пустое" };
    }
    
    // Get user language
    const user = DB.getUser(userId);
    const lang = user ? user.lang : 'tj';
    
    // Try Groq AI first (FREE!)
    let response = askGroqAI(message, lang);
    
    // Fallback to Gemini if Groq fails
    if (!response) {
      response = askAiText(message, lang);
    }
    
    if (!response) {
      return { success: false, error: "AI не ответил" };
    }
    
    return { success: true, response: response };
    
  } catch (error) {
    logErrorToSheet("WEB_APP", "askAIAssistant", error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * AI Track code extraction from image (Groq Vision - FREE!)
 * @param {{userId: string, imageUrl: string}} data - Image data
 * @returns {{success: boolean, code?: string, confidence?: number, note?: string, error?: string}}
 */
function extractTrackCodeFromImage(data) {
  try {
    const userId = sanitizeUserId(data.userId);
    const imageUrl = String(data.imageUrl || "");
    
    if (!userId) {
      return { success: false, error: "Неверный ID пользователя" };
    }
    
    if (!imageUrl) {
      return { success: false, error: "Изображение не предоставлено" };
    }
    
    // For web app, we need to download image from URL first
    // This is a simplified version - in production you'd handle actual file upload
    const result = {
      success: false,
      error: "Загрузка изображений через Web App в разработке"
    };
    
    return result;
    
  } catch (error) {
    logErrorToSheet("WEB_APP", "extractTrackCode", error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * AI Cargo classification from image description
 * @param {{userId: string, description: string}} data - Cargo description
 * @returns {{success: boolean, category?: string, allowed?: boolean, notes?: Array, error?: string}}
 */
function classifyCargoAI(data) {
  try {
    const userId = sanitizeUserId(data.userId);
    const description = String(data.description || "").trim();
    
    if (!userId) {
      return { success: false, error: "Неверный ID пользователя" };
    }
    
    if (!description) {
      return { success: false, error: "Описание пустое" };
    }
    
    // Get user language
    const user = DB.getUser(userId);
    const lang = user ? user.lang : 'tj';
    
    // Use Groq AI to classify cargo
    const prompt = `Классифицируй груз для транспортной компании.
    
Описание: ${description}

Определи:
1. Категория (одежда, электроника, запчасти, продукты, хрупкое, опасное)
2. Можно ли перевозить (да/нет)
3. Особые требования (упаковка, температура)

Ответь JSON:
{
  "category": "категория",
  "allowed": true/false,
  "notes": ["заметка 1", "заметка 2"]
}`;

    // Try Groq AI first
    let response = askGroqAI(prompt, lang);
    
    if (!response) {
      response = askAiText(prompt, lang);
    }
    
    if (!response) {
      return { success: false, error: "AI не ответил" };
    }
    
    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        category: parsed.category,
        allowed: parsed.allowed,
        notes: parsed.notes
      };
    }
    
    return { success: true, category: "Не определено", allowed: true, notes: [response] };
    
  } catch (error) {
    logErrorToSheet("WEB_APP", "classifyCargoAI", error.toString());
    return { success: false, error: error.message };
  }
}

// ============================================================================
// SANITIZATION HELPERS
// ============================================================================

/**
 * Sanitize user ID
 * @param {string} id - User ID
 * @returns {string} Sanitized ID
 */
function sanitizeUserId(id) {
  if (!id) return "";
  // Allow only digits and basic characters
  return String(id).replace(/[^\d]/g, "").substring(0, 20);
}

/**
 * Sanitize phone number
 * @param {string} phone - Phone number
 * @returns {string} Sanitized phone
 */
function sanitizePhone(phone) {
  if (!phone) return "";
  // Keep only digits and +
  const digits = String(phone).replace(/\D/g, "");
  // Add + if missing
  return digits.startsWith("+") ? digits : "+" + digits;
}

// ============================================================================
// ADMIN UTILITIES
// ============================================================================

/**
 * Get Web App URL for a user
 * @param {string} userId - User ID
 * @returns {string} Web App URL
 */
function getWebAppUrl(userId) {
  if (!CONFIG.WEBAPP_URL) {
    return "";
  }
  return `${CONFIG.WEBAPP_URL}?uid=${userId}`;
}

/**
 * Send Web App button to user
 * @param {string} chatId - Chat ID
 * @param {string} userId - User ID
 * @param {string} text - Button text
 */
function sendWebAppButton(chatId, userId, text = "⚙️ Открыть настройки") {
  const url = getWebAppUrl(userId);
  
  if (!url) {
    TG.sendMessage(chatId, "⚠️ Web App URL не настроен");
    return;
  }

  const keyboard = {
    inline_keyboard: [[
      { text: text, web_app: { url: url } }
    ]]
  };

  TG.sendMessage(chatId, "Откройте настройки профиля:", {
    reply_markup: JSON.stringify(keyboard)
  });
}
