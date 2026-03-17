/**
 * KHUROSON CARGO BOT - Database Layer
 * 
 * @file Database.gs
 * @description Google Sheets integration with caching and race condition protection
 */

// ============================================================================
// DATABASE MODULE
// ============================================================================

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} clientId - Unique client ID
 * @property {string} name - User name
 * @property {string} phone - Phone number
 * @property {string} lang - Language code (tj/ru)
 * @property {string} history - Comma-separated track history
 */

/**
 * @typedef {Object} TrackResult
 * @property {string} code - Track code
 * @property {boolean} found - Whether track was found
 * @property {string} [date] - Arrival date (if found)
 * @property {string} [weight] - Weight in kg (if found)
 */

const DB = {
  /**
   * Get Users sheet, create if not exists
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  getSheet: function() {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName("Users");
    
    if (!sheet) {
      sheet = ss.insertSheet("Users");
      // Initialize with headers
      sheet.appendRow(["ID", "ClientID", "Name", "Phone", "Lang", "History", "Date"]);
      // Format header row
      sheet.getRange(1, 1, 1, 7)
        .setFontWeight("bold")
        .setBackground("#4285f4")
        .setFontColor("white");
      sheet.setFrozenRows(1);
    }
    
    return sheet;
  },

  /**
   * Get user by ID with caching
   * @param {string} id - User ID
   * @returns {User|null}
   */
  getUser: function(id) {
    const cache = CacheService.getScriptCache();
    const cacheKey = `user:${id}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const sheet = DB.getSheet();
    const finder = sheet.getRange("A:A").createTextFinder(id).matchEntireCell(true);
    const rowCell = finder.findNext();
    
    if (!rowCell) {
      return null;
    }

    // Read all columns (1-7)
    const row = sheet.getRange(rowCell.getRow(), 1, 1, 7).getValues()[0];
    
    /** @type {User} */
    const userData = {
      id: String(row[0]),
      clientId: String(row[1] || ""),
      name: String(row[2] || ""),
      phone: String(row[3] || ""),
      lang: String(row[4] || "tj"),
      history: String(row[5] || "")
    };

    // Cache for 1 hour
    cache.put(cacheKey, JSON.stringify(userData), CACHE_TTL_USER);
    return userData;
  },

  /**
   * Save new user with auto-generated ClientID
   * @param {string} id - User ID
   * @param {string} name - User name
   * @param {string} phone - Phone number
   * @param {string} lang - Language code
   * @returns {{success: boolean, clientId?: string, error?: string}}
   */
  saveUser: function(id, name, phone, lang) {
    const sheet = DB.getSheet();
    const lock = LockService.getScriptLock();
    const cache = CacheService.getScriptCache();

    try {
      // Wait for lock (max 10 seconds)
      if (!lock.waitLock(10000)) {
        return { success: false, error: "Database lock timeout" };
      }

      // Invalidate any stale cache entry (including null)
      cache.remove(`user:${id}`);

      // Check if user already exists
      const existing = DB.getUser(id);
      if (existing) {
        return { success: false, error: "User already exists" };
      }

      // Generate unique ClientID
      const clientId = DB.generateClientId();

      // Append new row
      sheet.appendRow([
        String(id),
        clientId,
        name.trim(),
        "'" + phone.trim(), // Prefix with apostrophe to preserve leading +
        lang,
        "", // Empty history
        new Date()
      ]);

      // Create and cache user data immediately
      const userData = {
        id: String(id),
        clientId: clientId,
        name: name.trim(),
        phone: phone.trim(),
        lang: lang,
        history: ""
      };

      cache.put(`user:${id}`, JSON.stringify(userData), CACHE_TTL_USER);

      return { success: true, clientId: clientId };

    } catch (error) {
      Logger.log(`DB.saveUser error: ${error.toString()}`);
      return { success: false, error: error.toString() };

    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Update user field
   * @param {string} id - User ID
   * @param {string} field - Field name (name/phone/lang)
   * @param {string} value - New value
   * @returns {boolean}
   */
  updateUser: function(id, field, value) {
    const sheet = DB.getSheet();
    const finder = sheet.getRange("A:A").createTextFinder(id).matchEntireCell(true);
    const cell = finder.findNext();

    if (!cell) {
      return false;
    }

    const row = cell.getRow();
    
    // Column mapping: 1=ID, 2=ClientID, 3=Name, 4=Phone, 5=Lang, 6=History, 7=Date
    const columnMap = {
      "name": 3,
      "phone": 4,
      "lang": 5
    };
    
    const col = columnMap[field];
    if (!col) {
      return false;
    }

    // Update cell
    const cellValue = field === "phone" ? "'" + value : value;
    sheet.getRange(row, col).setValue(cellValue);

    // Update cache
    const cached = CacheService.getScriptCache().get(`user:${id}`);
    if (cached) {
      const userData = JSON.parse(cached);
      userData[field] = value;
      CacheService.getScriptCache().put(`user:${id}`, JSON.stringify(userData), CACHE_TTL_USER);
    }

    return true;
  },

  /**
   * Update user's track history
   * @param {string} id - User ID
   * @param {string[]} newCodes - New track codes to add
   * @returns {boolean}
   */
  updateHistory: function(id, newCodes) {
    const sheet = DB.getSheet();
    const lock = LockService.getScriptLock();
    
    try {
      if (!lock.waitLock(5000)) {
        Logger.log("DB.updateHistory: Lock timeout");
        return false;
      }

      const finder = sheet.getRange("A:A").createTextFinder(id).matchEntireCell(true);
      const cell = finder.findNext();

      if (!cell) {
        return false;
      }

      const row = cell.getRow();
      const historyCell = sheet.getRange(row, 6); // Column F
      
      // Get current history, filter out empty values
      let history = String(historyCell.getValue() || "").split(",").filter(Boolean);
      
      // Add new codes to front, remove duplicates
      newCodes.forEach(code => {
        // Remove if already exists
        history = history.filter(c => c !== code);
        // Add to front
        history.unshift(code);
      });
      
      // Keep only last N items
      history = history.slice(0, MAX_HISTORY_ITEMS);
      
      // Update cell
      historyCell.setValue(history.join(","));
      
      // Invalidate cache
      CacheService.getScriptCache().remove(`user:${id}`);
      
      return true;

    } catch (error) {
      Logger.log(`DB.updateHistory error: ${error.toString()}`);
      return false;
      
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Generate unique ClientID with race condition protection
   * @returns {string}
   */
  generateClientId: function() {
    const lock = LockService.getScriptLock();
    
    if (!lock.waitLock(10000)) {
      // Fallback: generate timestamp-based ID
      return "C" + Date.now().toString().slice(-6);
    }

    try {
      let lastId = parseInt(PROPS.getProperty('LAST_CLIENT_ID') || '1000', 10);
      lastId++;
      PROPS.setProperty('LAST_CLIENT_ID', String(lastId));
      return String(lastId);
      
    } finally {
      lock.releaseLock();
    }
  }
};

// ============================================================================
// STATUS SYSTEM - Трекинг статусов грузов
// ============================================================================

/**
 * Статусы груза (как в Tj0007cargo)
 * @enum {string}
 */
const TRACK_STATUS = {
  // 🇨 В Китае
  WAITING: 'waiting',       // ожидание
  RECEIVED: 'received',     // получен
  IN_TRANSIT: 'intransit',  // в пути
  BORDER: 'border',         // граница
  
  // 🇹🇯 В Таджикистане
  WAREHOUSE: 'warehouse',   // склад
  PAYMENT: 'payment',       // оплата
  ORDER: 'order',           // заявка
  DELIVERY: 'delivery',     // доставка
  DELIVERED: 'delivered'    // доставлен
};

/**
 * Маппинг статусов для отображения
 */
const STATUS_LABELS = {
  [TRACK_STATUS.WAITING]: { ru: 'ожидание', tj: 'интизорӣ', icon: 'schedule', color: '#FF9500' },
  [TRACK_STATUS.RECEIVED]: { ru: 'получен', tj: 'дарёфтшуда', icon: 'home', color: '#34C759' },
  [TRACK_STATUS.IN_TRANSIT]: { ru: 'в пути', tj: 'дар роҳ', icon: 'local_shipping', color: '#007AFF' },
  [TRACK_STATUS.BORDER]: { ru: 'граница', tj: 'сарҳад', icon: 'road', color: '#AF52DE' },
  [TRACK_STATUS.WAREHOUSE]: { ru: 'склад', tj: 'омбор', icon: 'warehouse', color: '#FF9500' },
  [TRACK_STATUS.PAYMENT]: { ru: 'оплата', tj: 'пардохт', icon: 'account_balance_wallet', color: '#34C759' },
  [TRACK_STATUS.ORDER]: { ru: 'заявка', tj: 'дархост', icon: 'shopping_cart', color: '#007AFF' },
  [TRACK_STATUS.DELIVERY]: { ru: 'доставка', tj: 'расонидан', icon: 'local_shipping', color: '#AF52DE' },
  [TRACK_STATUS.DELIVERED]: { ru: 'доставлен', tj: 'расонида шуд', icon: 'check_circle', color: '#34C759' }
};

/**
 * Определить статус по ключевым словам в данных трека
 * @param {Object} trackData - Данные трека из таблицы
 * @returns {string} Статус трека
 */
function determineTrackStatus(trackData) {
  // Если есть явное поле status - используем его
  if (trackData.status) {
    return trackData.status;
  }

  // Автоматическое определение по данным
  const found = trackData.found || false;
  const weight = trackData.weight || '';
  const date = trackData.date || '';
  const notes = String(trackData.notes || '').toLowerCase();

  // Если трек найден в базе
  if (found) {
    // Проверяем специальные отметки
    if (notes.includes('выдан') || notes.includes('получен')) {
      return TRACK_STATUS.DELIVERED;
    }
    if (notes.includes('оплата') || notes.includes('оплачен')) {
      return TRACK_STATUS.PAYMENT;
    }
    if (notes.includes('доставка') || notes.includes('едет')) {
      return TRACK_STATUS.DELIVERY;
    }
    // По умолчанию - на складе
    return TRACK_STATUS.WAREHOUSE;
  } else {
    // Трей ещё не найден (в Китае)
    if (notes.includes('граница') || notes.includes('таможня')) {
      return TRACK_STATUS.BORDER;
    }
    if (notes.includes('в пути') || notes.includes('едет')) {
      return TRACK_STATUS.IN_TRANSIT;
    }
    if (notes.includes('получен') || notes.includes('на складе китай')) {
      return TRACK_STATUS.RECEIVED;
    }
    // По умолчанию - ожидание
    return TRACK_STATUS.WAITING;
  }
}

/**
 * Получить информацию о статусе
 * @param {string} statusCode - Код статуса
 * @param {string} lang - Язык (ru/tj)
 * @returns {{label: string, icon: string, color: string}}
 */
function getStatusInfo(statusCode, lang) {
  const info = STATUS_LABELS[statusCode] || STATUS_LABELS[TRACK_STATUS.WAITING];
  return {
    label: lang === 'tj' ? info.tj : info.ru,
    icon: info.icon,
    color: info.color
  };
}

/**
 * Подсчитать статусы по всем трекам пользователя
 * @param {TrackResult[]} tracks - Массив треков
 * @returns {Object} Счётчики по статусам
 */
function countTrackStatuses(tracks) {
  const counts = {
    [TRACK_STATUS.WAITING]: 0,
    [TRACK_STATUS.RECEIVED]: 0,
    [TRACK_STATUS.IN_TRANSIT]: 0,
    [TRACK_STATUS.BORDER]: 0,
    [TRACK_STATUS.WAREHOUSE]: 0,
    [TRACK_STATUS.PAYMENT]: 0,
    [TRACK_STATUS.ORDER]: 0,
    [TRACK_STATUS.DELIVERY]: 0,
    [TRACK_STATUS.DELIVERED]: 0
  };

  tracks.forEach(track => {
    const status = determineTrackStatus(track);
    counts[status]++;
  });

  // Группировка по регионам
  return {
    total: tracks.length,
    china: {
      waiting: counts[TRACK_STATUS.WAITING],
      received: counts[TRACK_STATUS.RECEIVED],
      intransit: counts[TRACK_STATUS.IN_TRANSIT],
      border: counts[TRACK_STATUS.BORDER]
    },
    tajikistan: {
      warehouse: counts[TRACK_STATUS.WAREHOUSE],
      payment: counts[TRACK_STATUS.PAYMENT],
      order: counts[TRACK_STATUS.ORDER],
      delivery: counts[TRACK_STATUS.DELIVERY],
      delivered: counts[TRACK_STATUS.DELIVERED]
    }
  };
}

const SearchEngine = {
  /**
   * Find tracks by codes
   * @param {string[]} codes - Array of track codes to search
   * @returns {TrackResult[]}
   */
  find: function(codes) {
    if (!CONFIG.FOLDER_ID || codes.length === 0) {
      return codes.map(code => ({ code, found: false, status: TRACK_STATUS.WAITING }));
    }

    // Get cached file IDs or scan folder
    let fileIds = this._getTrackFileIds();
    
    /** @type {TrackResult[]} */
    const results = [];
    let notFound = [...codes];

    // Search through each spreadsheet
    for (const fileId of fileIds) {
      if (notFound.length === 0) break; // All found
      
      try {
        const sheet = SpreadsheetApp.openById(fileId).getSheets()[0];
        const lastRow = sheet.getLastRow();
        
        if (lastRow < 2) continue; // Empty sheet

        // Read all data at once for performance
        const data = this._readSheetData(sheet, lastRow);
        
        // Search for remaining codes
        const stillNotFound = [];
        
        for (const code of notFound) {
          const row = data.find(r => r.code === code);
          
          if (row) {
            results.push({
              code: code,
              found: true,
              date: row.date,
              weight: row.weight,
              status: determineTrackStatus(row), // NEW: Add status
              notes: row.notes || '' // NEW: Add notes for status detection
            });
          } else {
            stillNotFound.push(code);
          }
        }
        
        notFound = stillNotFound;
        
      } catch (error) {
        Logger.log(`SearchEngine: Error reading file ${fileId}: ${error.message}`);
      }
    }

    // Mark remaining as not found
    notFound.forEach(code => {
      results.push({ 
        code, 
        found: false,
        status: TRACK_STATUS.WAITING // NEW: Default status
      });
    });

    return results;
  },

  /**
   * Get cached track file IDs or scan folder
   * @returns {string[]}
   * @private
   */
  _getTrackFileIds: function() {
    const cache = CacheService.getScriptCache();
    const cacheKey = "track_files";
    
    let cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Scan folder for spreadsheets
    const files = DriveApp.searchFiles(
      `'${CONFIG.FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
    );
    
    const ids = [];
    while (files.hasNext()) {
      ids.push(files.next().getId());
    }

    // Cache for 10 minutes
    const result = JSON.stringify(ids);
    cache.put(cacheKey, result, CACHE_TTL_TRACK_FILES);
    
    return ids;
  },

  /**
   * Read sheet data efficiently
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {number} lastRow
   * @returns {Array<{code: string, date: string, weight: string}>}
   * @private
   */
  _readSheetData: function(sheet, lastRow) {
    const colCode = CONFIG.COL_CODE;
    const colDate = CONFIG.COL_DATE;
    const colWeight = CONFIG.COL_WEIGHT;
    
    const minCol = Math.min(colCode, colDate, colWeight);
    const maxCol = Math.max(colCode, colDate, colWeight);

    // Read all data in one call
    const data = sheet.getRange(1, minCol, lastRow, maxCol - minCol + 1).getValues();
    
    // Calculate relative indices
    const idxCode = colCode - minCol;
    const idxDate = colDate - minCol;
    const idxWeight = colWeight - minCol;
    
    const timeZone = Session.getScriptTimeZone();
    const result = [];

    // Skip header row (index 0)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const code = String(row[idxCode]).trim().toUpperCase();
      
      // Format date
      let dateVal = row[idxDate];
      let dateStr = dateVal;
      if (dateVal instanceof Date) {
        dateStr = Utilities.formatDate(dateVal, timeZone, "dd.MM.yyyy");
      }

      result.push({
        code: code,
        date: String(dateStr),
        weight: String(row[idxWeight])
      });
    }

    return result;
  }
};
