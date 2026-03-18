/**
 * KHUROSON CARGO BOT - Admin Panel
 * 
 * @file Admin.gs
 * @description Admin panel for bulk track management
 */

// ============================================================================
// ADMIN AUTHENTICATION
// ============================================================================

/**
 * Check if user is admin
 * @param {string} userId - User ID
 * @returns {boolean}
 */
function isAdmin(userId) {
  return CONFIG.ADMIN_IDS.includes(userId);
}

// ============================================================================
// BULK STATUS UPDATE
// ============================================================================

/**
 * Bulk update track status by date range
 * Format: "19.03.2026_18.03.2026-received"
 * 
 * @param {string} userId - Admin user ID
 * @param {string} command - Update command
 * @returns {{success: boolean, updated: number, error?: string}}
 */
function bulkUpdateStatus(userId, command) {
  // Check admin rights
  if (!isAdmin(userId)) {
    return { success: false, error: "Access denied: Admin only" };
  }
  
  try {
    // Parse command: "19.03.2026_18.03.2026-received"
    const parts = command.split('-');
    if (parts.length !== 2) {
      return { success: false, error: "Invalid format. Use: DD.MM.YYYY_DD.MM.YYYY-status" };
    }
    
    const dateRange = parts[0]; // "19.03.2026_18.03.2026"
    const newStatus = parts[1]; // "received"
    
    // Parse date range
    const dates = dateRange.split('_');
    if (dates.length !== 2) {
      return { success: false, error: "Invalid date range. Use: DD.MM.YYYY_DD.MM.YYYY" };
    }
    
    const startDate = parseDate(dates[0]);
    const endDate = parseDate(dates[1]);
    
    if (!startDate || !endDate) {
      return { success: false, error: "Invalid date format. Use: DD.MM.YYYY" };
    }
    
    // Validate status
    const validStatuses = ['waiting', 'received', 'intransit', 'border', 'warehouse', 'payment', 'delivered'];
    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: `Invalid status. Valid: ${validStatuses.join(', ')}` };
    }
    
    // Get all track files
    const fileIds = getTrackFileIds();
    
    let updatedCount = 0;
    let totalProcessed = 0;
    
    // Process each file
    for (const fileId of fileIds) {
      try {
        const ss = SpreadsheetApp.openById(fileId);
        const sheet = ss.getSheets()[0];
        const lastRow = sheet.getLastRow();
        
        if (lastRow < 2) continue; // Empty sheet
        
        // Read all data
        const data = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
        const headers = data[0];
        
        // Find date column (usually column 7 or G)
        const dateColIndex = findDateColumn(headers);
        
        if (dateColIndex === -1) {
          Logger.log(`No date column found in file ${fileId}`);
          continue;
        }
        
        // Process rows
        for (let i = 1; i < lastRow; i++) {
          const row = data[i];
          const rowDate = parseDate(row[dateColIndex]);
          
          if (!rowDate) continue;
          
          // Check if date in range
          if (rowDate >= startDate && rowDate <= endDate) {
            // Update status - add new column or update existing
            const statusColIndex = findStatusColumn(headers);
            
            if (statusColIndex === -1) {
              // Add status column
              const newCol = sheet.getLastColumn() + 1;
              sheet.getRange(1, newCol).setValue("Status");
              sheet.getRange(i + 1, newCol).setValue(newStatus);
            } else {
              // Update existing
              sheet.getRange(i + 1, statusColIndex).setValue(newStatus);
            }
            
            updatedCount++;
          }
          
          totalProcessed++;
        }
        
      } catch (error) {
        Logger.log(`Error processing file ${fileId}: ${error.message}`);
      }
    }
    
    // Log the update
    logAdminAction(userId, `BULK_UPDATE: ${command}`, `Updated ${updatedCount} tracks`);
    
    return {
      success: true,
      updated: updatedCount,
      message: `Updated ${updatedCount} tracks from ${totalProcessed} processed`
    };
    
  } catch (error) {
    logErrorToSheet("BULK_UPDATE", userId, error.toString());
    return { success: false, error: error.message };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse date string DD.MM.YYYY to Date object
 * @param {string} dateStr
 * @returns {Date|null}
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    const parts = String(dateStr).split('.');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-11
    const year = parseInt(parts[2], 10);
    
    return new Date(year, month, day);
  } catch (e) {
    return null;
  }
}

