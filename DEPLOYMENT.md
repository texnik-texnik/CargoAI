# 🚀 Khuroson Cargo Bot - Deployment Guide

## Быстрая настройка (5 шагов)

### Шаг 1: Push кода
```bash
clasp push
```

### Шаг 2: Открыть Apps Script
1. Перейдите в [script.google.com](https://script.google.com)
2. Найдите проект "Khuroson Cargo Bot"
3. Или откройте по ссылке из `.clasp.json` (scriptId)

### Шаг 3: Инициализация
В редакторе Apps Script выполните функции по порядку:

#### 3.1 Запустить `setupBot`
- Выберите функцию `setupBot` из выпадающего списка
- Нажмите "Run" (▶️)
- Разрешите доступ при запросе
- **Скопируйте Spreadsheet ID** из лога

#### 3.2 Запустить `setProperties`
- Откройте файл `Setup.gs`
- **Отредактируйте значения** в функции `setProperties`:
  ```javascript
  TELEGRAM_TOKEN: 'YOUR_BOT_TOKEN_FROM_BOTFATHER',
  ADMIN_IDS: 'YOUR_TELEGRAM_USER_ID', // Узнать: @userinfobot
  ADMIN_LINK: 'https://t.me/your_username',
  GOOGLE_API_KEY: 'YOUR_GEMINI_API_KEY',
  // ... остальные
  ```
- Сохраните (Ctrl+S)
- Выполните функцию `setProperties`

### Шаг 4: Деплой Web App
1. В Apps Script: **Deploy** → **New deployment**
2. Type: **Web app**
3. Description: `v1`
4. Execute as: **Me**
5. Who has access: **Anyone**
6. Нажмите **Deploy**
7. **Скопируйте Web App URL**

### Шаг 5: Настроить Webhook
1. В Apps Script выполните функцию `setTelegramWebhook`
2. Или вручную в браузере:
   ```
   https://api.telegram.org/bot<TELEGRAM_TOKEN>/setWebhook?url=<WEBAPP_URL>?token=<WEBHOOK_TOKEN>
   ```

### Шаг 6: Проверка
```bash
# Проверить статус webhook
curl "https://api.telegram.org/bot<TELEGRAM_TOKEN>/getWebhookInfo"
```

Или выполните `checkWebhookStatus` в Apps Script.

---

## 📊 Просмотр логов

Логи пишутся в таблицу **"Errors"**:

1. Откройте Google Sheet (Spreadsheet ID из шага 3.1)
2. Перейдите на вкладку **"Errors"**
3. Столбцы:
   - **Timestamp** - время события
   - **Level** - DEBUG, INFO, WARN, ERROR
   - **Source** - откуда лог (WEBHOOK, handleMessage, etc.)
   - **User ID** - ID пользователя
   - **Message** - сообщение
   - **Details** - дополнительные детали

---

## 🔧 Автоматический деплой (Node.js)

Если установлен Node.js:

```bash
# Установить переменные окружения
export TELEGRAM_TOKEN="your_bot_token"
export ADMIN_IDS="your_user_id"
export GOOGLE_API_KEY="your_api_key"
export WEBHOOK_TOKEN="secure_random_string"

# Запустить деплой
node deploy.js
```

Скрипт автоматически:
1. Push код в GAS
2. Создать deployment
3. Обновить Properties
4. Настроить webhook

---

## 🐛 Решение проблем

### Бесконечный цикл / webhook
✅ **Решение:** Проверьте лист "Errors" - если видите "Recursion detected" или "Ignored message from bot", значит бот получает свои сообщения. Это нормально.

### Бот не отвечает
1. Проверьте `getWebhookInfo` - статус должен быть "ok"
2. Проверьте лист "Errors" на наличие ошибок
3. Убедитесь что TELEGRAM_TOKEN правильный

### Ошибка "Access Denied"
✅ Проверьте что `token` в webhook URL совпадает с `WEBHOOK_TOKEN` в Properties

### 401 Unauthorized
✅ Проверьте TELEGRAM_TOKEN в Properties

---

## 📁 Структура листов

| Лист | Описание |
|------|----------|
| **Users** | Зарегистрированные пользователи |
| **Logs** | Логи ошибок |
| **Stats** | Статистика действий |
| **Errors** | Детальные debug логи (новые!) |

---

## 🎯 Полезные команды

### В Apps Script:
- `setupBot()` - создать листы
- `setProperties()` - настроить свойства
- `setTelegramWebhook()` - установить webhook
- `checkWebhookStatus()` - проверить статус
- `clearOldLogs()` - очистить старые логи

### В Telegram:
- `/start` - приветственное меню
- `/stats` - статистика (админ)
- `/broadcast <message>` - рассылка (админ)
- `/stop_broadcast` - остановить рассылку

---

## 📞 Support

При проблемах:
1. Проверьте лист "Errors"
2. Проверьте `getWebhookInfo`
3. Пересоздайте deployment
4. Проверьте лимиты Google Apps Script
