const PROPS = PropertiesService.getScriptProperties();
const TOKEN = PROPS.getProperty("SCANNER_BOT_TOKEN"); // Используйте токен НОВОГО бота
const ADMIN_IDS = (PROPS.getProperty("ADMIN_IDS") || "").split(',').map(id => id.trim());
// ID папки на Google Drive, куда будут сохраняться все фото для OCR
const UPLOAD_FOLDER_ID = PROPS.getProperty("UPLOAD_FOLDER_ID"); 
// ID вашей основной таблицы с треками, куда будем сохранять результат
const TRACKS_SPREADSHEET_ID = PROPS.getProperty("TRACKS_SPREADSHEET_ID");


// =================================
//      ГЛАВНАЯ ФУНКЦИЯ
// =================================
function doPost(e) {
  
  try {
    
    const upd = JSON.parse(e.postData.contents);
    
    if (upd.callback_query) {
      
      handleCallback(upd.callback_query);
      return;
    }
    
    const msg = upd.message;
    if (!msg) {
      
      return;
    }

    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    
    

    if (!ADMIN_IDS.includes(userId)) {
      sendMessage(chatId, "⛔️ У вас нет доступа к этому боту.");
      
      return;
    }

    if (msg.photo) {
      
      handlePhotoMessage(chatId, msg.photo);
      return;
    }
    
    const state = CacheService.getUserCache().get(userId + ":state");
    if (state === "fix_code" && msg.text) {
       
      const originalPhotoId = CacheService.getUserCache().get(userId + ":photo_id");
      const correctedCode = msg.text.trim().toUpperCase();
      saveTrackCode(correctedCode);
      sendMessage(chatId, `✅ Код ${correctedCode} сохранен. Отправьте следующее фото.`);
      CacheService.getUserCache().remove(userId + ":state");
      CacheService.getUserCache().remove(userId + ":photo_id");
      archivePhoto(originalPhotoId);
      return;
    }
    
    sendMessage(chatId, "Пожалуйста, отправьте фотографию с трек-кодом.");
    

  } catch (err) {
    // Лог №3: Ловим любую ошибку, которая произошла в процессе.
    logToSheet("FATAL ERROR in doPost", { error_message: err.message, stack: err.stack });
  }
}

// =================================
//      ОСНОВНАЯ ЛОГИКА
// =================================

/**
 * Обрабатывает входящее сообщение с фотографией.
 */
function handlePhotoMessage(chatId, photoArray) {
  sendMessage(chatId, "⏳ Фото получено, начинаю распознавание...");
  
  const bestPhoto = photoArray[photoArray.length - 1];
  const fileIdTg = bestPhoto.file_id;
  

  const savedFile = downloadFileFromTelegram(fileIdTg);
  if (!savedFile) {
    sendMessage(chatId, "❌ Не удалось загрузить фото. Попробуйте еще раз.");
    
    return;
  }
  
  
  const ocrText = extractTextFromImage_DriveOCR(savedFile.getId());
  
  
  if (!ocrText) {
    sendMessage(chatId, "❌ Не удалось распознать текст. Проверьте качество фото.");
    archivePhoto(savedFile.getId(), true);

    return;
  }
  
  const trackCode = extractTrackCodeFromText(ocrText);
  
  if (!trackCode) {
    let replyText = "❌ Не удалось найти трек-код в распознанном тексте.\n\n";
    replyText += `📄 Распознано: \n\`\`\`\n${ocrText.substring(0, 500)}\n\`\`\``;
    sendMessage(chatId, replyText, "MarkdownV2");
    archivePhoto(savedFile.getId(), true);
    return;
  }
  
  sendVerificationMessage(chatId, trackCode, savedFile.getId());
}


/**
 * Распознает текст на изображении с помощью встроенного OCR Google Drive.
 */
/**
 * Распознает текст на изображении, используя прямые вызовы Drive API v3 с OAuth2.
 */
