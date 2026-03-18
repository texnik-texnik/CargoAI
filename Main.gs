/**
 * KHUROSON CARGO BOT - Main Entry Point
 * Simplified version based on working Code.gs
 */

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

/**
 * Handle incoming Telegram webhook requests
 */
function doPost(e) {
	// 🛡 ЗАЩИТА: Если токен в URL не совпадает — посылаем хакера подальше
  if (!e.parameter.token || e.parameter.token !== CONFIG.WEBHOOK_TOKEN) {
    return ContentService.createTextOutput("Access Denied, F*ck you!");
  }
  try {
    const update = JSON.parse(e.postData.contents);
    if (update.callback_query) return handleCallback(update.callback_query);
    if (!update.message) return;

    const msg = update.message;
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    const text = (msg.text || "").trim();

    // 1. Получаем пользователя (чтобы знать язык)
    let user = DB.getUser(userId);

    // 2. Если пользователя нет — отправляем на регистрацию
    if (!user) return handleRegistration(userId, chatId, text, msg, "tj");

    // 3. Определяем язык
    let lang = user.lang;
    if (!TEXT[lang]) lang = "tj";
    const L = TEXT[lang];

    // 4. Проверка на флуд (Rate Limit)
    // Делаем проверку только если это не команда
    const isBasicCommand = text === "/start" || L.menu.flat().includes(text);
    if (!isBasicCommand && !checkRateLimit(userId)) { // Проверяем по UserID, так надежнее
      TG.sendMessage(chatId, L.wait_msg);
      return;
    }

    // 5. Обработка ФОТО (Admin ID или Анализ товара)
    if (msg.photo) {
       const photo = msg.photo[msg.photo.length - 1];

       // Админ получает ID файла
       if (CONFIG.ADMIN_IDS.includes(userId)) {
          TG.sendMessage(chatId, `🆔 ID: <code>${photo.file_id}</code>`);
          return;
       }

       // 📊 Логируем запрос AI Vision
       logStats("AI_VISION", userId, msg.caption || "фото без подписи");

       // Пользователь получает анализ AI (Groq Vision - FREE!)
       TG.send("sendChatAction", { chat_id: chatId, action: "typing" });
       
       // Try Groq Vision first (FREE)
       let analysis = askGroqVision(photo.file_id, msg.caption, lang);
       
       // Fallback to Gemini if Groq fails
       if (!analysis) {
         analysis = askAiVision(photo.file_id, msg.caption, lang);
       }

       if (analysis) {
          TG.sendMessage(chatId, `🤖 <b>AI:</b>\n\n${analysis}`);
       } else {
          TG.sendMessage(chatId, lang === 'ru' ? "Ошибка анализа." : "Хатогӣ дар таҳлил.");
       }
       return;
    }
    // ═══════════════════════════════════════════════════════════
    // 5.1. 🎙️ ОБРАБОТКА ГОЛОСОВЫХ СООБЩЕНИЙ
    // ═══════════════════════════════════════════════════════════
    if (msg.voice) {
       // Показываем статус "печатает..."
       TG.send("sendChatAction", { chat_id: chatId, action: "typing" });

       logStats("VOICE_MSG", userId, `${msg.voice.duration}s`);

       // Try Groq AI first (FREE!) - note: Groq doesn't support audio yet, use Gemini
       const voiceResponse = askAiVoice(msg.voice.file_id, lang);

       if (voiceResponse) {
          TG.sendMessage(chatId, `🎙️ <b>AI:</b>\n\n${voiceResponse}`);
       } else {
          const errMsg = lang === 'ru'
            ? "⚠️ Не удалось распознать голосовое сообщение. Попробуйте написать текстом или перезаписать аудио."
            : "⚠️ Овозро фаҳмида натавонистам. Лутфан, матн нависед ё аудиоро аз нав сабт кунед.";
          TG.sendMessage(chatId, errMsg);
       }
       return;
    }

    // 5.2. 🎵 ОБРАБОТКА АУДИОФАЙЛОВ (mp3, m4a и т.д.)
    if (msg.audio) {
       TG.send("sendChatAction", { chat_id: chatId, action: "typing" });
       
       // 📊 Логируем
   logStats("VOICE_MSG", userId, "audio: " + (msg.audio.file_name || "file"));
       
       const audioResponse = askAiVoice(msg.audio.file_id, lang);
       
       if (audioResponse) {
          TG.sendMessage(chatId, `🎵 <b>AI:</b>\n\n${audioResponse}`);
       } else {
          const errMsg = lang === 'ru' 
            ? "⚠️ Не удалось обработать аудио."
            : "⚠️ Аудиоро коркард карда натавонистам.";
          TG.sendMessage(chatId, errMsg);
       }
       return;
    }

    // 5.3. 🎤 ВИДЕОСООБЩЕНИЯ (кружочки) — извлекаем только аудио
    if (msg.video_note) {
       TG.send("sendChatAction", { chat_id: chatId, action: "typing" });
       
       // 📊 Логируем
   logStats("VOICE_MSG", userId, "video_note: " + msg.video_note.duration + "s");
       
       const videoNoteResponse = askAiVoice(msg.video_note.file_id, lang);
       
       if (videoNoteResponse) {
          TG.sendMessage(chatId, `🎤 <b>AI:</b>\n\n${videoNoteResponse}`);
       } else {
          const errMsg = lang === 'ru' 
            ? "⚠️ Не удалось распознать видеосообщение."
            : "⚠️ Видеопаёмро фаҳмида натавонистам.";
          TG.sendMessage(chatId, errMsg);
       }
       return;
    }
    
    // 6. Проверка состояний (state)
    const state = CacheService.getScriptCache().get(`state:${userId}`);
    
    if (text === L.btn_cancel) {
       CacheService.getScriptCache().remove(`state:${userId}`);
       sendMenu(chatId, L);
       return;
    }

    if (state === STATE.CHANGE_LANG) {
       let newLang = "tj";
       if (text.includes("Русский") || text.includes("🇷🇺")) newLang = "ru";
       DB.updateUser(userId, "lang", newLang);
       CacheService.getScriptCache().remove(`state:${userId}`);
       const NewL = TEXT[newLang];
       TG.sendMessage(chatId, NewL.updated);
       sendMenu(chatId, NewL);
       return;
    }

    if (state === STATE.EDIT_NAME) {
       const cleanName = text.replace(/[^a-zA-Z\s]/g, "").trim();
       if (cleanName.length < 3) { TG.sendMessage(chatId, L.err_name); return; }
       DB.updateUser(userId, "name", cleanName);
       CacheService.getScriptCache().remove(`state:${userId}`);
       TG.sendMessage(chatId, L.updated);
       sendMenu(chatId, L);
       return;
    }

    if (state === STATE.EDIT_PHONE) {
       let phone = msg.contact ? msg.contact.phone_number : text;
       phone = phone.replace(/\D/g, "");
       if (phone.length < 9) { TG.sendMessage(chatId, L.err_phone); return; }
       if (!phone.startsWith("+")) phone = "+" + phone;
       DB.updateUser(userId, "phone", phone);
       CacheService.getScriptCache().remove(`state:${userId}`);
       TG.sendMessage(chatId, L.updated);
       sendMenu(chatId, L);
       return;
    }

    if (state === STATE.WAIT_TRACK) {
       handleTrackSearch(chatId, userId, text, L);
       CacheService.getScriptCache().remove(`state:${userId}`);
       return;
    }
    
    // 7. Главное меню и команды
    if (text === "/start") { 
       TG.sendMessage(chatId, L.welcome(user.name)); 
       sendMenu(chatId, L); 
       return; 
    }

    // Проверка кнопок меню
    switch (text) {
    	case "/stats": // 📊 Команда для админов
    if (CONFIG.ADMIN_IDS.includes(userId)) {
      const report = getStatsReport();
      TG.sendMessage(chatId, report);
    }
    return;
      case L.menu[0][0]: // Поиск
        CacheService.getScriptCache().put(`state:${userId}`, STATE.WAIT_TRACK, 600);
        TG.sendPhoto(chatId, IMAGES.SEARCH, L.ask_track || "Введите код:", { reply_markup: JSON.stringify({ keyboard: [[{text: L.btn_cancel}]], resize_keyboard: true }) });
        return;
      case L.menu[0][1]: // История
        const hist = (user.history || "").split(",").filter(Boolean).join("\n");
        TG.sendMessage(chatId, hist ? `📦 <b>History:</b>\n${hist}` : "📭 Empty");
        return;
      case L.menu[1][0]: // Китай
        const cleanPhone = String(user.phone || '').replace(/\D/g, '').replace(/^992/, '');
  TG.sendPhoto(chatId, IMAGES.CHINA, L.addr_cn(user.clientId, user.name.toLowerCase(), cleanPhone));
  return;
      case L.menu[1][1]: // Хуросон
        TG.sendPhoto(chatId, IMAGES.KHUROSON, L.addr_tj);
        return;
      case L.menu[2][0]: // Тарифы
        TG.sendPhoto(chatId, IMAGES.PRICE, L.price_caption);
        return;
      case L.menu[2][1]: // Запрещенка
        TG.sendPhoto(chatId, IMAGES.BANNED, L.banned_caption);
        return;
            case L.menu[3][0]: // Профиль
        const displayPhone = String(user.phone || '');
        // ВАЖНО: Вставь сюда свой Web App URL от Google Deploy (заканчивается на /exec)
        const webAppUrl = CONFIG.WEBAPP_URL; 
        // 🚀 МАГИЯ: Приклеиваем ID юзера прямо к ссылке!
                const finalUrl = webAppUrl + "?uid=" + user.id;
        
        const kb = { inline_keyboard: [
           // Кнопка Web App
           [{text: "⚙️ Открыть настройки", web_app: { url: finalUrl }}],
           [{text: L.btn_change_lang, callback_data: "change_lang"}]
        ]};
        TG.sendMessage(chatId, L.profile(user.clientId, user.name, displayPhone), { reply_markup: JSON.stringify(kb) });
        return;
      case L.menu[3][1]: // Админ
        TG.sendMessage(chatId, `📞 Admin: ${CONFIG.ADMIN_LINK}`);
        return;
    }
    
        // 📢 РАССЫЛКА (Только для админов)
    if (text.startsWith("/broadcast ") && CONFIG.ADMIN_IDS.includes(userId)) {
      const messageToBroadcast = text.replace("/broadcast ", "").trim();
      if (messageToBroadcast.length < 2) return;
      
      // Запускаем асинхронную задачу
      startBroadcastTask(messageToBroadcast, userId);
      TG.sendMessage(chatId, `⏳ <b>Рассылка запущена!</b>\nБот отправляет сообщения фоном (по 50 шт/мин). Вы получите отчет по завершению.\n\n<i>Для остановки напишите: /stop_broadcast</i>`);
      
      return ContentService.createTextOutput("OK");
    }

    // 🛑 ОСТАНОВКА РАССЫЛКИ
    if (text === "/stop_broadcast" && CONFIG.ADMIN_IDS.includes(userId)) {
      stopBroadcastTask();
      TG.sendMessage(chatId, `🛑 Рассылка принудительно остановлена.`);
      return ContentService.createTextOutput("OK");
    }

    // 🔧 АДМИН ПАНЕЛЬ (только для админов)
    if (text === "/admin" && CONFIG.ADMIN_IDS.includes(userId)) {
      showAdminPanel(chatId, userId);
      return;
    }

    // 📊 ГРУППОВОЕ ОБНОВЛЕНИЕ (только для админов)
    if (text.startsWith("/bulk ") && CONFIG.ADMIN_IDS.includes(userId)) {
      const command = text.replace("/bulk ", "").trim();
      handleBulkUpdate(chatId, userId, command);
      return;
    }

    // 👤 ПОЛУЧИТЬ ID (для всех)
    if (text === "/id") {
      TG.sendMessage(chatId, `🆔 <b>Ваш ID:</b> <code>${userId}</code>\n\nСкопируйте и добавьте в Script Properties → ADMIN_IDS`);
      return;
    }

    // 8. 🤖 AI ОТВЕТ (Если это просто текст)
    if (text.length > 3) {
       TG.send("sendChatAction", { chat_id: chatId, action: "typing" });
       logStats("AI_TEXT", userId, text.substring(0, 50));
       
       // Try Groq AI first (FREE! - 30 req/min, very fast)
       let aiAnswer = askGroqAI(text, lang);
       
       // Fallback to Gemini if Groq fails (rate limit or error)
       if (!aiAnswer) {
         aiAnswer = askAiText(text, lang);
       }
       
       if (aiAnswer) {
          TG.sendMessage(chatId, aiAnswer);
       } else {
          // Если AI не ответил или ошибка — показываем меню
          sendMenu(chatId, L);
       }
       return;
    }

    // Если ничего не подошло
    sendMenu(chatId, L);

  } catch (err) {
    logErrorToSheet("SYSTEM_POST", "Fatal Error", err.toString());
    if (CONFIG.ADMIN_IDS[0]) {
       TG.sendMessage(CONFIG.ADMIN_IDS[0], `🚨 <b>Bot Error:</b>\n${err.message}`);
    }
  }
  return ContentService.createTextOutput("OK");
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

/**
 * Handle incoming message
 */
function handleMessage(msg) {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const text = (msg.text || "").trim();

  // Log
  try {
    logToSheet("DEBUG", "handleMessage", userId, `text="${text}"`, `chatId=${chatId}`);
  } catch (e) {}

  // Get or register user
  let user = DB.getUser(userId);

  try {
    logToSheet("DEBUG", "handleMessage", userId, 
      `user=${user ? "FOUND" : "NOT FOUND"}`, 
      `lang=${user?.lang || 'N/A'}`);
  } catch (e) {}

  if (!user) {
    try {
      logToSheet("INFO", "handleMessage", userId, "Starting registration", "");
    } catch (e) {}
    return handleRegistration(userId, chatId, text, msg);
  }

  // Get localization
  const lang = user.lang || "tj";
  const L = getLocalization(lang);

  try {
    logToSheet("DEBUG", "handleMessage", userId, `lang=${lang}`, "");
  } catch (e) {}

  // Rate limiting (exclude basic commands)
  const isBasicCommand = text === "/start" || L.menu.flat().includes(text);
  if (!isBasicCommand && !checkRateLimit(userId)) {
    TG.sendMessage(chatId, L.wait_msg);
    return;
  }

  // Route by message type
  if (msg.photo) return handlePhotoMessage(msg, chatId, userId, lang);
  if (msg.voice) return handleVoiceMessage(msg, chatId, userId, lang);
  if (msg.audio) return handleAudioMessage(msg, chatId, userId, lang);
  if (msg.video_note) return handleVideoNoteMessage(msg, chatId, userId, lang);

  // Handle text message
  return handleTextMessage(msg, chatId, userId, text, user, L);
}

// ============================================================================
// MESSAGE TYPE HANDLERS
// ============================================================================

function handlePhotoMessage(msg, chatId, userId, lang) {
  const photo = msg.photo[msg.photo.length - 1];

  if (CONFIG.ADMIN_IDS.includes(userId)) {
    TG.sendMessage(chatId, `🆔 ID: <code>${photo.file_id}</code>`);
    return;
  }

  logStats("AI_VISION", userId, msg.caption || "фото без подписи");
  TG.sendChatAction(chatId, "typing");

  // Try Groq Vision first (FREE!)
  let analysis = askGroqVision(photo.file_id, msg.caption, lang);
  
  // Fallback to Gemini if Groq fails
  if (!analysis) {
    analysis = askAiVision(photo.file_id, msg.caption, lang);
  }

  if (analysis) {
    TG.sendMessage(chatId, `🤖 <b>AI:</b>\n\n${analysis}`);
  } else {
    TG.sendMessage(chatId, lang === 'ru' ? "Ошибка анализа." : "Хатогӣ дар таҳлил.");
  }
}

function handleVoiceMessage(msg, chatId, userId, lang) {
  TG.sendChatAction(chatId, "typing");
  logStats("VOICE_MSG", userId, `${msg.voice.duration}s`);

  const response = askAiVoice(msg.voice.file_id, lang);

  if (response) {
    TG.sendMessage(chatId, `🎙️ <b>AI:</b>\n\n${response}`);
  } else {
    TG.sendMessage(chatId, lang === 'ru'
      ? "⚠️ Не удалось распознать голосовое сообщение."
      : "⚠️ Овозро фаҳмида натавонистам.");
  }
}

function handleAudioMessage(msg, chatId, userId, lang) {
  TG.sendChatAction(chatId, "typing");
  logStats("VOICE_MSG", userId, `audio: ${msg.audio.file_name || "file"}`);

  const response = askAiVoice(msg.audio.file_id, lang);

  if (response) {
    TG.sendMessage(chatId, `🎵 <b>AI:</b>\n\n${response}`);
  } else {
    TG.sendMessage(chatId, lang === 'ru'
      ? "⚠️ Не удалось обработать аудио."
      : "⚠️ Аудиоро коркард карда натавонистам.");
  }
}

function handleVideoNoteMessage(msg, chatId, userId, lang) {
  TG.sendChatAction(chatId, "typing");
  logStats("VOICE_MSG", userId, `video_note: ${msg.video_note.duration}s`);

  const response = askAiVoice(msg.video_note.file_id, lang);

  if (response) {
    TG.sendMessage(chatId, `🎤 <b>AI:</b>\n\n${response}`);
  } else {
    TG.sendMessage(chatId, lang === 'ru'
      ? "⚠️ Не удалось распознать видеосообщение."
      : "⚠️ Видеопаёмро фаҳмида натавонистам.");
  }
}

// ============================================================================
// TEXT MESSAGE HANDLER
// ============================================================================

function handleTextMessage(msg, chatId, userId, text, user, L) {
  const cache = CacheService.getScriptCache();

  try {
    logToSheet("DEBUG", "handleTextMessage", userId, `text="${text}"`, `lang=${user.lang}`);
  } catch (e) {}

  const state = cache.get(`state:${userId}`);

  try {
    logToSheet("DEBUG", "handleTextMessage", userId, `state=${state || 'none'}`, "");
  } catch (e) {}

  // Cancel button
  if (text === L.btn_cancel && state) {
    cache.remove(`state:${userId}`);
    sendMenu(chatId, L);
    return;
  }

  // State handlers
  if (state) {
    return handleStateMessage(chatId, userId, text, msg, state, L);
  }

  // Commands
  if (text === "/start") {
    try {
      logToSheet("INFO", "handleTextMessage", userId, "/start command", "");
    } catch (e) {}
    TG.sendMessage(chatId, L.welcome(user.name));
    sendMenu(chatId, L);
    return;
  }

  // Admin stats
  if (text === "/stats" && CONFIG.ADMIN_IDS.includes(userId)) {
    TG.sendMessage(chatId, getStatsReport());
    return;
  }

  // Admin broadcast
  if (text.startsWith("/broadcast ") && CONFIG.ADMIN_IDS.includes(userId)) {
    return handleBroadcast(text, userId);
  }

  // Stop broadcast
  if (text === "/stop_broadcast" && CONFIG.ADMIN_IDS.includes(userId)) {
    stopBroadcastTask();
    TG.sendMessage(chatId, "🛑 Рассылка принудительно остановлена.");
    return;
  }

  // Menu buttons
  return handleMenuCommand(chatId, userId, text, user, L);
}

// ============================================================================
// STATE HANDLER
// ============================================================================

function handleStateMessage(chatId, userId, text, msg, state, L) {
  const cache = CacheService.getScriptCache();

  switch (state) {
    case STATE.CHANGE_LANG:
      let newLang = "tj";
      if (text.includes("Русский") || text.includes("🇷🇺")) newLang = "ru";
      DB.updateUser(userId, "lang", newLang);
      cache.remove(`state:${userId}`);
      const NewL = getLocalization(newLang);
      TG.sendMessage(chatId, NewL.updated);
      sendMenu(chatId, NewL);
      break;

    case STATE.EDIT_NAME:
      const cleanName = text.replace(/[^a-zA-Z\s]/g, "").trim();
      if (cleanName.length < 3) {
        TG.sendMessage(chatId, L.err_name);
        return;
      }
      DB.updateUser(userId, "name", cleanName);
      cache.remove(`state:${userId}`);
      TG.sendMessage(chatId, L.updated);
      sendMenu(chatId, L);
      break;

    case STATE.EDIT_PHONE:
      let phone = msg.contact ? msg.contact.phone_number : text;
      phone = phone.replace(/\D/g, "");
      if (phone.length < 9) {
        TG.sendMessage(chatId, L.err_phone);
        return;
      }
      if (!phone.startsWith("+")) phone = "+" + phone;
      DB.updateUser(userId, "phone", phone);
      cache.remove(`state:${userId}`);
      TG.sendMessage(chatId, L.updated);
      sendMenu(chatId, L);
      break;

    case STATE.WAIT_TRACK:
      handleTrackSearch(chatId, userId, text, L);
      cache.remove(`state:${userId}`);
      break;
  }
}

// ============================================================================
// MENU COMMAND HANDLER
// ============================================================================

function handleMenuCommand(chatId, userId, text, user, L) {
  const menu = L.menu;

  try {
    logToSheet("DEBUG", "handleMenuCommand", userId, `text="${text}"`, `menu=${JSON.stringify(menu)}`);
  } catch (e) {}

  // Search
  if (text === menu[0][0]) {
    CacheService.getScriptCache().put(`state:${userId}`, STATE.WAIT_TRACK, 600);
    TG.sendPhoto(chatId, IMAGES.SEARCH, L.ask_track || "Введите код:", {
      reply_markup: JSON.stringify({
        keyboard: [[{ text: L.btn_cancel }]],
        resize_keyboard: true
      })
    });
    return;
  }

  // History
  if (text === menu[0][1]) {
    const hist = (user.history || "").split(",").filter(Boolean).join("\n");
    TG.sendMessage(chatId, hist ? `📦 <b>History:</b>\n${hist}` : "📭 Empty");
    return;
  }

  // China Address
  if (text === menu[1][0]) {
    const cleanPhone = String(user.phone || '').replace(/\D/g, '').replace(/^992/, '');
    TG.sendPhoto(chatId, IMAGES.CHINA, L.addr_cn(user.clientId, user.name.toLowerCase(), cleanPhone));
    return;
  }

  // Khuroson Address
  if (text === menu[1][1]) {
    TG.sendPhoto(chatId, IMAGES.KHUROSON, L.addr_tj);
    return;
  }

  // Prices
  if (text === menu[2][0]) {
    TG.sendPhoto(chatId, IMAGES.PRICE, L.price_caption);
    return;
  }

  // Banned
  if (text === menu[2][1]) {
    TG.sendPhoto(chatId, IMAGES.BANNED, L.banned_caption);
    return;
  }

  // Profile
  if (text === menu[3][0]) {
    return handleProfileCommand(chatId, userId, user, L);
  }

  // Admin
  if (text === menu[3][1]) {
    TG.sendMessage(chatId, `📞 Admin: ${CONFIG.ADMIN_LINK}`);
    return;
  }

  // AI text response
  if (text.length > 3) {
    return handleAIResponse(chatId, userId, text, L);
  }

  // Default: show menu
  sendMenu(chatId, L);
}

// ============================================================================
// PROFILE COMMAND
// ============================================================================

function handleProfileCommand(chatId, userId, user, L) {
  if (!CONFIG.WEBAPP_URL) {
    TG.sendMessage(chatId, "⚠️ WEBAPP_URL не настроен!");
    return;
  }

  const displayPhone = String(user.phone || '');
  const webAppUrl = CONFIG.WEBAPP_URL + "?uid=" + user.id;

  const keyboard = {
    inline_keyboard: [
      [{ text: "⚙️ Открыть настройки", web_app: { url: webAppUrl } }],
      [{ text: L.btn_change_lang, callback_data: "change_lang" }]
    ]
  };

  TG.sendMessage(chatId, L.profile(user.clientId, user.name, displayPhone), {
    reply_markup: JSON.stringify(keyboard)
  });
}

// ============================================================================
// AI RESPONSE
// ============================================================================

function handleAIResponse(chatId, userId, text, L) {
  TG.sendChatAction(chatId, "typing");
  logStats("AI_TEXT", userId, text.substring(0, 50));

  // Try Groq AI first (FREE! - 30 req/min)
  let answer = askGroqAI(text, L);
  
  // Fallback to Gemini if Groq fails
  if (!answer) {
    answer = askAiText(text, L);
  }

  if (answer) {
    TG.sendMessage(chatId, answer);
  } else {
    sendMenu(chatId, L);
  }
}

// ============================================================================
// BROADCAST HANDLER
// ============================================================================

function handleBroadcast(text, userId) {
  const message = text.replace("/broadcast ", "").trim();

  if (message.length < 2) {
    return ContentService.createTextOutput("OK");
  }

  startBroadcastTask(message, userId);

  TG.sendMessage(userId,
    `⏳ <b>Рассылка запущена!</b>\n` +
    `Бот отправляет сообщения фоном (по 60 шт/мин).\n` +
    `<i>Для остановки напишите: /stop_broadcast</i>`
  );

  return ContentService.createTextOutput("OK");
}

// ============================================================================
// CALLBACK HANDLER
// ============================================================================

function handleCallback(cb) {
  const userId = String(cb.from.id);
  const chatId = cb.message.chat.id;
  const data = cb.data;

  const user = DB.getUser(userId);
  const lang = user ? user.lang : "tj";
  const L = getLocalization(lang);

  TG.answerCallback(cb.id);

  const cache = CacheService.getScriptCache();

  switch (data) {
    case "edit_name":
      cache.put(`state:${userId}`, STATE.EDIT_NAME, 600);
      TG.sendMessage(chatId, L.ask_new_name, {
        reply_markup: JSON.stringify({
          keyboard: [[{ text: L.btn_cancel }]],
          resize_keyboard: true
        })
      });
      break;

    case "edit_phone":
      cache.put(`state:${userId}`, STATE.EDIT_PHONE, 600);
      TG.sendMessage(chatId, L.ask_new_phone, {
        reply_markup: JSON.stringify({
          keyboard: [[{ text: L.btn_phone, request_contact: true }], [{ text: L.btn_cancel }]],
          resize_keyboard: true
        })
      });
      break;

    case "change_lang":
      cache.put(`state:${userId}`, STATE.CHANGE_LANG, 600);
      TG.sendMessage(chatId, L.choose_lang, {
        reply_markup: JSON.stringify({
          keyboard: [[{ text: "Русский 🇷🇺" }, { text: "Тоҷикӣ 🇹🇯" }], [{ text: L.btn_cancel }]],
          resize_keyboard: true
        })
      });
      break;
  }

  return ContentService.createTextOutput("OK");
}

// ============================================================================
// REGISTRATION HANDLER
// ============================================================================

function handleRegistration(userId, chatId, text, msg) {
  const cache = CacheService.getScriptCache();
  const step = cache.get(`reg_step:${userId}`);

  // Step 0: Language selection
  if (!step) {
    cache.put(`reg_step:${userId}`, STATE.REG_LANG, 900);

    TG.sendMessage(chatId, "🌐 <b>Забонро интихоб кунед / Выберите язык:</b>", {
      reply_markup: JSON.stringify({
        keyboard: [[{ text: "🇷🇺 Русский" }, { text: "🇹🇯 Тоҷикӣ" }]],
        resize_keyboard: true,
        one_time_keyboard: true
      })
    });
    return;
  }

  // Step 1: Save language
  if (step === STATE.REG_LANG) {
    let selectedLang = "tj";
    if (text.includes("Русский") || text.includes("🇷🇺")) {
      selectedLang = "ru";
    }

    cache.put(`reg_lang:${userId}`, selectedLang, 900);
    cache.put(`reg_step:${userId}`, STATE.REG_NAME, 900);

    const L = getLocalization(selectedLang);
    TG.sendMessage(chatId, L.ask_name, {
      reply_markup: JSON.stringify({ remove_keyboard: true })
    });
    return;
  }

  // Step 2: Save name
  if (step === STATE.REG_NAME) {
    const lang = cache.get(`reg_lang:${userId}`) || "tj";
    const L = getLocalization(lang);

    const name = text.replace(/[^a-zA-Z\s]/g, "").trim();
    if (name.length < 3) {
      TG.sendMessage(chatId, L.err_name);
      return;
    }

    cache.put(`reg_name:${userId}`, name, 900);
    cache.put(`reg_step:${userId}`, STATE.REG_PHONE, 900);

    TG.sendMessage(chatId, L.ask_phone, {
      reply_markup: JSON.stringify({
        keyboard: [[{ text: L.btn_phone, request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      })
    });
    return;
  }

  // Step 3: Complete registration
  if (step === STATE.REG_PHONE) {
    completeRegistration(userId, chatId, text, msg);
  }
}

// ============================================================================
// COMPLETE REGISTRATION
// ============================================================================

function completeRegistration(userId, chatId, text, msg) {
  const cache = CacheService.getScriptCache();
  const lang = cache.get(`reg_lang:${userId}`) || "tj";
  const L = getLocalization(lang);

  let phone = msg.contact ? msg.contact.phone_number : text;
  phone = String(phone).replace(/\D/g, "");

  if (phone.length < 9) {
    TG.sendMessage(chatId, L.err_phone);
    return;
  }

  if (!phone.startsWith("+")) phone = "+" + phone;

  const name = cache.get(`reg_name:${userId}`);

  const result = DB.saveUser(userId, name, phone, lang);

  if (!result.success) {
    TG.sendMessage(chatId, `❌ Ошибка регистрации: ${result.error}`);
    return;
  }

  cache.remove(`reg_name:${userId}`);
  cache.remove(`reg_lang:${userId}`);

  logStats("NEW_USER", userId, `${name} | ${phone} | ${lang}`);

  TG.sendMessage(chatId, L.reg_success, {
    reply_markup: JSON.stringify({ remove_keyboard: true })
  });

  TG.sendMessage(chatId, L.welcome(name));
  sendMenu(chatId, L);
}

// ============================================================================
// TRACK SEARCH HANDLER
// ============================================================================

function handleTrackSearch(chatId, userId, text, L) {
  logStats("TRACK_SEARCH", userId, text);
  TG.sendMessage(chatId, "🔍 ...");

  const codes = text.split(/[\s,]+/)
    .map(c => c.trim().toUpperCase())
    .filter(c => c.length > 3);

  if (codes.length === 0) {
    TG.sendMessage(chatId, L.track_404("?"));
    sendMenu(chatId, L);
    return;
  }

  const results = SearchEngine.find(codes);
  let hasFound = false;

  results.forEach(res => {
    if (res.found) {
      TG.sendMessage(chatId, L.track_found(res.code, res.date, res.weight));
      hasFound = true;
    } else {
      TG.sendMessage(chatId, L.track_404(res.code));
    }
  });

  if (hasFound) {
    const foundCodes = results.filter(r => r.found).map(r => r.code);
    DB.updateHistory(userId, foundCodes);
  }

  sendMenu(chatId, L);
}

// ============================================================================
// MENU SENDER
// ============================================================================

function sendMenu(chatId, L) {
  TG.sendMessage(chatId, L.menu_title, {
    reply_markup: JSON.stringify({
      keyboard: L.menu.map(row => row.map(btn => ({ text: btn }))),
      resize_keyboard: true
    })
  });
}
