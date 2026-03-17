#!/bin/bash
# deploy.sh - Скрипт для развёртывания проекта Khuroson Cargo Bot
# Использование: ./deploy.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  KHUROSON CARGO BOT - Deploy Script${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

# Проверяем, что мы в правильной папке
if [ ! -f "Config.gs" ]; then
    echo -e "${RED}❌ Ошибка: Запустите скрипт из папки проекта${NC}"
    exit 1
fi

# Считаем файлы
GS_FILES=$(find . -maxdepth 1 -name "*.gs" | wc -l)
HTML_FILES=$(find . -maxdepth 1 -name "*.html" | wc -l)

echo -e "${YELLOW}Найдено файлов:${NC}"
echo "  • .gs файлов: $GS_FILES"
echo "  • .html файлов: $HTML_FILES"
echo ""

# Показываем список файлов
echo -e "${YELLOW}Файлы для развёртывания:${NC}"
find . -maxdepth 1 -name "*.gs" -o -name "*.html" | sort | while read file; do
    echo "  ✓ $(basename $file)"
done
echo ""

# Копируем в буфер обмена (если есть termux-clipboard-set)
if command -v termux-clipboard-set &> /dev/null; then
    echo -e "${YELLOW}Копирование имён файлов в буфер...${NC}"
    find . -maxdepth 1 -name "*.gs" -o -name "*.html" | sort | xargs basename -a | termux-clipboard-set
    echo -e "${GREEN}✅ Имена файлов скопированы в буфер${NC}"
    echo ""
fi

# Инструкция
echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo -e "${YELLOW}  СЛЕДУЮЩИЕ ШАГИ:${NC}"
echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo ""
echo "1. Открой Google Apps Script: https://script.google.com"
echo ""
echo "2. Для каждого файла:"
echo "   • Создай новый файл с таким же именем"
echo "   • Скопируй содержимое из этого проекта"
echo "   • Вставь в Google Apps Script"
echo "   • Сохрани (💾)"
echo ""
echo "3. Добавь Script Properties:"
echo "   • Настройки проекта → Свойства скрипта"
echo "   • Добавь: WEBAPP_URL = твой URL"
echo ""
echo "4. Разверни:"
echo "   • Развёртывание → Новое развёртывание"
echo "   • Тип: Веб-приложение"
echo "   • Кто имеет доступ: Все"
echo ""
echo "5. Запусти setWebhook() из редактора"
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Готово!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
