# 🚀 Quick Start: GitHub for Khuroson Cargo Bot

## ✅ What's Done:

- ✅ Git repository initialized
- ✅ Initial commit created (37 files)
- ✅ .gitignore configured (sensitive files excluded)
- ✅ Ready to push to GitHub

---

## 📋 Next Steps:

### 1. Create GitHub Repository

Go to: https://github.com/new

- **Repository name**: `khuroson-cargo-bot`
- **Description**: "Telegram bot for Khuroson Cargo - China ↔ Tajikistan logistics"
- **Visibility**: Public or Private (your choice)
- **DO NOT** check "Initialize with README"
- Click **Create repository**

### 2. Connect to GitHub

Copy and run these commands (replace YOUR_USERNAME):

```bash
cd /storage/emulated/0/CargoBot/miniapp

# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/khuroson-cargo-bot.git

# Push to GitHub
git push -u origin main
```

**Note**: You'll need to authenticate with GitHub using:
- Personal Access Token (recommended), OR
- SSH key

Get token: https://github.com/settings/tokens

---

## 📅 Daily Workflow:

### Quick Sync (One Command)

```bash
./git-sync.sh "Added new AI feature"
```

### Manual Sync

```bash
# Check changes
git status

# Add all changes
git add .

# Commit with message
git commit -m "Description of changes"

# Push to GitHub
git push origin main
```

---

## 🔐 Authentication Setup:

### Option 1: Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click **Generate new token** → **Classic**
3. Name: `Termux Android`
4. Select: `repo`, `workflow`
5. Copy the token
6. When pushing, use token as password

### Option 2: SSH Key

```bash
# Generate key
ssh-keygen -t ed25519 -C "your@email.com"

# Show public key
cat ~/.ssh/id_ed25519.pub

# Add to GitHub: https://github.com/settings/keys
```

---

## 📊 Useful Commands:

```bash
# See what changed
git status
git diff

# Quick commit & push
git add . && git commit -m "Update" && git push

# View history
git log --oneline -10

# Update from GitHub
git pull origin main

# Create new branch
git checkout -b feature/new-feature
```

---

## ⚠️ Important:

**Files NOT synced to GitHub (in .gitignore):**

- ❌ `.env` - Contains API keys
- ❌ `.clasp.json` - Contains script ID
- ❌ `.claspignore` - Local config
- ❌ `oauth-credentials.json` - Authentication tokens
- ❌ `*.jpg`, `*.png` - Images

**Keep these safe locally!**

---

## 🎯 Your Git Info:

Update these in git config:

```bash
# Set your real name and email
git config user.name "Your Name"
git config user.email "your@email.com"
```

---

## 📖 Full Guide:

See **README_GITHUB.md** for detailed instructions.

---

**Ready to push?** Run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/khuroson-cargo-bot.git
git push -u origin main
```
