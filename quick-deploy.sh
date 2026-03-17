#!/bin/bash
# Quick deploy script for Khuroson Cargo Bot
# Usage: ./quick-deploy.sh

set -e

echo "🚀 Khuroson Cargo Bot - Quick Deploy"
echo "======================================"
echo ""

# Step 1: Push
echo "📤 Step 1: Pushing code..."
clasp push
echo "✅ Push complete"
echo ""

# Step 2: Get deployment info
echo "📦 Step 2: Getting deployment info..."
clasp deployments
echo ""

# Step 3: Instructions
echo "======================================"
echo "✅ Code pushed successfully!"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Open Apps Script: https://script.google.com/"
echo "2. Find your project and run these functions IN ORDER:"
echo "   a) setupBot()     - Create required sheets"
echo "   b) setProperties() - Set configuration (edit values first!)"
echo "3. Deploy as Web App:"
echo "   → Deploy → New deployment → Web app → Anyone"
echo "4. Copy the Web App URL"
echo "5. Run setTelegramWebhook() in Apps Script"
echo ""
echo "📊 View logs in Google Sheet → 'Errors' tab"
echo "======================================"
echo ""
