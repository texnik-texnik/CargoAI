#!/usr/bin/env python3
"""
Upload code to Google Apps Script
Usage: python3 upload-to-gas.py YOUR_SCRIPT_ID
"""

import sys
import os
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import pickle
import json

# Scopes needed
SCOPES = ['https://www.googleapis.com/auth/script.projects']

# Your Google Cloud OAuth credentials
# Download from: https://console.cloud.google.com/apis/credentials
CLIENT_SECRET_FILE = 'client_secret.json'
TOKEN_FILE = 'token.pickle'

def get_credentials():
    """Get OAuth credentials"""
    creds = None
    
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'r') as f:
            # Handle pickle vs JSON
            try:
                creds = pickle.load(f)
            except:
                os.remove(TOKEN_FILE)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CLIENT_SECRET_FILE):
                print(f"❌ {CLIENT_SECRET_FILE} not found!")
                print("Download from: https://console.cloud.google.com/apis/credentials")
                sys.exit(1)
            
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)
            creds = flow.run_local_server(port=8080)
        
        with open(TOKEN_FILE, 'wb') as f:
            pickle.dump(creds, f)
    
    return creds

def read_file_content(filepath):
    """Read file content"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

def upload_to_gas(script_id, files_dir='.'):
    """Upload all .gs and .html files to Google Apps Script"""
    
    print("🔐 Authenticating...")
    creds = get_credentials()
    
    print("📡 Connecting to GAS API...")
    service = build('script', 'v1', credentials=creds)
    
    # Get all files
    gs_files = [f for f in os.listdir(files_dir) if f.endswith('.gs')]
    html_files = [f for f in os.listdir(files_dir) if f.endswith('.html')]
    
    print(f"📁 Found {len(gs_files)} .gs files")
    print(f"📁 Found {len(html_files)} .html files")
    
    # Prepare files for upload
    files_content = []
    
    for filename in gs_files + html_files:
        filepath = os.path.join(files_dir, filename)
        content = read_file_content(filepath)
        
        # Skip Combined.gs if other .gs files exist
        if filename == 'Combined.gs' and len(gs_files) > 1:
            print(f"⏭️  Skipping {filename} (use individual files)")
            continue
        
        files_content.append({
            'name': filename.replace('.gs', '').replace('.html', ''),
            'type': 'SERVER_JS' if filename.endswith('.gs') else 'HTML',
            'source': content
        })
        
        print(f"✅ Loaded: {filename}")
    
    # Prepare request body
    content = {
        'files': files_content
    }
    
    print(f"\n📤 Uploading to script: {script_id}")
    
    try:
        # Update existing script
        response = service.projects().updateContent(
            scriptId=script_id,
            body=content
        ).execute()
        
        print("\n✅ Upload successful!")
        print(f"📊 Files uploaded: {len(response.get('files', []))}")
        
        # Optional: Create new deployment
        # deploy_response = service.projects().deployments().create(
        #     scriptId=script_id,
        #     body={
        #         'deploymentConfig': {
        #             'deploymentType': 'WEB_APP',
        #             'webApplication': {
        #                 'accessType': 'ANYONE_ANONYMOUS'
        #             }
        #         }
        #     }
        # ).execute()
        
        return True
        
    except HttpError as e:
        print(f"\n❌ Error: {e}")
        if e.status_code == 403:
            print("🔑 Permission denied. Check API is enabled and credentials are correct")
        return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 upload-to-gas.py YOUR_SCRIPT_ID")
        print("\nGet SCRIPT_ID from:")
        print("  https://script.google.com/home/projects/YOUR_SCRIPT_ID/edit")
        sys.exit(1)
    
    script_id = sys.argv[1]
    success = upload_to_gas(script_id)
    sys.exit(0 if success else 1)
