/**
 * KHUROSON CARGO BOT - Configuration
 * 
 * @file Config.gs
 * @description Centralized configuration, constants, and localization
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** @type {number} Timeout for standard API requests (ms) */
const TIMEOUT_STANDARD = 30000;

/** @type {number} Timeout for file download requests (ms) */
const TIMEOUT_FILE = 60000;

/** @type {number} Timeout for AI requests (ms) */
const TIMEOUT_AI = 90000;

/** @type {number} Rate limit window (seconds) */
const RATE_LIMIT_WINDOW = 8;

/** @type {number} Cache TTL for user data (seconds) */
const CACHE_TTL_USER = 3600;

/** @type {number} Cache TTL for track files (seconds) */
const CACHE_TTL_TRACK_FILES = 600;

/** @type {number} Max history items to store */
const MAX_HISTORY_ITEMS = 10;

/** @type {number} Broadcast batch size */
const BROADCAST_BATCH_SIZE = 60;

/** @type {number} Telegram API rate limit delay (ms) */
const TELEGRAM_RATE_DELAY = 35;

// ============================================================================
// PROPERTIES & TOKENS
// ============================================================================

const PROPS = PropertiesService.getScriptProperties();
const TOKEN = PROPS.getProperty("TELEGRAM_TOKEN");

// ============================================================================
// CONFIGURATION OBJECT
// ============================================================================

/**
 * @typedef {Object} Config
 * @property {string} WEBHOOK_TOKEN - Secret token for webhook authentication
 * @property {string[]} ADMIN_IDS - List of admin user IDs
 * @property {string} ADMIN_LINK - Admin contact link
 * @property {string} WEBAPP_URL - Web app base URL
 * @property {string} SHEET_ID - Google Sheets ID
 * @property {string} FOLDER_ID - Drive folder ID for track sheets
 * @property {string} PRICE_KG - Price per kg
 * @property {string} PRICE_M3 - Price per cubic meter
 * @property {string} ADDR_KHUROSON - Khuroson warehouse address
 * @property {string} ADDR_CHINA - China warehouse address
 * @property {string} GEMINI_MODEL - Gemini AI model name
 * @property {string} GEMINI_API_KEY - Gemini API key
 * @property {number} COL_CODE - Track code column index
 * @property {number} COL_DATE - Track date column index
 * @property {number} COL_WEIGHT - Track weight column index
 */

/** @type {Config} */
const CONFIG = {
  WEBHOOK_TOKEN: PROPS.getProperty("WEBHOOK_TOKEN") || "khuroson_cargo_ai",
  ADMIN_IDS: (PROPS.getProperty("ADMIN_IDS") || "").split(",").map(id => id.trim()).filter(Boolean),
  ADMIN_LINK: PROPS.getProperty("ADMIN_LINK") || "https://t.me/username",
  WEBAPP_URL: PROPS.getProperty("WEBAPP_URL") || "",
  SHEET_ID: PROPS.getProperty("USERS_SPREADSHEET_ID"),
  FOLDER_ID: PROPS.getProperty("TRACKS_FOLDER_ID"),
  PRICE_KG: PROPS.getProperty("PRICE_KG") || "25 сомонӣ",
  PRICE_M3: PROPS.getProperty("PRICE_M3") || "270$",
  ADDR_KHUROSON: (PROPS.getProperty("KHUROSON_ADDRESS") || "н. Хуросон").split('\\n').join('\n'),
  ADDR_CHINA: (PROPS.getProperty("CHINA_ADDRESS") || "China Address...").split('\\n').join('\n'),
  GEMINI_MODEL: PROPS.getProperty("GEMINI_MODEL") || "gemini-1.5-flash",
  GEMINI_API_KEY: PROPS.getProperty("GOOGLE_API_KEY"),
  COL_CODE: parseInt(PROPS.getProperty("TRACK_COL_CODE") || "1", 10),
  COL_DATE: parseInt(PROPS.getProperty("TRACK_COL_DATE") || "7", 10),
  COL_WEIGHT: parseInt(PROPS.getProperty("TRACK_COL_WEIGHT") || "9", 10)
};

// ============================================================================
// IMAGE ASSETS (Google Drive File IDs)
// ============================================================================

/** @type {Object.<string, string>} */
const IMAGES = {
  SEARCH: PROPS.getProperty("FILE_ID_TRACK_SEARCH") || "",
  CHINA: PROPS.getProperty("FILE_ID_ADDRESS_CHINA") || "",
  KHUROSON: PROPS.getProperty("FILE_ID_LOC_KHUROSON") || "",
  PRICE: PROPS.getProperty("FILE_ID_PRICE") || "",
  BANNED: PROPS.getProperty("FILE_ID_BANNED") || ""
};

