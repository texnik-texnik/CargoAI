#!/bin/bash
# Khuroson Cargo Bot - Auto Deploy (Full Automatic)
# Usage: bash auto-deploy.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Khuroson Cargo Bot - Auto Deploy                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

cd "$(dirname "${BASH_SOURCE[0]}")"

# Step 1: Push
echo -e "${BLUE}[1/4]${NC} Pushing code..."
clasp push 2>&1 | tail -3
echo -e "${GREEN}✅ Pushed${NC}"
echo ""

# Step 2: Deploy
echo -e "${BLUE}[2/4]${NC} Creating deployment..."
DEPLOY_OUTPUT=$(clasp deploy 2>&1)
DEPLOY_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Deployed \K[a-zA-Z0-9_-]+')

if [ -z "$DEPLOY_ID" ]; then
    echo -e "${RED}❌ Could not get deployment ID${NC}"
    exit 1
fi

WEBAPP_URL="https://script.google.com/macros/s/${DEPLOY_ID}/exec"
echo -e "${GREEN}✅ Deployment created${NC}"
echo -e "${CYAN}   ${WEBAPP_URL}${NC}"
echo ""

# Step 3: Update Properties via clasp run
echo -e "${BLUE}[3/4]${NC} Updating WEBAPP_URL..."

# Escape URL for shell
ESCAPED_URL=$(echo "$WEBAPP_URL" | sed 's/[&/\]/\\&/g')

# Run update function
RESULT=$(clasp run "updateWebAppUrl('${WEBAPP_URL}')" 2>&1) || true

if echo "$RESULT" | grep -q "WEBAPP_URL updated"; then
    echo -e "${GREEN}✅ Properties updated${NC}"
    echo "$RESULT" | grep -E "(WEBAPP_URL|Webhook)" | head -3
else
    echo -e "${YELLOW}⚠️  Auto-update failed${NC}"
    echo -e "${YELLOW}Manual: Run in Apps Script editor:${NC}"
    echo ""
    echo -e "   ${CYAN}updateWebAppUrl('${WEBAPP_URL}')${NC}"
    echo ""
fi
echo ""

# Step 4: Verify
echo -e "${BLUE}[4/4]${NC} Verifying..."
clasp run "checkWebhookStatus()" 2>&1 | grep -E "(URL:|Last update:|Pending)" | head -3 || true
echo ""

# Save URL
echo "$WEBAPP_URL" > .last_deploy_url.txt

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC}  ${BLUE}${WEBAPP_URL}${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Bot updated!${NC}"
echo ""
echo -e "${YELLOW}📊 Logs:${NC} Google Sheet → 'Errors' tab"
echo -e "${YELLOW}📝 Test:${NC} Send /start to your bot"
echo ""
