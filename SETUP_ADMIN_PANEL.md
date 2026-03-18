# 🔧 Настройка ADMINPANEL_URL

## ✅ Проблема Решена

Вместо сложного получения URL через ScriptApp, мы используем простое хранение в Script Properties.

---

## 📋 Инструкция по Настройке

### Шаг 1: Получить URL Админ Панели

**Способ 1: Через Deployments**
```bash
clasp deployments
```

Найдите последний deployment:
```
Found 3 deployments.
- AKfycbzDzWhwrebDEyolMvm4qthOot3z6LLrdpj2JP5MV-ztt3nCmtWvmVNWw4dG1UzVywjbKA @188
```

URL будет:
```
https://script.google.com/macros/s/AKfycbzDzWhwrebDEyolMvm4qthOot3z6LLrdpj2JP5MV-ztt3nCmtWvmVNWw4dG1UzVywjbKA/exec
```

**Способ 2: Через GAS Editor**
```
1. Открыть: https://script.google.com/home/projects/YOUR_ID/edit
2. Нажать: Deploy → Manage Deployments
3. Найти активный deployment
4. Скопировать URL
```

---

### Шаг 2: Добавить в Script Properties

```
1. Открыть: https://script.google.com/home/projects/YOUR_ID/edit
2. Нажать: ⚙️ Settings (слева)
3. Прокрутить до: Script Properties
4. Нажать: ADD SCRIPT PROPERTY
5. Ввести:
   - Key: ADMINPANEL_URL
   - Value: https://script.google.com/macros/s/AKfycbzDzWhwrebDEyolMvm4qthOot3z6LLrdpj2JP5MV-ztt3nCmtWvmVNWw4dG1UzVywjbKA/exec
6. Save
```

---

### Шаг 3: Проверить Работу

```
1. Отправить боту: /admin
2. Если всё OK → Покажет кнопку "🔧 Открыть Админ Панель"
3. Нажать кнопку → Откроется Web App
```

---

## 🎯 Примеры

### Правильный URL:
```
✅ https://script.google.com/macros/s/AKfycbzDzWhwrebDEyolMvm4qthOot3z6LLrdpj2JP5MV-ztt3nCmtWvmVNWw4dG1UzVywjbKA/exec
```

### Неправильный URL:
```
❌ https://script.google.com/.../exec?uid=123 (не добавляйте uid)
❌ https://script.google.com/macros/s/.../dev (используйте /exec)
```

---

## 🔍 Проверка

### Test 1: Бот отвечает на /admin
```
Отправить: /admin
Ожидать: 🔧 Кнопка "Открыть Админ Панель"
```

### Test 2: Кнопка работает
```
Нажать кнопку
Ожидать: Web App открылся
```

### Test 3: Панель показывает данные
```
Открылась панель
Ожидать: Статистика (Файлов, Треков)
```

---

## ⚠️ Если Не Работает

### Ошибка: "ADMINPANEL_URL не настроен"

**Причина:** Свойство не добавлено

**Решение:**
```
1. Script Properties → ADD SCRIPT PROPERTY
2. Key: ADMINPANEL_URL
3. Value: ваш URL
4. Save
```

### Ошибка: "Access Denied"

**Причина:** Ваш ID не в ADMIN_IDS

**Решение:**
```
1. Script Properties → ADMIN_IDS
2. Добавить ваш ID
3. Save
```

### Ошибка: "Page not found"

**Причина:** Неверный URL

**Решение:**
```
1. Проверить URL (должен заканчиваться на /exec)
2. Проверить что deployment активен
3. Обновить URL в Script Properties
```

---

## 📊 Script Properties (Все)

| Key | Value | Описание |
|-----|-------|----------|
| `TELEGRAM_TOKEN` | `123456789:ABC...` | Токен бота |
| `WEBHOOK_TOKEN` | `khuroson_cargo_ai` | Токен вебхука |
| `ADMIN_IDS` | `123456789,987654321` | ID админов |
| `ADMINPANEL_URL` | `https://.../exec` | **URL админ панели** |
| `WEBAPP_URL` | `https://.../exec` | URL основного Web App |
| `USERS_SPREADSHEET_ID` | `1abc...` | Таблица пользователей |
| `TRACKS_FOLDER_ID` | `1xyz...` | Папка с треками |

---

## 🚀 Быстрая Настройка

```bash
# 1. Получить URL
clasp deployments

# 2. Скопировать URL последнего deployment

# 3. Добавить в Script Properties:
#    Key: ADMINPANEL_URL
#    Value: https://script.google.com/macros/s/AKfycbzDzWhwrebDEyolMvm4qthOot3z6LLrdpj2JP5MV-ztt3nCmtWvmVNWw4dG1UzVywjbKA/exec

# 4. Проверить:
#    Отправить /admin боту
```

---

## ✅ Готово!

Теперь `/admin` будет работать правильно! 🎉

---

**Last updated:** 2026-03-18  
**Version:** 1.1 (Using Script Properties)
