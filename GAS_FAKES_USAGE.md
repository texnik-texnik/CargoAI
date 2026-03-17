# GAS-FAKES USAGE GUIDE

## Installation Status ✅

- **gas-fakes**: v2.2.4 installed
- **clasp**: v3.3.0 installed  
- **gcloud**: 560.0.0 installed

## Configuration

All configuration is in `.env` file:

```env
GF_MANIFEST_PATH="./appsscript.json"
GF_CLASP_PATH="./.clasp.json"
GF_SCRIPT_ID="gen-lang-client-0333688347"
GF_PLATFORM_AUTH="google"
AUTH_TYPE="adc"
LOG_DESTINATION="CONSOLE"
GF_CLIENT_ID="..."
GF_CLIENT_SECRET="..."
GF_REFRESH_TOKEN="..."
```

## Basic Commands

### Run a single .gs file
```bash
export PATH=$PATH:/data/data/com.termux/files/home/google-cloud-sdk/bin
cd /storage/emulated/0/CargoBot/miniapp
gas-fakes -f Main.gs
```

### Display generated script without running
```bash
gas-fakes -f Main.gs --display
```

### Run with arguments
```bash
gas-fakes -f Main.gs -a '{"param1": "value1"}'
```

### Run Test.gs
```bash
gas-fakes -f Test.gs
```

## Using with MCP (Gemini CLI)

Once Gemini CLI is available, gas-fakes can be used as an MCP server:

```bash
gas-fakes mcp
```

## Limitations on Android/Termux

1. **gcloud auth** - Interactive authentication doesn't work properly in Termux
2. **Solution** - Using clasp credentials directly in `.env`
3. **Project ID** - Some features require a Google Cloud Project ID

## Alternative: Use clasp for deployment

```bash
# Push to Google Drive
clasp push

# Pull from Google Drive  
clasp pull

# Check status
clasp status

# Deploy web app
clasp deploy
```

## Demo File

Run the demo to test gas-fakes:
```bash
gas-fakes -f demo.gs
```
