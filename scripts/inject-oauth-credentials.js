#!/usr/bin/env node
/**
 * Inject OAuth credentials from environment variables
 * 
 * This script reads credentials from environment variables
 * and writes them to the credentials JSON files.
 * 
 * For local development: Set environment variables or use local credentials files
 * For CI/CD: Use GitHub Secrets to provide the credentials
 * 
 * Supported services:
 * - Google Drive: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 * - Box: BOX_CLIENT_ID, BOX_CLIENT_SECRET
 * 
 * Usage:
 *   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy BOX_CLIENT_ID=aaa BOX_CLIENT_SECRET=bbb node scripts/inject-google-credentials.js
 */

const fs = require('fs');
const path = require('path');

const SERVICES_DIR = path.join(__dirname, '..', 'src', 'main', 'services');

function injectGoogleCredentials() {
  const credPath = path.join(SERVICES_DIR, 'google-credentials.json');
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId && !clientSecret) {
    // Check if existing file is valid
    if (fs.existsSync(credPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
        const creds = existing.installed || existing.web;
        if (creds && creds.client_id && !creds.client_id.startsWith('PLACEHOLDER') &&
            creds.client_secret && !creds.client_secret.startsWith('PLACEHOLDER')) {
          console.log('[GoogleCredentials] ✅ Existing credentials file is valid');
          return;
        }
      } catch (e) {}
    }
    console.log('[GoogleCredentials] ⚠️  No credentials configured - Google Drive backup disabled');
    return;
  }

  if (!clientId || !clientSecret) {
    console.error('[GoogleCredentials] ❌ Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
    return;
  }

  const credentials = {
    installed: {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: ['http://localhost:3000/oauth2callback']
    }
  };

  fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2));
  console.log('[GoogleCredentials] ✅ Credentials injected successfully');
  console.log('[GoogleCredentials] Client ID:', clientId.substring(0, 20) + '...');
}

function injectBoxCredentials() {
  const credPath = path.join(SERVICES_DIR, 'box-credentials.json');
  const clientId = process.env.BOX_CLIENT_ID;
  const clientSecret = process.env.BOX_CLIENT_SECRET;

  if (!clientId && !clientSecret) {
    // Check if existing file is valid
    if (fs.existsSync(credPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
        if (existing.client_id && !existing.client_id.startsWith('PLACEHOLDER') &&
            existing.client_secret && !existing.client_secret.startsWith('PLACEHOLDER')) {
          console.log('[BoxCredentials] ✅ Existing credentials file is valid');
          return;
        }
      } catch (e) {}
    }
    console.log('[BoxCredentials] ⚠️  No credentials configured - Box backup disabled');
    return;
  }

  if (!clientId || !clientSecret) {
    console.error('[BoxCredentials] ❌ Both BOX_CLIENT_ID and BOX_CLIENT_SECRET are required');
    return;
  }

  const credentials = {
    client_id: clientId,
    client_secret: clientSecret
  };

  fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2));
  console.log('[BoxCredentials] ✅ Credentials injected successfully');
  console.log('[BoxCredentials] Client ID:', clientId.substring(0, 20) + '...');
}

// Inject all credentials
injectGoogleCredentials();
injectBoxCredentials();