// ============================================================================
// USER STATES (Finite State Machine)
// ============================================================================

/** @enum {string} */
const STATE = {
  REG_LANG: "reg_lang",
  REG_NAME: "reg_name",
  REG_PHONE: "reg_phone",
  WAIT_TRACK: "wait_track",
  EDIT_NAME: "edit_name",
  EDIT_PHONE: "edit_phone",
  CHANGE_LANG: "change_lang"
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates that all required configuration properties are set
 * @returns {{valid: boolean, missing: string[]}}
 */
function validateConfig() {
  const required = [
    { key: "TELEGRAM_TOKEN", value: TOKEN },
    { key: "USERS_SPREADSHEET_ID", value: CONFIG.SHEET_ID },
    { key: "WEBAPP_URL", value: CONFIG.WEBAPP_URL }
  ];
  
  const missing = required.filter(prop => !prop.value).map(prop => prop.key);
  
  return {
    valid: missing.length === 0,
    missing: missing
  };
}

/**
 * Validates a phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
function isValidPhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

/**
 * Validates a name (Latin letters only, 3-50 chars)
 * @param {string} name - Name to validate
 * @returns {boolean}
 */
function isValidName(name) {
  return /^[a-zA-Z\s]{3,50}$/.test(name.trim());
}

// ============================================================================
// LOCALIZATION
// ============================================================================

/**
 * @typedef {Object} Localization
 * @property {function(string): string} welcome
 * @property {string} ask_name
 * @property {string} ask_phone
 * @property {string} btn_phone
 * @property {string} btn_cancel
 * @property {string} reg_success
 * @property {string} menu_title
 * @property {string[][]} menu
 * @property {function(string,string,string): string} addr_cn
 * @property {string} addr_tj
 * @property {string} price_caption
 * @property {string} banned_caption
 * @property {function(string,string,string): string} track_found
 * @property {function(string): string} track_404
 * @property {function(string,string,string): string} profile
 * @property {string} btn_edit_name
 * @property {string} btn_edit_phone
 * @property {string} btn_change_lang
 * @property {string} ask_new_name
 * @property {string} ask_new_phone
 * @property {string} choose_lang
 * @property {string} updated
 * @property {string} voice_error
 * @property {string} voice_too_long
 * @property {string} err_name
 * @property {string} err_phone
 * @property {string} wait_msg
 */

/** @type {Object.<string, Localization>} */
const TEXT = {
  ru: {
    welcome: (n) => `Ассалому алейкум, ${n}!`,
    ask_name: "Введите ваше имя (латиницей, например: Emomali):",
    ask_phone: "Нажмите кнопку ниже, чтобы отправить номер телефона или напишите вручную:",
    btn_phone: "📱 Отправить номер",
    btn_cancel: "❌ Отмена",
    reg_success: "✅ Вы успешно зарегистрированы!",
    menu_title: "Выберите действие:",
    menu: [
      ["🔍 Проверить трек", "📦 Мои треки"],
      ["🇨🇳 Адрес Китай", "🇹🇯 Адрес Хуросон"],
      ["💰 Тарифы", "🚫 Запрещено"],
      ["👤 Профиль", "📞 Админ"]
    ],
    addr_cn: (clientId, n, p) => `<b>🇨🇳 Ваш адрес (Taobao/1688/Pinduoduo):</b>\n\n<code>${CONFIG.ADDR_CHINA}-${clientId}-${n}-${p}</code>\n\n👆 Нажмите, чтобы скопировровать`,
    addr_tj: `<b>🇹🇯 Наш адрес в Хуросоне:</b>\n${CONFIG.ADDR_KHUROSON}`,
    price_caption: `<b>💰 ТАРИФЫ:</b>\n\n⚖️ Вес — <b>${CONFIG.PRICE_KG}</b> / кг\n📦 Объем (1 куб) — <b>${CONFIG.PRICE_M3}</b>`,
    banned_caption: `<b>🚫 ЗАПРЕЩЕНО К ВВОЗУ:</b>\n\n🔫 Оружие и боеприпасы\n💊 Наркотики и психотропные вещества\n💥 Взрывчатка и фейерверки\n🔋 Аккумуляторы (отдельно)\n💰 Валюта и драгоценности\n🔞 Материалы 18+`,
    track_found: (c, d, w) => `✅ <b>${c}</b>\n📅 Дата: ${d}\n⚖️ Вес: ${w} кг\n📍 Статус: Принят на склад`,
    track_404: (c) => `❌ <b>${c}</b> не найден.`,
    profile: (clientId, n, p) => `👤 <b>Ваш профиль</b>\n\n🔢 Код клиента: <b>${clientId}</b>\n🔹 Имя: ${n}\n🔹 Телефон: ${p}`,
    btn_edit_name: "✏️ Изменить имя",
    btn_edit_phone: "📱 Изменить номер",
    btn_change_lang: "🌐 Изменить язык",
    ask_new_name: "Введите новое имя (латиницей):",
    ask_new_phone: "Отправьте новый номер телефона:",
    choose_lang: "Выберите новый язык / Забони навро интихоб кунед:",
    updated: "✅ Данные обновлены!",
    voice_error: "⚠️ Не удалось распознать голосовое сообщение. Попробуйте написать текстом.",
    voice_too_long: "⚠️ Аудио слишком длинное (максимум ~3 минуты).",
    err_name: "⚠️ Имя только латинскими буквами!",
    err_phone: "⚠️ Некорректный номер.",
    wait_msg: "Пожалуйста, подождите несколько секунд. 🙏"
  },
  tj: {
    welcome: (n) => `Ассалому алейкум, ${n}!`,
    ask_name: "Номи худро бо ҳарфҳои лотинӣ нависед (мас: Emomali):",
    ask_phone: "Барои равон кардани рақам тугмаро зер кунед ё ки нависед:",
    btn_phone: "📱 Рақами телефон",
    btn_cancel: "❌ Бекор кардан",
    reg_success: "✅ Шумо бомуваффақият ба қайд гирифта шудед!",
    menu_title: "Амалиётро интихоб кунед:",
    menu: [
      ["🔍 Санҷиши трек", "📦 Трекҳои ман"],
      ["🇨🇳 Адреси Хитой", "🇹🇯 Адреси Хуросон"],
      ["💰 Нархнома", "🚫 Манъшуда"],
      ["👤 Профил", "📞 Админ"]
    ],
    addr_cn: (clientId, n, p) => `<b>🇨🇳 Адреси шумо (Taobao/1688/Pinduoduo):</b>\n\n<code>${CONFIG.ADDR_CHINA}-${clientId}-${n}-${p}</code>\n\n👆 Барои нусхабардорӣ зер кунед`,
    addr_tj: `<b>🇹🇯 Адреси мо дар Хуросон:</b>\n${CONFIG.ADDR_KHUROSON}`,
    price_caption: `<b>💰 НАРХНОМА:</b>\n\n⚖️ Вазн — <b>${CONFIG.PRICE_KG}</b> / кг\n📦 Ҳаҷм (1 куб) — <b>${CONFIG.PRICE_M3}</b>`,
    banned_caption: `<b>🚫 БОРҲОИ МАНЪШУДА:</b>\n\n🔫 Яроқ ва лавозимоти ҷангӣ\n💊 Маводи мухаддир\n💥 Моддаҳои тарканда\n🔋 Аккумуляторҳо (алоҳида)\n💰 Пул ва ҷавоҳирот\n🔞 Маводҳои 18+`,
    track_found: (c, d, w) => `✅ <b>${c}</b>\n📅 Сана: ${d}\n⚖️ Вазн: ${w} кг\n📍 Статус: Дар склад`,
    track_404: (c) => `❌ <b>${c}</b> ёфт нашуд.`,
    profile: (clientId, n, p) => `👤 <b>Профили шумо</b>\n\n🔢 Рақами мизоҷ: <b>${clientId}</b>\n🔹 Ном: ${n}\n🔹 Телефон: ${p}`,
    btn_edit_name: "✏️ Иваз кардани ном",
    btn_edit_phone: "📱 Иваз кардани рақам",
    btn_change_lang: "🌐 Иваз кардани забон",
    ask_new_name: "Номи навро ворид кунед (лотинӣ):",
    ask_new_phone: "Рақами навро равон кунед:",
    choose_lang: "Забони навро интихоб кунед:",
    updated: "✅ Маълумот нав карда шуд!",
    voice_error: "⚠️ Овозро фаҳмида натавонистам. Лутфан, матн нависед.",
    voice_too_long: "⚠️ Аудио хеле дароз аст (макс. ~3 дақиқа).",
    err_name: "⚠️ Ном бояд бо ҳарфҳои лотинӣ бошад!",
    err_phone: "⚠️ Рақам нодуруст аст.",
    wait_msg: "Лутфан, чанд сония интизор шавед. 🙏"
  }
};

/**
 * Gets localization object for a language, fallback to Tajik
 * @param {string} lang - Language code
 * @returns {Localization}
 */
function getLocalization(lang) {
  return TEXT[lang] || TEXT.tj;
}
