#!/bin/bash
# Quick Webhook URL Generator
# Usage: bash webhook-url.sh

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd "$(dirname "${BASH_SOURCE[0]}")"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  Telegram Webhook URL                              ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get URL
if [ -f .last_deploy_url.txt ]; then
    WEBAPP_URL=$(cat .last_deploy_url.txt)
else
    echo -e "${RED}✗ No URL found. Run auto-deploy.sh first${NC}"
    exit 1
fi

# Get webhook token
WB_TOKEN_RESULT=$(clasp run "Logger.log(PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN') || 'khuroson_cargo_ai')" 2>&1) || true
WEBHOOK_TOKEN=$(echo "$WB_TOKEN_RESULT" | grep -oP 'Log: \K.+' | head -1)
[ -z "$WEBHOOK_TOKEN" ] && WEBHOOK_TOKEN="khuroson_cargo_ai"

# Build webhook URL
WEBHOOK_URL="${WEBAPP_URL}?token=${WEBHOOK_TOKEN}"

echo -e "${GREEN}✓ Webhook URL:${NC}"
echo ""
echo -e "${CYAN}${WEBHOOK_URL}${NC}"
echo ""

echo -e "${YELLOW}📋 Now open this in your browser:${NC}"
echo ""
echo -e "${GREEN}https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=${WEBHOOK_URL}${NC}"
echo ""
echo -e "${YELLOW}Or replace YOUR_TOKEN with your actual bot token${NC}"
echo ""

# Save full webhook URL for convenience
echo "$WEBHOOK_URL" > .webhook_url.txt
echo -e "${GREEN}✓ Saved to .webhook_url.txt${NC}"
echo ""
