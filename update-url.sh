#!/bin/bash
# Quick update WEBAPP_URL - uses last deployed URL
# Usage: bash update-url.sh

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd "$(dirname "${BASH_SOURCE[0]}")"

# Get URL from file or deployment
if [ -f .last_deploy_url.txt ]; then
    WEBAPP_URL=$(cat .last_deploy_url.txt)
    echo -e "${CYAN}Using last deployed URL:${NC}"
    echo "${WEBAPP_URL}"
else
    echo -e "${YELLOW}No saved URL. Getting from latest deployment...${NC}"
    DEPLOY_OUTPUT=$(clasp deploy 2>&1)
    DEPLOY_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Deployed \K[a-zA-Z0-9_-]+')
    WEBAPP_URL="https://script.google.com/macros/s/${DEPLOY_ID}/exec"
    echo "$WEBAPP_URL" > .last_deploy_url.txt
fi

echo ""
echo -e "${GREEN}Now run in Apps Script editor:${NC}"
echo ""
echo -e "${CYAN}updateWebAppUrl('${WEBAPP_URL}')${NC}"
echo ""
echo -e "${YELLOW}Or copy URL to Properties manually:${NC}"
echo -e "   ${WEBAPP_URL}"
echo ""
