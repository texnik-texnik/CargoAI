#!/bin/bash
# Deploy Admin Panel as Web App
# This creates a new deployment that can be accessed via URL

echo "🚀 Deploying Admin Panel as Web App..."
echo ""

# Check if clasp is available
if ! command -v clasp &> /dev/null; then
    echo "❌ clasp not found. Install with: npm install -g @google/clasp"
    exit 1
fi

# Login to Google
echo "📝 Logging in to Google..."
clasp login

# Set script ID
echo ""
echo "📋 Enter your Google Apps Script ID:"
echo "(Found in .clasp.json or URL when editing script)"
read -p "Script ID: " SCRIPT_ID

if [ -z "$SCRIPT_ID" ]; then
    echo "❌ Script ID is required"
    exit 1
fi

# Create .clasp.json if not exists
if [ ! -f ".clasp.json" ]; then
    echo "{\"scriptId\":\"$SCRIPT_ID\"}" > .clasp.json
fi

# Push code
echo ""
echo "📤 Pushing code..."
clasp push -f

# Create deployment
echo ""
echo "🔧 Creating Web App deployment..."
clasp deploy --title "Admin Panel" --description "Admin panel for bulk track management"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📱 To access Admin Panel:"
echo "1. Send /admin to your bot"
echo "2. Click '🔧 Открыть Админ Панель'"
echo ""
echo "💻 Or use command:"
echo "/bulk DD.MM.YYYY_DD.MM.YYYY-status"
echo "Example: /bulk 19.03.2026_19.03.2026-received"
echo ""