function extractTextFromImage_DriveOCR(fileId) {
  
  try {
    const oauthToken = ScriptApp.getOAuthToken(); // Получаем токен один раз
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    

    // --- Шаг 1: Загружаем файл и сразу просим сделать OCR ---
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&ocr=true`;
    
    const metadata = {
      name: "OCR_TEMP_" + new Date().getTime(),
      mimeType: MimeType.GOOGLE_DOCS
    };
    
    const requestBody = Utilities.newBlob(
        "--foo_bar_baz\r\n" +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) + "\r\n" +
        "--foo_bar_baz\r\n" +
        "Content-Type: " + blob.getContentType() + "\r\n\r\n"
    ).getBytes().concat(blob.getBytes()).concat(Utilities.newBlob("\r\n--foo_bar_baz--").getBytes());

    const uploadResponse = UrlFetchApp.fetch(uploadUrl, {
      method: 'post',
      headers: { 'Authorization': 'Bearer ' + oauthToken }, // Используем OAuth токен
      contentType: 'multipart/related; boundary=foo_bar_baz',
      payload: requestBody,
      muteHttpExceptions: true
    });
    
    const uploadResult = JSON.parse(uploadResponse.getContentText());
    if (uploadResult.error) {
      throw new Error("Upload failed: " + uploadResult.error.message);
    }
    const tempDocId = uploadResult.id;
    

    // --- Шаг 2: Экспортируем созданный документ как простой текст ---
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${tempDocId}/export?mimeType=text/plain`;
    const exportResponse = UrlFetchApp.fetch(exportUrl, {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + oauthToken }, // Используем OAuth токен
      muteHttpExceptions: true
    });
    
    const text = exportResponse.getContentText();
    
    
    // --- Шаг 3: Удаляем временный файл ---
    const deleteUrl = `https://www.googleapis.com/drive/v3/files/${tempDocId}`;
    UrlFetchApp.fetch(deleteUrl, {
      method: 'delete',
      headers: { 'Authorization': 'Bearer ' + oauthToken }, // Используем OAuth токен
      muteHttpExceptions: true
    });
    

    return text;

  } catch (e) {
    logToSheet("OCR FATAL ERROR (OAuth2)", `Error: ${e.message}. Stack: ${e.stack}`);
    return "";
  }
}

/**
 * Извлекает трек-код из "сырого" текста с помощью регулярного выражения.
/**
 * Извлекает трек-код из "сырого" текста, пробуя несколько шаблонов по приоритету.
 * Настроена на форматы YT..., JT..., и числовые коды длиной 13-15 символов.
 */
function extractTrackCodeFromText(text) {
  if (!text) return null;

  // НЕ убираем пробелы и переносы строк сразу, чтобы сохранить структуру
  const rawText = text.toUpperCase();
  
  // --- Пробуем самые надежные шаблоны первыми ---

  // Правило №1: Ищем коды, начинающиеся с YT или JT, общей длиной 15 символов.
  // (YT|JT) - означает "YT" или "JT".
  // [A-Z0-9]{13} - означает 13 букв или цифр после префикса.
  // \b - "граница слова", чтобы не найти код внутри другого слова.
  let match = rawText.match(/\b(YT|JT)[A-Z0-9]{13}\b/);
  if (match) return match[0];

  // --- Если коды с буквами не найдены, ищем чисто цифровые ---
  
  // Правило №2: Ищем чисто цифровые коды длиной ровно 15, 14 или 13 символов.
  // Мы ищем их отдельно, чтобы случайно не обрезать более длинный код.
  // \d{15} - означает ровно 15 цифр.
  match = rawText.match(/\b\d{15}\b/);
  if (match) return match[0];
  
  match = rawText.match(/\b\d{14}\b/);
  if (match) return match[0];

  match = rawText.match(/\b\d{13}\b/);
  if (match) return match[0];

  // --- Если ничего не подошло (ЗАПАСНОЙ ВАРИАНТ) ---
  // На случай, если OCR распознает букву как цифру (например O как 0)
  // Ищем любую последовательность из 13-15 символов.
  const cleanText = rawText.replace(/[\s\n\r]/g, ''); // Теперь убираем все пробелы
  match = cleanText.match(/[A-Z0-9]{13,15}/);
  if (match) return match[0];

  return null;
}


/**
 * Сохраняет подтвержденный трек-код в Google Таблицу.
 */
function saveTrackCode(code) {
  try {
    // Открываем основную таблицу треков, находим первый лист
    const ss = SpreadsheetApp.openById(TRACKS_SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    
    // Добавляем новую строку: [трек-код, дата сохранения]
    sheet.appendRow([code, new Date()]);
    Logger.log(`Код ${code} успешно сохранен.`);
    return true;
  } catch (e) {
    Logger.log(`Ошибка при сохранении кода ${code} в таблицу: ${e.message}`);
    return false;
  }
}


// =================================
//      ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =================================

/**
 * Скачивает файл из Telegram по file_id и сохраняет его в папку на Google Drive.
 */
function downloadFileFromTelegram(fileId) {
  try {
    const fileInfoUrl = `https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`;
    const fileInfoResp = UrlFetchApp.fetch(fileInfoUrl);
    const fileInfo = JSON.parse(fileInfoResp.getContentText());
    
    if (!fileInfo.ok) {
      Logger.log("Не удалось получить информацию о файле: " + fileInfo.description);
      return null;
    }
    
    const filePath = fileInfo.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
    
    const fileBlob = UrlFetchApp.fetch(fileUrl).getBlob();
    
    const folder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
    const newFile = folder.createFile(fileBlob);
    newFile.setName(`photo_${new Date().toISOString()}.jpg`);
    
    return newFile;
  } catch (e) {
    Logger.log("Ошибка скачивания файла из Telegram: " + e.message);
    return null;
  }
}


/**
 * Отправляет сообщение с кнопками для верификации.
 */
function sendVerificationMessage(chatId, trackCode, photoId) {
  const text = `🔍 Распознан код: \`${trackCode}\`\n\nВсе верно?`;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Да, сохранить", callback_data: `confirm:${trackCode}:${photoId}` },
        { text: "✏️ Исправить", callback_data: `fix:${trackCode}:${photoId}` }
      ]
    ]
  };

  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  const payload = {
    chat_id: String(chatId),
    text: text,
    reply_markup: JSON.stringify(keyboard),
    parse_mode: "MarkdownV2"
  };
  UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify(payload) });
}


