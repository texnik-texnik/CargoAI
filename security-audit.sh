#!/bin/bash
# Security Audit Script for Khuroson Cargo Bot
# Run this to check for sensitive data before pushing to GitHub

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔍 Security Audit for Khuroson Cargo Bot${NC}"
echo "=========================================="
echo ""

ISSUES=0

# Check for files that should NOT be in git
echo "📁 Checking for sensitive files..."

SENSITIVE_FILES=(
    ".env"
    ".clasp.json"
    ".claspignore"
    "oauth-credentials.json"
    "*.key"
    "*.pem"
    ".last_deploy_url.txt"
    ".webhook_url.txt"
)

for file in "${SENSITIVE_FILES[@]}"; do
    if git ls-files --error-unmatch "$file" &>/dev/null; then
        echo -e "${RED}❌ Found in git: $file${NC}"
        echo "   Run: git rm --cached $file"
        ((ISSUES++))
    fi
done

# Check for hardcoded tokens in .gs files
echo ""
echo "🔑 Checking for hardcoded tokens..."

if grep -r "GOCSPX-\|v6V3fKV\|1072944905499-" *.gs &>/dev/null; then
    echo -e "${RED}❌ Found hardcoded OAuth credentials!${NC}"
    ((ISSUES++))
fi

if grep -r "bot[0-9]\{9\}:[A-Za-z0-9_-]\+" *.gs &>/dev/null; then
    echo -e "${YELLOW}⚠️  Possible hardcoded Telegram token${NC}"
fi

# Check for API keys
echo ""
echo "🔐 Checking for API keys..."

if grep -rE "AI[za0-9]{20,}" *.gs &>/dev/null; then
    echo -e "${YELLOW}⚠️  Possible hardcoded API key${NC}"
fi

# Check .gitignore
echo ""
echo "📋 Checking .gitignore..."

if [ -f ".gitignore" ]; then
    echo -e "${GREEN}✅ .gitignore exists${NC}"
else
    echo -e "${RED}❌ .gitignore missing!${NC}"
    ((ISSUES++))
fi

# Summary
echo ""
echo "=========================================="
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ No security issues found!${NC}"
else
    echo -e "${RED}❌ Found $ISSUES security issue(s)${NC}"
    echo ""
    echo "Fix before pushing:"
    echo "1. Remove sensitive files: git rm --cached <file>"
    echo "2. Use PropertiesService for secrets"
    echo "3. Commit and push fixes"
fi

exit $ISSUES
