# Khuroson Cargo Bot 🚛

Telegram бот для службы доставки Khuroson Cargo с AI поддержкой.

## 🚀 Быстрый старт

### 1. Push кода
```bash
clasp push
```

### 2. Настройка в Apps Script

Откройте [script.google.com](https://script.google.com/) → Ваш проект

Выполните функции **по порядку**:

#### ① setupBot()
```
Создаёт листы: Users, Logs, Stats, Errors
```

#### ② setProperties()
**Отредактируйте значения перед запуском!**
```javascript
TELEGRAM_TOKEN: 'BOT_TOKEN_ОТ_BOTFATHER',
ADMIN_IDS: 'ВАШ_USER_ID',
GOOGLE_API_KEY: 'GEMINI_API_KEY',
// ...
```

#### ③ Deploy Web App
1. **Deploy** → **New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Копируйте **Web App URL**

#### ④ setTelegramWebhook()
Устанавливает webhook автоматически

### 3. Проверка
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

---

## 📊 Логи

Все логи пишутся в Google Sheet → вкладка **"Errors"**

| Level | Описание |
|-------|----------|
| DEBUG | Детальная отладка |
| INFO | Важные события |
| WARN | Предупреждения |
| ERROR | Ошибки |

---

## 🔧 Функции для админов

- `/stats` - Статистика бота
- `/broadcast <текст>` - Рассылка всем пользователям
- `/stop_broadcast` - Остановить рассылку

---

## 📁 Структура проекта

```
├── Main.gs          - Обработка webhook, роутинг
├── Telegram.gs      - Telegram API wrapper
├── Database.gs      - Работа с Google Sheets
├── AI.gs            - Gemini AI integration
├── Config.gs        - Конфигурация, локализация
├── Utils.gs         - Утилиты, логирование
├── Setup.gs         - Настройка, деплой
├── WebApp.gs        - Web App для настроек
└── KhurosonCarAIminiApp.html - HTML Web App
```

---

## 🐛 Решение проблем

### Бот не отвечает
1. Проверьте `/getWebhookInfo` - статус "ok"
2. Проверьте лист "Errors" на ошибки
3. Перезапустите deployment

### Бесконечный цикл
✅ Это нормально - бот игнорирует свои сообщения (см. "Ignored message from bot" в логах)

### Ошибка доступа
Проверьте что `WEBHOOK_TOKEN` совпадает в Properties и webhook URL

---

## 📞 Поддержка

При проблемах проверьте:
1. Лист "Errors" в Google Sheet
2. `getWebhookInfo` в Telegram API
3. Execution logs в Apps Script