/**
 * Обрабатывает нажатия на инлайн-кнопки "Да" или "Исправить".
 */
function handleCallback(callbackQuery) {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const userId = String(callbackQuery.from.id);
  const messageId = callbackQuery.message.message_id;

  const [action, code, photoId] = data.split(':');
  
  if (action === 'confirm') {
    saveTrackCode(code);
    editMessageText(chatId, messageId, `✅ Код ${code} сохранен.`);
    archivePhoto(photoId);
  } 
  else if (action === 'fix') {
    // Устанавливаем состояние "ожидание исправления"
    CacheService.getUserCache().put(userId + ":state", "fix_code", 300); // 5 минут на ввод
    // Сохраняем ID фото, чтобы потом его заархивировать
    CacheService.getUserCache().put(userId + ":photo_id", photoId, 300);
    editMessageText(chatId, messageId, `✏️ Ожидаю правильный код... \nПожалуйста, отправьте его в следующем сообщении.`);
  }
}


/**
 * Перемещает обработанное фото в подпапку архива.
 */
function archivePhoto(fileId, isError = false) {
  try {
    const mainFolder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
    const archiveFolderName = isError ? "_archive_errors" : "_archive_processed";
    
    let archiveFolder = mainFolder.getFoldersByName(archiveFolderName);
    if (archiveFolder.hasNext()) {
      archiveFolder = archiveFolder.next();
    } else {
      archiveFolder = mainFolder.createFolder(archiveFolderName);
    }
    
    const file = DriveApp.getFileById(fileId);
    file.moveTo(archiveFolder);
  } catch (e) {
    Logger.log(`Не удалось заархивировать фото ${fileId}: ${e.message}`);
  }
}

// =================================
//      ОТПРАВКА СООБЩЕНИЙ
// =================================
function sendMessage(chatId, text, parseMode = null) {
  try {
    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    const payload = { chat_id: String(chatId), text: String(text) };
    if (parseMode) {
      payload.parse_mode = parseMode;
    }
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log(`Не удалось отправить сообщение в чат ${chatId}: ${e.message}`);
  }
}

function editMessageText(chatId, messageId, text) {
   try {
    const url = `https://api.telegram.org/bot${TOKEN}/editMessageText`;
    const payload = {
      chat_id: String(chatId),
      message_id: messageId,
      text: text,
      reply_markup: JSON.stringify({inline_keyboard: []}) // Убираем кнопки
    };
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log(`Не удалось отредактировать сообщение ${messageId} в чате ${chatId}: ${e.message}`);
  }
}

function setWebhook() {
  const url = `https://api.telegram.org/bot${TOKEN}/setWebhook?url=${ScriptApp.getService().getUrl()}`;
  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}

// =================================
//      ОТЛАДКА В ТАБЛИЦУ
// =================================

/**
 * Записывает отладочную информацию в Google Таблицу.
 * @param {string} step - Название этапа, на котором произошел вызов (например, "Start doPost", "OCR Result").
 * @param {any} data - Данные для записи. Это может быть строка, число или объект.
 */
function logToSheet(step, data) {
  try {
    // ID вашей таблицы для логов. Убедитесь, что он правильный.
    const LOG_SPREADSHEET_ID = "1Y525etwdT5JyrFnh4lCKSRkmhzoEDSWdC4MRjGelvaE"; // !!! ЗАМЕНИТЕ НА ID ВАШЕЙ ТАБЛИЦЫ !!!
    
    const ss = SpreadsheetApp.openById(LOG_SPREADSHEET_ID);
    let sheet = ss.getSheetByName("Logs");
    
    // Если листа "Logs" нет, создаем его и добавляем заголовки
    if (!sheet) {
      sheet = ss.insertSheet("Logs");
      sheet.appendRow(["Timestamp", "Step", "Data"]);
    }
    
    // Преобразуем данные в строку. Если это объект, делаем его читаемым JSON.
    let dataAsString;
    if (typeof data === 'object') {
      dataAsString = JSON.stringify(data, null, 2); // Форматированный JSON
    } else {
      dataAsString = String(data);
    }
    
    // Добавляем новую строку в таблицу
    sheet.appendRow([new Date(), step, dataAsString]);
    
  } catch (e) {
    // Если даже логирование не сработало, записываем ошибку в стандартный логгер
    Logger.log("FATAL: Could not write to log sheet. Error: " + e.message);
  }
}