/**
 * Find date column index in headers
 * @param {Array} headers
 * @returns {number} Column index (1-based) or -1
 */
function findDateColumn(headers) {
  const dateKeywords = ['date', 'дата', 'arrival', 'прибыл', 'время'];
  
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i]).toLowerCase();
    if (dateKeywords.some(keyword => header.includes(keyword))) {
      return i + 1; // 1-based index
    }
  }
  
  // Default to column 7 (G) if not found
  return 7;
}

/**
 * Find status column index in headers
 * @param {Array} headers
 * @returns {number} Column index (1-based) or -1
 */
function findStatusColumn(headers) {
  const statusKeywords = ['status', 'статус', 'state', 'состояние'];
  
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i]).toLowerCase();
    if (statusKeywords.some(keyword => header.includes(keyword))) {
      return i + 1; // 1-based index
    }
  }
  
  return -1; // Not found
}

/**
 * Get all track file IDs from folder
 * @returns {string[]}
 */
function getTrackFileIds() {
  if (!CONFIG.FOLDER_ID) {
    return [];
  }
  
  const cache = CacheService.getScriptCache();
  const cacheKey = 'track_files';
  
  // Try cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Scan folder
  const files = DriveApp.searchFiles(
    `'${CONFIG.FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  );
  
  const ids = [];
  while (files.hasNext()) {
    ids.push(files.next().getId());
  }
  
  // Cache for 10 minutes
  cache.put(cacheKey, JSON.stringify(ids), 600);
  
  return ids;
}

// ============================================================================
// ADMIN LOGGING
// ============================================================================

/**
 * Log admin action to sheet
 * @param {string} adminId
 * @param {string} action
 * @param {string} result
 */
function logAdminAction(adminId, action, result) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName("AdminLogs");
    
    if (!sheet) {
      sheet = ss.insertSheet("AdminLogs");
      sheet.appendRow(["Timestamp", "Admin ID", "Action", "Result"]);
      sheet.getRange(1, 1, 1, 4)
        .setFontWeight("bold")
        .setBackground("#4285f4")
        .setFontColor("white");
    }
    
    const now = new Date();
    sheet.appendRow([
      Utilities.formatDate(now, Session.getScriptTimeZone(), "dd.MM.yyyy HH:mm:ss"),
      adminId,
      action,
      result
    ]);
    
  } catch (e) {
    Logger.log(`logAdminAction error: ${e.toString()}`);
  }
}

// ============================================================================
// ADMIN WEB APP
// ============================================================================

/**
 * Serve admin panel HTML
 * @param {GoogleAppsScript.Events.DoGet} e
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGetAdminPanel(e) {
  try {
    const userId = sanitizeUserId(e.parameter.uid);
    
    if (!userId || !isAdmin(userId)) {
      return HtmlService.createHtmlOutput('<h1>Access Denied</h1><p>Admin only</p>');
    }
    
    const template = HtmlService.createTemplateFromFile('AdminApp');
    template.userId = userId;
    
    return template.evaluate()
      .setTitle('Khuroson Cargo - Admin Panel')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    return HtmlService.createHtmlOutput(`<h1>Error</h1><p>${error.message}</p>`);
  }
}

/**
 * Get admin statistics
 * @param {string} userId
 * @returns {{success: boolean, stats?: Object, error?: string}}
 */
function getAdminStats(userId) {
  if (!isAdmin(userId)) {
    return { success: false, error: "Access denied" };
  }
  
  try {
    const fileIds = getTrackFileIds();
    let totalTracks = 0;
    let totalFiles = fileIds.length;
    
    // Count tracks in all files
    for (const fileId of fileIds) {
      try {
        const ss = SpreadsheetApp.openById(fileId);
        const sheet = ss.getSheets()[0];
        const lastRow = sheet.getLastRow();
        totalTracks += (lastRow - 1); // Subtract header
      } catch (e) {
        // Skip inaccessible files
      }
    }
    
    return {
      success: true,
      stats: {
        totalFiles: totalFiles,
        totalTracks: totalTracks,
        lastUpdate: new Date().toLocaleString('ru-RU')
      }
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}
