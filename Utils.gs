/**
 * KHUROSON CARGO BOT - Utilities
 * 
 * @file Utils.gs
 * @description Rate limiting, logging, and statistics
 */

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Check if user is rate limited (anti-flood)
 * @param {string} userId - User ID
 * @returns {boolean} True if allowed, false if rate limited
 */
function checkRateLimit(userId) {
  const cache = CacheService.getScriptCache();
  const key = `RL_${userId}`;

  // If key exists, user is rate limited
  if (cache.get(key)) {
    return false;
  }

  // Set rate limit window
  cache.put(key, "1", RATE_LIMIT_WINDOW);
  return true;
}

// ============================================================================
// ERROR LOGGING
// ============================================================================

/**
 * Log error to Google Sheets
 * @param {string} source - Source of the error (e.g., "AI_TEXT", "WEBHOOK")
 * @param {string} userId - User ID or context
 * @param {string} error - Error message/details
 */
function logErrorToSheet(source, userId, error) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName("Logs");
    
    // Create sheet if not exists
    if (!sheet) {
      sheet = ss.insertSheet("Logs");
      sheet.appendRow(["Date", "Source", "User ID", "Error Details"]);
      sheet.getRange(1, 1, 1, 4)
        .setFontWeight("bold")
        .setBackground("#f44336")
        .setFontColor("white");
      sheet.setFrozenRows(1);
    }

    const timestamp = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "dd.MM.yyyy HH:mm:ss"
    );

    sheet.appendRow([timestamp, source, userId, String(error)]);

  } catch (e) {
    Logger.log(`logErrorToSheet failed: ${e.toString()}`);
  }
}

// ============================================================================
// STATISTICS LOGGING
// ============================================================================

/**
 * Log action to statistics sheet
 * @param {string} action - Action type (e.g., "NEW_USER", "TRACK_SEARCH")
 * @param {string} userId - User ID
 * @param {string} [details] - Optional details
 */
function logStats(action, userId, details = "") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName("Stats");

    // Create sheet if not exists
    if (!sheet) {
      sheet = ss.insertSheet("Stats");
      sheet.appendRow(["Дата", "Время", "Действие", "User ID", "Детали"]);
      
      // Format header
      sheet.getRange(1, 1, 1, 5)
        .setFontWeight("bold")
        .setBackground("#4285f4")
        .setFontColor("white");
      sheet.setFrozenRows(1);
    }

    const now = new Date();
    const date = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd.MM.yyyy");
    const time = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");

    sheet.appendRow([date, time, action, userId, details]);

  } catch (e) {
    Logger.log(`logStats error: ${e.toString()}`);
  }
}

// ============================================================================
// STATISTICS REPORT
// ============================================================================

/**
 * Get formatted statistics report for admin
 * @returns {string} Formatted statistics message
 */
function getStatsReport() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const statsSheet = ss.getSheetByName("Stats");
    const usersSheet = ss.getSheetByName("Users");

    if (!statsSheet || !usersSheet) {
      return "📊 Нет данных";
    }

    const totalUsers = Math.max(0, usersSheet.getLastRow() - 1);
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd.MM.yyyy");

    // Get all stats data (skip header)
    const allStats = statsSheet.getDataRange().getValues().slice(1);

    // Process stats in single pass
    const stats = allStats.reduce((acc, row) => {
      let [date, , action] = row;
      
      // Handle Date objects
      if (date instanceof Date) {
        date = Utilities.formatDate(date, Session.getScriptTimeZone(), "dd.MM.yyyy");
      }

      const isToday = String(date) === today;

      // Count total actions
      acc.total[action] = (acc.total[action] || 0) + 1;

      // Count today's actions
      if (isToday) {
        acc.todayActions++;
        acc.today[action] = (acc.today[action] || 0) + 1;
      }
      
      return acc;
    }, { todayActions: 0, today: {}, total: {} });

    return formatStatsMessage(totalUsers, today, stats);

  } catch (e) {
    return "❌ Ошибка: " + e.message;
  }
}

/**
 * Format statistics message
 * @param {number} totalUsers - Total users count
 * @param {string} today - Today's date string
 * @param {Object} stats - Statistics data
 * @returns {string} Formatted message
 */
function formatStatsMessage(totalUsers, today, stats) {
  const lines = [
    "📊 <b>СТАТИСТИКА БОТА</b>",
    "",
    "👥 <b>Пользователи:</b>",
    `├ Всего: ${totalUsers}`,
    `└ Новых сегодня: ${stats.today["NEW_USER"] || 0}`,
    "",
    `📅 <b>Сегодня (${today}):</b>`,
    `├ 📨 Всего действий: ${stats.todayActions}`,
    `├ 🔍 Поиск треков: ${stats.today["TRACK_SEARCH"] || 0}`,
    `├ 🎙 Голосовых: ${stats.today["VOICE_MSG"] || 0}`,
    `├ 💬 AI текст: ${stats.today["AI_TEXT"] || 0}`,
    `└ 📸 AI фото: ${stats.today["AI_VISION"] || 0}`,
    "",
    "📈 <b>Всего за всё время:</b>",
    `├ 🔍 Поиск треков: ${stats.total["TRACK_SEARCH"] || 0}`,
    `├ 🎙 Голосовых: ${stats.total["VOICE_MSG"] || 0}`,
    `├ 💬 AI текст: ${stats.total["AI_TEXT"] || 0}`,
    `└ 📸 AI фото: ${stats.total["AI_VISION"] || 0}`
  ];

  return lines.join("\n");
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Sanitize HTML string (basic escaping)
 * @param {string} str - Input string
 * @returns {string} Sanitized string
 */
function sanitizeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Truncate string with ellipsis
 * @param {string} str - Input string
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
function truncate(str, maxLength) {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "...";
}

/**
 * Escape special regex characters
 * @param {string} str - Input string
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Format date to readable string
 * @param {Date} date - Date object
 * @param {string} [format] - Format string (default: "dd.MM.yyyy HH:mm")
 * @returns {string} Formatted date
 */
function formatDate(date, format) {
  if (!date) return "";
  
  const fmt = format || "dd.MM.yyyy HH:mm";
  return Utilities.formatDate(date, Session.getScriptTimeZone(), fmt);
}

/**
 * Get relative time string (e.g., "5 minutes ago")
 * @param {Date} date - Date to compare
 * @param {string} lang - Language code
 * @returns {string} Relative time string
 */
function getRelativeTime(date, lang) {
  if (!date) return "";
  
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const L = getLocalization(lang);
  const isRu = lang === 'ru';

  if (diffSec < 60) {
    return isRu ? "только что" : "ҳоло";
  } else if (diffMin < 60) {
    return isRu ? `${diffMin} мин. назад` : `${diffMin} дақ. пеш`;
  } else if (diffHour < 24) {
    return isRu ? `${diffHour} ч. назад` : `${diffHour} соат пеш`;
  } else if (diffDay < 7) {
    return isRu ? `${diffDay} дн. назад` : `${diffDay} рӯз пеш`;
  }
  
  return formatDate(date, "dd.MM.yyyy");
}
