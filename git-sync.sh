#!/bin/bash
# Quick Git Sync Script
# Usage: ./git-sync.sh "Your commit message here"

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Khuroson Cargo Bot - Git Sync${NC}"
echo "================================"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Git not initialized!${NC}"
    echo "Run ./setup-github.sh first"
    exit 1
fi

# Get commit message
if [ -z "$1" ]; then
    echo -e "${YELLOW}Enter commit message:${NC}"
    read -r COMMIT_MSG
else
    COMMIT_MSG="$1"
fi

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update $(date '+%Y-%m-%d %H:%M')"
fi

# Check for changes
if git status --porcelain | grep -q .; then
    echo -e "${GREEN}✅ Changes detected${NC}"
    echo ""
    
    # Show what changed
    echo -e "${YELLOW}Changed files:${NC}"
    git status --short
    echo ""
    
    # Add changes
    echo "📝 Staging changes..."
    git add .
    
    # Commit
    echo "💾 Committing: $COMMIT_MSG"
    git commit -m "$COMMIT_MSG"
    
    # Push
    echo "🚀 Pushing to GitHub..."
    if git push origin main; then
        echo ""
        echo -e "${GREEN}✅ Sync complete!${NC}"
        echo ""
        echo "📊 Commit summary:"
        git log -1 --pretty=format:"%h - %s (%ar)"
        echo ""
    else
        echo -e "${RED}❌ Push failed! Try 'git pull' first${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}ℹ️  No changes to sync${NC}"
fi
