#!/bin/bash
# Update Telegram Webhook - uses last deployed URL
# Usage: bash update-webhook.sh

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd "$(dirname "${BASH_SOURCE[0]}")"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  Update Telegram Webhook                           ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get URL
if [ -f .last_deploy_url.txt ]; then
    WEBAPP_URL=$(cat .last_deploy_url.txt)
    echo -e "${GREEN}✓ Web App URL:${NC}"
    echo "  ${CYAN}${WEBAPP_URL}${NC}"
else
    echo -e "${RED}✗ No URL found. Run auto-deploy.sh first${NC}"
    exit 1
fi

# Get webhook token from Properties
echo ""
echo -e "${YELLOW}Getting webhook token from Properties...${NC}"

TOKEN_RESULT=$(clasp run "Logger.log(PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN'))" 2>&1) || true
TELEGRAM_TOKEN=$(echo "$TOKEN_RESULT" | grep -oP 'Log: \K.+' | head -1)

if [ -z "$TELEGRAM_TOKEN" ]; then
    echo -e "${RED}✗ Could not get TELEGRAM_TOKEN${NC}"
    echo -e "${YELLOW}Please enter your Telegram Bot Token:${NC}"
    read -p "Token: " TELEGRAM_TOKEN
fi

WB_TOKEN_RESULT=$(clasp run "Logger.log(PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN') || 'khuroson_cargo_ai')" 2>&1) || true
WEBHOOK_TOKEN=$(echo "$WB_TOKEN_RESULT" | grep -oP 'Log: \K.+' | head -1)
[ -z "$WEBHOOK_TOKEN" ] && WEBHOOK_TOKEN="khuroson_cargo_ai"

echo -e "${GREEN}✓ Token found${NC}"

# Build webhook URL
WEBHOOK_URL="${WEBAPP_URL}?token=${WEBHOOK_TOKEN}"

echo ""
echo -e "${YELLOW}Setting webhook...${NC}"
echo "  ${CYAN}${WEBHOOK_URL}${NC}"
echo ""

# Set webhook via Telegram API
RESPONSE=$(curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=$(echo -n "$WEBHOOK_URL" | jq -sRr @uri)" 2>&1)

if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Webhook updated successfully!${NC}"
    echo ""
    
    # Get webhook info
    echo -e "${YELLOW}Verifying...${NC}"
    INFO=$(curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo")
    
    LAST_UPDATE=$(echo "$INFO" | grep -oP '"last_update_date":\K\d+' || echo "none")
    PENDING=$(echo "$INFO" | grep -oP '"pending_update_count":\K\d+' || echo "0")
    
    echo -e "   Last update: ${CYAN}${LAST_UPDATE}${NC}"
    echo -e "   Pending updates: ${CYAN}${PENDING}${NC}"
    echo ""
    echo -e "${GREEN}🎉 Bot is ready! Send /start to test${NC}"
else
    echo -e "${RED}✗ Failed to update webhook${NC}"
    echo "Response: $RESPONSE"
    echo ""
    echo -e "${YELLOW}Manual: Open in browser:${NC}"
    echo "https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=$(echo -n "$WEBHOOK_URL" | jq -sRr @uri)"
fi

echo ""
