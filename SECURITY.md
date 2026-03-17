# 🔒 Security Guide - Khuroson Cargo Bot

## ✅ What's Protected on GitHub

These files are **safe** (no sensitive data):

| File | Status | Notes |
|------|--------|-------|
| `*.gs` | ✅ Safe | Uses PropertiesService for secrets |
| `appsscript.json` | ✅ Safe | Only timeZone and webapp config |
| `*.html` | ✅ Safe | UI code only |
| `*.md` | ✅ Safe | Documentation |
| `*.sh` | ✅ Safe | Scripts (no hardcoded credentials) |

---

## ❌ What's NOT on GitHub (Protected)

These files are **excluded** by `.gitignore`:

| File | Why Protected |
|------|---------------|
| `.env` | Contains gas-fakes tokens |
| `.clasp.json` | Contains Script ID |
| `.claspignore` | Local config |
| `oauth-credentials.json` | OAuth client secrets |
| `.last_deploy_url.txt` | Deployment URLs |
| `.webhook_url.txt` | Webhook URLs with tokens |
| `*.key`, `*.pem` | Private keys |

---

## 🔐 Where Secrets Are Stored

Your bot uses **Google Apps Script PropertiesService** - this is secure!

```javascript
// ✅ SECURE: Secrets stored in GAS Properties (not in code)
const PROPS = PropertiesService.getScriptProperties();
const TOKEN = PROPS.getProperty("TELEGRAM_TOKEN");
const API_KEY = PROPS.getProperty("GOOGLE_API_KEY");
```

**Properties are stored on Google's servers**, not in your code!

---

## 📋 Security Checklist

### Before Pushing to GitHub:

```bash
# Run security audit
./security-audit.sh

# Or manually check:
git status
git diff
```

### Required Checks:

- [ ] No `.env` files in git
- [ ] No `.clasp.json` in git
- [ ] No `oauth-credentials.json` in git
- [ ] No hardcoded tokens in `.gs` files
- [ ] No webhook URLs with tokens
- [ ] `.gitignore` is present

---

## 🚨 If You Accidentally Committed Secrets

### 1. Remove from Git History

```bash
# Remove file from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch PATH_TO_FILE" \
  --prune-empty --tag-name-filter cat -- --all

# Push changes
git push origin main --force
```

### 2. Rotate Compromised Secrets

**If you committed Telegram token:**
1. Go to @BotFather on Telegram
2. `/revoke` your bot token
3. Get new token
4. Update in GAS Properties

**If you committed API key:**
1. Go to Google Cloud Console
2. Revoke compromised key
3. Generate new key
4. Update in GAS Properties

**If you committed OAuth credentials:**
1. Go to Google Cloud Console → Credentials
2. Delete compromised OAuth client
3. Create new one
4. Update `oauth-credentials.json` locally

---

## 🔑 Secret Management Best Practices

### ✅ DO:

```javascript
// Use PropertiesService
const props = PropertiesService.getScriptProperties();
const token = props.getProperty("TELEGRAM_TOKEN");

// Use environment variables (gas-fakes)
const token = process.env.TELEGRAM_TOKEN;

// Use Config object (reads from Properties)
const token = CONFIG.TELEGRAM_TOKEN;
```

### ❌ DON'T:

```javascript
// NEVER hardcode tokens
const TOKEN = "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz";

// NEVER commit .env with real tokens
TELEGRAM_TOKEN=1234567890:ABCdef...

// NEVER log full tokens
console.log("Token:", TOKEN); // ❌
console.log("Token configured:", !!TOKEN); // ✅
```

---

## 📊 Current Security Status

| Item | Status | Location |
|------|--------|----------|
| Telegram Token | ✅ Secure | GAS Properties |
| Gemini API Key | ✅ Secure | GAS Properties |
| Webhook Token | ✅ Secure | GAS Properties + URL param |
| OAuth Credentials | ✅ Secure | Local file only (not in git) |
| Database Sheet ID | ✅ Secure | GAS Properties |
| Admin IDs | ✅ Secure | GAS Properties |

---

## 🛡️ Additional Security Measures

### 1. Webhook Protection

Your webhook has token protection:

```javascript
// Main.gs - Token verification
if (!e.parameter.token || e.parameter.token !== CONFIG.WEBHOOK_TOKEN) {
  return ContentService.createTextOutput("Access Denied");
}
```

**Never share your webhook URL publicly!**

### 2. Admin Protection

```javascript
// Only admins can use certain features
if (!ADMIN_IDS.includes(userId)) {
  TG.sendMessage(chatId, "⛔️ Access denied");
  return;
}
```

### 3. Rate Limiting

```javascript
// Prevent spam
if (!checkRateLimit(userId)) {
  TG.sendMessage(chatId, "Please wait...");
  return;
}
```

---

## 🔍 Audit Your Repository

Run this command to see what's in git:

```bash
# List all tracked files
git ls-files

# Check for sensitive patterns
grep -r "TOKEN.*=" *.gs | grep -v "getProperty"
grep -r "API_KEY.*=" *.gs | grep -v "getProperty"
```

---

## 📞 Emergency Contacts

If you suspect a security breach:

1. **Rotate all tokens immediately**
2. **Check GAS execution logs** for unauthorized access
3. **Review Telegram bot users** for suspicious activity
4. **Update webhook URL** with new token

---

## 🎯 Security Commands

```bash
# Run security audit
./security-audit.sh

# Check what's in git
git ls-files

# Remove file from git (keep locally)
git rm --cached .env

# View commit history
git log --oneline

# Check for secrets in history
git log -p --all | grep -i "token\|secret\|password"
```

---

## ✅ Your Current Security

**Last Audit**: $(date)

**Status**: ✅ **SECURE**

- ✅ No sensitive files in git
- ✅ All tokens in PropertiesService
- ✅ `.gitignore` configured
- ✅ Webhook token protection enabled
- ✅ OAuth credentials local only

---

**Stay safe! 🔒**
