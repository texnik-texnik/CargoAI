/**
 * KHUROSON CARGO BOT - Broadcast System
 * 
 * @file Broadcast.gs
 * @description Async broadcast messaging with progress tracking
 */

// ============================================================================
// BROADCAST STATE MANAGEMENT
// ============================================================================

/**
 * @typedef {Object} BroadcastState
 * @property {string} message - Message to broadcast
 * @property {string} adminId - Admin who started broadcast
 * @property {number} currentRow - Current row in spreadsheet
 * @property {number} success - Success count
 * @property {number} errors - Error count
 * @property {number} startTime - Start timestamp
 * @property {number} lastUpdate - Last update timestamp
 */

// ============================================================================
// BROADCAST CONTROL
// ============================================================================

/**
 * Start async broadcast task
 * @param {string} message - Message to broadcast
 * @param {string} adminId - Admin user ID
 */
function startBroadcastTask(message, adminId) {
  // Clear any existing broadcast
  stopBroadcastTask();

  /** @type {BroadcastState} */
  const taskState = {
    message: message,
    adminId: adminId,
    currentRow: 2, // Start from row 2 (skip header)
    success: 0,
    errors: 0,
    startTime: Date.now(),
    lastUpdate: Date.now()
  };

  // Save state to Properties
  PROPS.setProperty("BCAST_STATE", JSON.stringify(taskState));

  // Create minutely trigger
  ScriptApp.newTrigger("processBroadcastBatch")
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log(`Broadcast started by ${adminId}`);
}

/**
 * Stop broadcast task and cleanup
 */
function stopBroadcastTask() {
  // Clear state
  PROPS.deleteProperty("BCAST_STATE");

  // Remove trigger
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "processBroadcastBatch") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  Logger.log("Broadcast stopped");
}

/**
 * Get current broadcast status
 * @returns {{active: boolean, state?: BroadcastState}}
 */
function getBroadcastStatus() {
  const stateStr = PROPS.getProperty("BCAST_STATE");
  
  if (!stateStr) {
    return { active: false };
  }

  try {
    const state = JSON.parse(stateStr);
    return { active: true, state: state };
  } catch (e) {
    return { active: false };
  }
}

// ============================================================================
// BROADCAST PROCESSOR
// ============================================================================

/**
 * Process broadcast batch (called by trigger every minute)
 */
function processBroadcastBatch() {
  const stateStr = PROPS.getProperty("BCAST_STATE");

  // No active broadcast - cleanup
  if (!stateStr) {
    stopBroadcastTask();
    return;
  }

  /** @type {BroadcastState} */
  let state;
  try {
    state = JSON.parse(stateStr);
  } catch (e) {
    Logger.log("Broadcast: Invalid state, stopping");
    stopBroadcastTask();
    return;
  }

  const sheet = DB.getSheet();
  const lastRow = Math.max(sheet.getLastRow(), 1);
  
  // Check if complete
  if (state.currentRow > lastRow) {
    finishBroadcast(state);
    return;
  }

  // Calculate batch size
  const rowsRemaining = lastRow - state.currentRow + 1;
  const batchSize = Math.min(BROADCAST_BATCH_SIZE, rowsRemaining);

  // Read user IDs (column A only)
  const userIds = sheet.getRange(state.currentRow, 1, batchSize, 1).getValues();

  // Process batch
  for (let i = 0; i < userIds.length; i++) {
    const userId = String(userIds[i][0]).trim();

    // Skip empty or header
    if (!userId || userId === "ID") {
      continue;
    }

    // Send message
    const formattedMessage = `📢 <b>Уведомление от администрации:</b>\n\n${state.message}`;
    const response = TG.sendMessageWithRetry(userId, formattedMessage, {}, 2);

    if (response && response.ok) {
      state.success++;
    } else {
      state.errors++;
      Logger.log(`Broadcast failed for ${userId}: ${response?.description}`);
    }

    // Rate limit protection (Telegram: ~30 msg/sec)
    Utilities.sleep(TELEGRAM_RATE_DELAY);
  }

  // Update progress
  state.currentRow += batchSize;
  state.lastUpdate = Date.now();
  
  // Save updated state
  PROPS.setProperty("BCAST_STATE", JSON.stringify(state));

  Logger.log(`Broadcast progress: ${state.currentRow - 2}/${lastRow - 1}`);
}

/**
 * Finish broadcast and send report
 * @param {BroadcastState} state - Final broadcast state
 */
function finishBroadcast(state) {
  const duration = Math.floor((Date.now() - state.startTime) / 1000);
  const total = state.success + state.errors;
  const successRate = total > 0 ? Math.round((state.success / total) * 100) : 0;

  const report = [
    "✅ <b>Рассылка завершена!</b>",
    "",
    `📊 <b>Результаты:</b>`,
    `├ Всего: ${total}`,
    `├ ✅ Успешно: ${state.success}`,
    `├ ❌ Ошибок: ${state.errors}`,
    `└ 📈 Процент: ${successRate}%`,
    "",
    `⏱️ <b>Время:</b> ${formatDuration(duration)}`
  ].join("\n");

  TG.sendMessage(state.adminId, report);
  
  // Clear state
  stopBroadcastTask();
  
  // Log completion
  logStats("BROADCAST_COMPLETE", state.adminId, 
    `total:${total},success:${state.success},errors:${state.errors},duration:${duration}s`);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format duration in seconds to readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (mins > 0) {
    return `${mins} мин ${secs} сек`;
  }
  return `${secs} сек`;
}

/**
 * Estimate remaining time for broadcast
 * @param {BroadcastState} state - Current state
 * @param {number} totalRows - Total rows to process
 * @returns {string} Estimated time remaining
 */
function estimateRemainingTime(state, totalRows) {
  const processed = state.currentRow - 2;
  const remaining = totalRows - state.currentRow + 1;
  
  if (processed === 0) return "Вычисление...";
  
  const elapsed = Date.now() - state.startTime;
  const avgPerItem = elapsed / processed;
  const remainingMs = avgPerItem * remaining;
  
  const remainingMins = Math.floor(remainingMs / 60000);
  const remainingSecs = Math.floor((remainingMs % 60000) / 1000);
  
  if (remainingMins > 0) {
    return `~${remainingMins} мин ${remainingSecs} сек`;
  }
  return `~${remainingSecs} сек`;
}
