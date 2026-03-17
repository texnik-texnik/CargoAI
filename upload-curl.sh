#!/bin/bash
# upload-curl.sh - Загрузка в GAS через curl
# Требует: access_token от Google

set -e

if [ -z "$1" ]; then
    echo "Использование: ./upload-curl.sh SCRIPT_ID ACCESS_TOKEN"
    echo ""
    echo "Получить токен:"
    echo "curl -H \"Authorization: Bearer \$(gcloud auth print-access-token)\" ..."
    exit 1
fi

SCRIPT_ID=$1
ACCESS_TOKEN=$2

# Собираем все файлы в один JSON
echo "Сборка файлов..."

# Временный файл для контента
TEMP_FILE=$(mktemp)

# Начинаем JSON
echo '{"files":[' > $TEMP_FILE

FIRST=true
for file in *.gs *.html; do
    if [ -f "$file" ]; then
        # Пропускаем Combined.gs если есть другие .gs
        if [ "$file" = "Combined.gs" ] && [ $(ls *.gs | wc -l) -gt 1 ]; then
            continue
        fi
        
        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            echo ',' >> $TEMP_FILE
        fi
        
        # Определяем тип
        TYPE="SERVER_JS"
        NAME="${file%.gs}"
        if [[ "$file" == *.html ]]; then
            TYPE="HTML"
            NAME="${file%.html}"
        fi
        
        # Читаем содержимое и экранируем JSON
        CONTENT=$(cat "$file" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
        
        echo -n "{\"name\":\"$NAME\",\"type\":\"$TYPE\",\"source\":$CONTENT}" >> $TEMP_FILE
        
        echo "✅ $file"
    fi
done

# Заканчиваем JSON
echo ']}' >> $TEMP_FILE

echo ""
echo "📤 Загрузка в Google Apps Script..."

# Отправляем в GAS API
curl -X PUT \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "@$TEMP_FILE" \
  "https://script.googleapis.com/v1/projects/$SCRIPT_ID/content"

# Чистим
rm $TEMP_FILE

echo ""
echo "✅ Готово!"
