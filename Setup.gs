/**
 * KHUROSON CARGO BOT - Setup & Initialization
 * 
 * Run these functions from Apps Script editor to initialize the bot
 */

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize bot - create sheets and set properties
 * Run this once from Apps Script editor
 */
function setupBot() {
  const ss = SpreadsheetApp.getActive();
  
  // Create required sheets
  const sheetNames = ['Users', 'Logs', 'Stats', 'Errors'];
  
  sheetNames.forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      Logger.log(`Created sheet: ${name}`);
    }
  });
  
  // Initialize Users sheet
  const usersSheet = ss.getSheetByName('Users');
  if (usersSheet.getLastRow() === 0) {
    usersSheet.appendRow(['ID', 'ClientID', 'Name', 'Phone', 'Lang', 'History', 'Date']);
    usersSheet.getRange(1, 1, 1, 7)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('white');
    usersSheet.setFrozenRows(1);
  }
  
  // Initialize Logs sheet
  const logsSheet = ss.getSheetByName('Logs');
  if (logsSheet.getLastRow() === 0) {
    logsSheet.appendRow(['Date', 'Source', 'User ID', 'Error Details']);
    logsSheet.getRange(1, 1, 1, 4)
      .setFontWeight('bold')
      .setBackground('#f44336')
      .setFontColor('white');
    logsSheet.setFrozenRows(1);
  }
  
  // Initialize Stats sheet
  const statsSheet = ss.getSheetByName('Stats');
  if (statsSheet.getLastRow() === 0) {
    statsSheet.appendRow(['Дата', 'Время', 'Действие', 'User ID', 'Детали']);
    statsSheet.getRange(1, 1, 1, 5)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('white');
    statsSheet.setFrozenRows(1);
  }
  
  // Initialize Errors sheet (for debug logs)
  const errorsSheet = ss.getSheetByName('Errors');
  if (!errorsSheet) {
    const newSheet = ss.insertSheet('Errors');
    newSheet.appendRow(['Timestamp', 'Level', 'Source', 'User ID', 'Message', 'Details']);
    newSheet.getRange(1, 1, 1, 6)
      .setFontWeight('bold')
      .setBackground('#9c27b0')
      .setFontColor('white');
    newSheet.setFrozenRows(1);
  }
  
  Logger.log('✅ Bot setup complete!');
  Logger.log('Spreadsheet ID: ' + ss.getId());
  
  return {
    spreadsheetId: ss.getId(),
    message: 'Setup complete! Copy the spreadsheet ID above and set it in Properties.'
  };
}

/**
 * Set all required properties
 * Update values before running
 */
function setProperties() {
  const props = PropertiesService.getScriptProperties();
  
  const config = {
    TELEGRAM_TOKEN: 'YOUR_BOT_TOKEN_HERE',
    WEBHOOK_TOKEN: 'khuroson_secure_' + Date.now(),
    WEBAPP_URL: '',
    ADMIN_IDS: 'YOUR_TELEGRAM_USER_ID',
    ADMIN_LINK: 'https://t.me/your_admin_username',
    USERS_SPREADSHEET_ID: SpreadsheetApp.getActive().getId(),
    TRACKS_FOLDER_ID: '',
    GOOGLE_API_KEY: '',
    GEMINI_MODEL: 'gemini-1.5-flash',
    FILE_ID_TRACK_SEARCH: '',
    FILE_ID_ADDRESS_CHINA: '',
    FILE_ID_LOC_KHUROSON: '',
    FILE_ID_PRICE: '',
    FILE_ID_BANNED: '',
    KHUROSON_ADDRESS: 'н. Хуросон, адрес склада',
    CHINA_ADDRESS: 'China, Yiwu, Your warehouse address',
    PRICE_KG: '25 сомонӣ',
    PRICE_M3: '270$',
    TRACK_COL_CODE: '1',
    TRACK_COL_DATE: '7',
    TRACK_COL_WEIGHT: '9'
  };
  
  Object.entries(config).forEach(([key, value]) => {
    if (value) {
      props.setProperty(key, value);
      Logger.log(`✓ Set ${key}`);
    }
  });
  
  Logger.log('\n✅ Properties set! Copy WEBHOOK_TOKEN for webhook URL');
  return config;
}

/**
 * Get webhook URL to set in Telegram
 */
