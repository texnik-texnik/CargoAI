/**
 * KHUROSON CARGO BOT - Admin Commands
 * 
 * @file AdminCommands.gs
 * @description Admin commands for Telegram bot
 */

// ============================================================================
// ADMIN COMMANDS
// ============================================================================

/**
 * Show admin panel button
 * @param {string} chatId
 * @param {string} userId
 */
function showAdminPanel(chatId, userId) {
  const webAppUrl = doGetAdminPanel({ parameter: { uid: userId } }).getUrl();
  
  const keyboard = {
    inline_keyboard: [[
      { text: "🔧 Открыть Админ Панель", url: webAppUrl }
    ]]
  };
  
  TG.sendMessage(chatId, 
    `🔧 <b>Admin Panel</b>\n\n` +
    `Управление треками:\n` +
    `• Групповое обновление статусов\n` +
    `• Статистика по файлам\n` +
    `• Логи действий\n\n` +
    `Команды:\n` +
    `/bulk DD.MM.YYYY_DD.MM.YYYY-status\n` +
    `/admin - Открыть панель`,
    { reply_markup: JSON.stringify(keyboard) }
  );
}

/**
 * Handle bulk update command
 * Format: /bulk 19.03.2026_18.03.2026-received
 * 
 * @param {string} chatId
 * @param {string} userId
 * @param {string} command
 */
function handleBulkUpdate(chatId, userId, command) {
  TG.sendMessage(chatId, `⏳ Обработка команды: ${command}...`);
  
  const result = bulkUpdateStatus(userId, command);
  
  if (result.success) {
    TG.sendMessage(chatId, 
      `✅ <b>Готово!</b>\n\n` +
      `Обновлено треков: ${result.updated}\n` +
      `Команда: ${command}`
    );
  } else {
    TG.sendMessage(chatId, 
      `❌ <b>Ошибка!</b>\n\n` +
      `${result.error}\n\n` +
      `Формат: /bulk DD.MM.YYYY_DD.MM.YYYY-status\n` +
      `Пример: /bulk 19.03.2026_18.03.2026-received`
    );
  }
}

// ============================================================================
// ADMIN HELPERS
// ============================================================================

/**
 * Get admin menu keyboard
 * @returns {Object}
 */
function getAdminKeyboard() {
  return {
    keyboard: [
      [{ text: "🔧 Админ Панель" }],
      [{ text: "📊 Статистика" }],
      [{ text: "❌ Отмена" }]
    ],
    resize_keyboard: true
  };
}
