/**
 * Get user ID command
 * Add to Main.gs
 */

// Add this handler before AI response section:

// 👤 GET USER ID
if (text === "/id") {
  TG.sendMessage(chatId, `🆔 <b>Ваш ID:</b> <code>${userId}</code>\n\nСкопируйте и добавьте в Script Properties → ADMIN_IDS`);
  return;
}
