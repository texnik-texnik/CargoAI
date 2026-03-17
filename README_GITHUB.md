# GitHub Integration Guide - Khuroson Cargo Bot

##  Why Use GitHub?

| Benefit | Description |
|---------|-------------|
| **Version History** | Track every change, revert if needed |
| **Backup** | Your code is safe in the cloud |
| **Collaboration** | Multiple developers can work together |
| **CI/CD** | Automated testing and deployment |
| **Branches** | Test new features without breaking production |

---

## 📋 One-Time Setup

### Option A: Automated Setup (Recommended)

```bash
# Make script executable
chmod +x setup-github.sh

# Run setup
./setup-github.sh
```

### Option B: Manual Setup

```bash
# 1. Configure git (first time only)
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# 2. Initialize git repository
git init

# 3. Create main branch
git checkout -b main

# 4. Add all files
git add .

# 5. Create initial commit
git commit -m "Initial commit: Khuroson Cargo Bot"
```

---

## 🔗 Connect to GitHub

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `khuroson-cargo-bot`
3. **DON'T** check "Initialize this repository with a README"
4. Click **Create repository**

### Step 2: Link Local Repository

```bash
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/khuroson-cargo-bot.git

# Rename branch to main
git branch -M main

# Push to GitHub
git push -u origin main
```

**Enter your GitHub credentials when prompted.**

---

## 📅 Daily Workflow

### Before You Start Working

```bash
# Get latest changes from GitHub
git pull origin main
```

### After Making Changes

```bash
# 1. Check what changed
git status

# 2. Add changed files
git add .

# Or add specific files:
# git add Main.gs Config.gs

# 3. Commit with message
git commit -m "Description of changes"

# 4. Push to GitHub
git push origin main
```

### Example: Complete Workflow

```bash
# Morning: Get latest code
cd /storage/emulated/0/CargoBot/miniapp
git pull origin main

# ... work on your bot ...
# Edit Main.gs, Config.gs, etc.

# Evening: Save your work
git status                    # See what changed
git diff Main.gs              # Review changes
git add .                     # Stage all changes
git commit -m "Add AI track code extraction"
git push origin main          # Upload to GitHub
```

---

## 🌿 Working with Branches

### Create Feature Branch

```bash
# Create and switch to new branch
git checkout -b feature/ai-improvements

# Make your changes...
git add .
git commit -m "Improve AI responses"

# Push branch to GitHub
git push -u origin feature/ai-improvements
```

### Merge Branch to Main

```bash
# Switch back to main
git checkout main

# Get latest main
git pull origin main

# Merge feature branch
git merge feature/ai-improvements

# Push updated main
git push origin main

# Delete feature branch (optional)
git branch -d feature/ai-improvements
```

---

## 📜 Git Commands Cheat Sheet

| Command | Description |
|---------|-------------|
| `git status` | Show changed files |
| `git diff` | Show what changed |
| `git add .` | Stage all changes |
| `git commit -m "msg"` | Save changes |
| `git push` | Upload to GitHub |
| `git pull` | Download from GitHub |
| `git log` | View commit history |
| `git checkout -b name` | Create new branch |
| `git checkout main` | Switch to main branch |
| `git merge branch` | Merge branch into current |

---

## 🔐 Authentication Methods

### Method 1: HTTPS with Token (Recommended)

1. Go to https://github.com/settings/tokens
2. Click **Generate new token** → **Classic**
3. Select scopes: `repo`, `workflow`
4. Copy the token
5. When pushing, use token as password:
   ```
   Username: your_username
   Password: your_token_here
   ```

### Method 2: SSH Keys (More Secure)

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your@email.com"

# Add to GitHub
cat ~/.ssh/id_ed25519.pub
# Copy output and add to https://github.com/settings/keys

# Test connection
ssh -T git@github.com
```

---

## 🚨 Common Issues & Solutions

### Issue: "fatal: remote origin already exists"

```bash
# Remove existing remote
git remote remove origin

# Add again
git remote add origin https://github.com/USERNAME/REPO.git
```

### Issue: "Updates were rejected because the remote contains work"

```bash
# Pull first, then push
git pull origin main
git push origin main
```

### Issue: "Please tell me who you are"

```bash
# Configure git user
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### Issue: Large files won't push

```bash
# Check file sizes
git ls-files --stage | grep -E "\.(jpg|png|mp4)$"

# Remove large files from git history
git rm --cached filename.jpg
git commit -m "Remove large file"
```

---

## 📊 Recommended Repository Structure

```
khuroson-cargo-bot/
├── .gitignore              # ✅ Ignore sensitive files
├── .clasp.json             # ❌ In .gitignore (has script ID)
├── .claspignore            # ❌ In .gitignore (local config)
├── .env                    # ❌ In .gitignore (has tokens)
├── appsscript.json         # ✅ Safe to commit
├── Main.gs                 # ✅ Your code
├── Config.gs               # ✅ Your code
├── AI.gs                   # ✅ Your code
├── AI_Advanced.gs          # ✅ Your code
├── README.md               # ✅ Documentation
├── README_GITHUB.md        # ✅ This file
└── setup-github.sh         # ✅ Setup script
```

---

## 🔄 Automated Backup Script

Create `backup-to-github.sh`:

```bash
#!/bin/bash
# Automatic backup to GitHub

echo "📦 Backing up to GitHub..."

# Check for changes
if git status --porcelain | grep -q .; then
    echo "✅ Changes detected"
    
    # Add and commit
    git add .
    git commit -m "Auto-backup: $(date '+%Y-%m-%d %H:%M')"
    
    # Push to GitHub
    git push origin main
    
    echo "✅ Backup complete"
else
    echo "ℹ️  No changes to backup"
fi
```

Make executable and run:
```bash
chmod +x backup-to-github.sh
./backup-to-github.sh
```

---

## 🎯 Best Practices

### ✅ DO:

- Commit frequently with clear messages
- Pull before you start working
- Use branches for new features
- Push at the end of each day
- Keep sensitive data out of git

### ❌ DON'T:

- Commit `.env` or credential files
- Push without reviewing changes
- Work directly on main for big features
- Commit large files (images, videos)
- Share your GitHub tokens

---

## 📱 Mobile Workflow (Termux)

Since you're on Android/Termux:

```bash
# Quick commit & push
alias gcp='git add . && git commit -m "Update" && git push'

# Check status
alias gs='git status'

# View log
alias gl='git log --oneline -10'

# Usage:
gs          # Check status
# ... make changes ...
gcp         # Commit and push
```

Add to `~/.bashrc`:
```bash
echo 'alias gs="git status"' >> ~/.bashrc
echo 'alias gcp="git add . && git commit -m \"Update\" && git push"' >> ~/.bashrc
source ~/.bashrc
```

---

## 🔗 Useful Links

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Desktop](https://desktop.github.com/) (for PC)
- [Learn Git Branching](https://learngitbranching.js.org/) (interactive tutorial)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

---

## 🎉 You're Ready!

After setup, your workflow will be:

```bash
# 1. Morning
git pull origin main

# 2. Work on bot...

# 3. Evening
git add .
git commit -m "Improved AI responses"
git push origin main
```

**Your code is now safely backed up on GitHub! 🎊**
