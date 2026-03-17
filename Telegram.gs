/**
 * KHUROSON CARGO BOT - Telegram API Wrapper
 * 
 * @file Telegram.gs
 * @description Clean, typed wrapper for Telegram Bot API with error handling
 */

// ============================================================================
// TELEGRAM API WRAPPER
// ============================================================================

/**
 * @typedef {Object} TelegramResponse
 * @property {boolean} ok - Success status
 * @property {string} [description] - Error description if failed
 * @property {Object} [result] - API response result
 */

/**
 * @typedef {Object} SendMessageOptions
 * @property {string} [parse_mode] - Parse mode (HTML/Markdown)
 * @property {Object} [reply_markup] - Keyboard markup
 * @property {boolean} [disable_web_page_preview] - Disable link preview
 */

const TG = {
  /**
   * Send raw request to Telegram API
   * @param {string} method - API method name
   * @param {Object} payload - Request payload
   * @param {number} [timeout] - Request timeout in ms
   * @returns {TelegramResponse}
   */
  send: function(method, payload, timeout = TIMEOUT_STANDARD) {
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      timeout: timeout
    };

    try {
      const url = `https://api.telegram.org/bot${TOKEN}/${method}`;
      const response = UrlFetchApp.fetch(url, options);
      const responseText = response.getContentText();
      
      if (!responseText) {
        return { ok: false, description: "Empty response from Telegram" };
      }
      
      const result = JSON.parse(responseText);
      return result;
      
    } catch (error) {
      Logger.log(`TG.send error [${method}]: ${error.toString()}`);
      return { 
        ok: false, 
        description: error.toString(),
        method: method
      };
    }
  },

  /**
   * Send text message
   * @param {string|number} chatId - Chat ID
   * @param {string} text - Message text
   * @param {SendMessageOptions} [extra] - Additional options
   * @returns {TelegramResponse}
   */
  sendMessage: function(chatId, text, extra = {}) {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
      ...extra
    };
    
    return this.send("sendMessage", payload);
  },

  /**
   * Answer callback query (from inline button press)
   * @param {string} id - Callback query ID
   * @param {string} [text] - Alert text (optional)
   * @param {boolean} [showAlert] - Show as alert (default: false)
   * @returns {TelegramResponse}
   */
  answerCallback: function(id, text = "", showAlert = false) {
    const payload = {
      callback_query_id: id,
      text: text,
      show_alert: showAlert
    };
    
    return this.send("answerCallbackQuery", payload);
  },

  /**
   * Send photo with caption
   * @param {string|number} chatId - Chat ID
   * @param {string} photoId - Photo file ID or URL
   * @param {string} caption - Photo caption
   * @param {SendMessageOptions} [extra] - Additional options
   * @returns {TelegramResponse}
   */
  sendPhoto: function(chatId, photoId, caption, extra = {}) {
    // Handle missing photo
    if (!photoId) {
      return this.sendMessage(chatId, "⚠️ (Нет фото)\n\n" + caption, extra);
    }

    // Build photo URL
    let photoUrl = photoId;
    if (!photoId.startsWith("http") && photoId.includes(".")) {
      // Assume it's a Google Drive file ID
      photoUrl = `https://drive.google.com/uc?export=view&id=${photoId}`;
    }

    const payload = {
      chat_id: chatId,
      photo: photoUrl,
      caption: caption,
      parse_mode: "HTML",
      ...extra
    };

    const result = this.send("sendPhoto", payload);
    
    // Fallback to text if photo fails
    if (!result.ok) {
      Logger.log(`sendPhoto failed, falling back to sendMessage: ${result.description}`);
      return this.sendMessage(chatId, caption, extra);
    }
    
    return result;
  },

  /**
   * Send chat action (typing, uploading, etc.)
   * @param {string|number} chatId - Chat ID
   * @param {string} action - Action type (typing, upload_photo, etc.)
   * @returns {TelegramResponse}
   */
  sendChatAction: function(chatId, action) {
    return this.send("sendChatAction", {
      chat_id: chatId,
      action: action
    });
  },

  /**
   * Get file info from Telegram
   * @param {string} fileId - File ID
   * @returns {TelegramResponse}
   */
  getFile: function(fileId) {
    return this.send("getFile", { file_id: fileId });
  },

  /**
   * Download file from Telegram
   * @param {string} filePath - File path from getFile response
   * @param {number} [timeout] - Download timeout in ms
   * @returns {Blob|null}
   */
  downloadFile: function(filePath, timeout = TIMEOUT_FILE) {
    try {
      const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
      const response = UrlFetchApp.fetch(fileUrl, {
        muteHttpExceptions: true,
        timeout: timeout
      });
      
      if (response.getResponseCode() !== 200) {
        Logger.log(`File download failed: ${response.getResponseCode()}`);
        return null;
      }
      
      return response.getBlob();
      
    } catch (error) {
      Logger.log(`downloadFile error: ${error.toString()}`);
      return null;
    }
  },

  /**
   * Send message with retry logic
   * @param {string|number} chatId - Chat ID
   * @param {string} text - Message text
   * @param {SendMessageOptions} [extra] - Additional options
   * @param {number} [maxRetries] - Maximum retry attempts
   * @returns {TelegramResponse}
   */
  sendMessageWithRetry: function(chatId, text, extra = {}, maxRetries = 2) {
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = this.sendMessage(chatId, text, extra);
      
      if (result.ok) {
        return result;
      }
      
      lastError = result.description;
      
      // Don't wait on last attempt
      if (attempt < maxRetries) {
        Utilities.sleep(1000 * (attempt + 1)); // Exponential backoff
      }
    }
    
    Logger.log(`sendMessageWithRetry failed after ${maxRetries + 1} attempts: ${lastError}`);
    return { ok: false, description: lastError };
  }
};
