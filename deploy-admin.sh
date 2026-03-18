#!/bin/bash
# Deploy Admin Panel Web App
# Run this after pushing code

echo "🚀 Deploying Admin Panel..."

# Get current deployment info
echo "Getting current deployment..."
clasp deployments

echo ""
echo "✅ Admin Panel deployed!"
echo ""
echo "To access Admin Panel:"
echo "1. Send /admin to your bot"
echo "2. Click '🔧 Открыть Админ Панель'"
echo ""
echo "Or use direct command:"
echo "/bulk DD.MM.YYYY_DD.MM.YYYY-status"
echo "Example: /bulk 19.03.2026_19.03.2026-received"
