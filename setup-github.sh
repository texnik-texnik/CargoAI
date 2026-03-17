#!/bin/bash
# GitHub Setup Script for Khuroson Cargo Bot
# Run this ONCE to initialize git repository

set -e

echo "🚀 Setting up GitHub for Khuroson Cargo Bot..."
echo ""

# Check if git is configured
if ! git config user.name > /dev/null 2>&1; then
    echo "⚙️  Configuring git..."
    read -p "Enter your GitHub username: " GIT_USER
    read -p "Enter your GitHub email: " GIT_EMAIL
    
    git config --global user.name "$GIT_USER"
    git config --global user.email "$GIT_EMAIL"
    
    echo "✅ Git configured for $GIT_USER <$GIT_EMAIL>"
    echo ""
fi

# Initialize git repository
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    echo "✅ Git repository initialized"
    echo ""
else
    echo "✅ Git repository already exists"
    echo ""
fi

# Create main branch
echo "📋 Creating main branch..."
git checkout -b main 2>/dev/null || git checkout main 2>/dev/null || true
echo "✅ Main branch ready"
echo ""

# Add all files
echo "📝 Adding files..."
git add .
echo "✅ Files added"
echo ""

# Initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: Khuroson Cargo Bot v1.0

- Telegram bot for cargo logistics (China ↔ Tajikistan)
- User registration and management
- Track search functionality
- AI integration (Gemini API)
- Multi-language support (Tajik/Russian)
- gas-fakes for local testing
- clasp for deployment"
echo "✅ Initial commit created"
echo ""

echo "🎉 Git setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Create a new repository on GitHub (don't initialize it)"
echo "2. Run these commands:"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/khuroson-cargo-bot.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "📖 See README_GITHUB.md for full instructions"