function getWebhookInfo() {
  const props = PropertiesService.getScriptProperties();
  const webhookToken = props.getProperty('WEBHOOK_TOKEN') || 'khuroson_cargo_ai';
  const webAppUrl = props.getProperty('WEBAPP_URL');
  
  if (!webAppUrl) {
    Logger.log('❌ WEBAPP_URL not set! Deploy the web app first.');
    return null;
  }
  
  const webhookUrl = `${webAppUrl}?token=${webhookToken}`;
  
  Logger.log('\n🔗 Webhook URL:');
  Logger.log(webhookUrl);
  
  return webhookUrl;
}

/**
 * Set webhook via Telegram API
 */
function setTelegramWebhook() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TELEGRAM_TOKEN');
  const webhookToken = props.getProperty('WEBHOOK_TOKEN') || 'khuroson_cargo_ai';
  const webAppUrl = props.getProperty('WEBAPP_URL');
  
  if (!token || !webAppUrl) {
    Logger.log('❌ Missing TELEGRAM_TOKEN or WEBAPP_URL');
    return null;
  }
  
  const webhookUrl = `${webAppUrl}?token=${webhookToken}`;
  
  const response = UrlFetchApp.fetch(
    `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`,
    { muteHttpExceptions: true }
  );
  
  const result = JSON.parse(response.getContentText());
  
  if (result.ok) {
    Logger.log('✅ Webhook set successfully!');
    Logger.log('URL: ' + webhookUrl);
  } else {
    Logger.log('❌ Failed: ' + result.description);
  }
  
  return result;
}

/**
 * Check webhook status
 */
function checkWebhookStatus() {
  const token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  
  const response = UrlFetchApp.fetch(
    `https://api.telegram.org/bot${token}/getWebhookInfo`,
    { muteHttpExceptions: true }
  );
  
  const result = JSON.parse(response.getContentText());
  
  if (result.ok) {
    Logger.log('📊 Webhook Info:');
    Logger.log('URL: ' + (result.result.url || 'Not set'));
    Logger.log('Last update: ' + (result.result.last_update_date || 'none'));
    Logger.log('Pending updates: ' + (result.result.pending_update_count || 0));
  } else {
    Logger.log('❌ Error: ' + result.description);
  }
  
  return result;
}

/**
 * Update WEBAPP_URL in Properties and webhook
 * @param {string} newUrl - New Web App URL
 */
function updateWebAppUrl(newUrl) {
  if (!newUrl) {
    Logger.log('❌ Please provide a URL');
    Logger.log('Usage: updateWebAppUrl("https://script.google.com/.../exec")');
    return null;
  }
  
  const props = PropertiesService.getScriptProperties();
  props.setProperty('WEBAPP_URL', newUrl);
  
  Logger.log('✅ WEBAPP_URL updated: ' + newUrl);
  setTelegramWebhook();
  
  return newUrl;
}

/**
 * Clear old logs (keep last 100 rows)
 */
function clearOldLogs() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Errors');
  
  if (!sheet) return;
  
  const lastRow = sheet.getLastRow();
  if (lastRow > 100) {
    sheet.deleteRows(2, lastRow - 100);
    Logger.log(`Cleared ${lastRow - 100} old log entries`);
  }
}

/**
 * Log debug message to Errors sheet in Users spreadsheet
 */
function logToSheet(level, source, userId, message, details = '') {
  try {
    // Use USERS_SPREADSHEET_ID from Properties
    const sheetId = PropertiesService.getScriptProperties().getProperty('USERS_SPREADSHEET_ID');
    
    if (!sheetId) {
      Logger.log('logToSheet: USERS_SPREADSHEET_ID not set');
      return;
    }
    
    const ss = SpreadsheetApp.openById(sheetId);
    let sheet = ss.getSheetByName('Errors');

    if (!sheet) {
      sheet = ss.insertSheet('Errors');
      sheet.appendRow(['Timestamp', 'Level', 'Source', 'User ID', 'Message', 'Details']);
      sheet.getRange(1, 1, 1, 6)
        .setFontWeight('bold')
        .setBackground('#9c27b0')
        .setFontColor('white');
      sheet.setFrozenRows(1);
    }

    const timestamp = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'yyyy-MM-dd HH:mm:ss'
    );

    sheet.appendRow([timestamp, level, source, String(userId), String(message), String(details)]);

  } catch (e) {
    Logger.log(`logToSheet error: ${e.toString()}`);
  }
}
