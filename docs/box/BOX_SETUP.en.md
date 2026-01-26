# Box.net Backup Setup Guide

> **Languages**: [🇺🇸 English](BOX_SETUP.en.md) | [🇻🇳 Tiếng Việt](BOX_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](BOX_SETUP.id.md) | [🇨🇳 中文](BOX_SETUP.zh.md) | [🇰🇷 한국어](BOX_SETUP.ko.md) | [🇯🇵 日本語](BOX_SETUP.ja.md) | [🇫🇷 Français](BOX_SETUP.fr.md) | [🇩🇪 Deutsch](BOX_SETUP.de.md) | [🇪🇸 Español](BOX_SETUP.es.md) | [🇹🇭 ภาษาไทย](BOX_SETUP.th.md) | [🇲🇾 Bahasa Melayu](BOX_SETUP.ms.md) | [🇷🇺 Русский](BOX_SETUP.ru.md) | [🇵🇭 Filipino](BOX_SETUP.fil.md) | [🇧🇷 Português](BOX_SETUP.pt.md)

---

## Step 1: Create Box Developer Account

1. Go to [Box Developer Console](https://app.box.com/developers/console)
2. Log in with your Box account (or create one)
3. Click **"Create New App"**

## Step 2: Create OAuth 2.0 Application

1. Select **"Custom App"**
2. Choose **"User Authentication (OAuth 2.0)"**
3. Name your app: `Marix SSH Client` or any name you prefer
4. Click **"Create App"**

## Step 3: Configure Application Settings

### 3.1. OAuth 2.0 Credentials

1. In your app settings, go to **"Configuration"** tab
2. Note down:
   - **Client ID**
   - **Client Secret** (click "Fetch Client Secret" if needed)

### 3.2. OAuth 2.0 Redirect URI

1. Scroll down to **"OAuth 2.0 Redirect URI"**
2. Add: `http://localhost` (Box allows any localhost port)
3. Click **"Save Changes"**

### 3.3. Application Scopes

1. Under **"Application Scopes"**, ensure these are enabled:
   - ✅ Read all files and folders stored in Box
   - ✅ Write all files and folders stored in Box
2. Click **"Save Changes"**

## Step 4: Configure Credentials in Marix

### Option A: Local Development

1. Create `box-credentials.json` in `src/main/services/`:
```json
{
  "client_id": "YOUR_BOX_CLIENT_ID",
  "client_secret": "YOUR_BOX_CLIENT_SECRET"
}
```

2. **IMPORTANT**: Add to `.gitignore`:
```
src/main/services/box-credentials.json
```

### Option B: CI/CD with GitHub Secrets (Recommended)

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `BOX_CLIENT_ID`: Your Box Client ID
   - `BOX_CLIENT_SECRET`: Your Box Client Secret
3. The build workflow will automatically inject credentials during build

## Step 5: Test OAuth Flow

1. Open Marix app
2. Go to **Settings** > **Backup & Restore** > **Create/Restore Backup**
3. Select the **"Box"** tab
4. Click **"Connect to Box"**
5. Browser will open with Box OAuth screen
6. Log in and grant permissions
7. App will receive the token and display "Connected"

## Security Notes

- **DO NOT** commit `box-credentials.json` to Git
- Use **GitHub Secrets** for CI/CD builds to protect client_secret
- Tokens are stored securely using Electron's safeStorage
- PKCE is used for additional OAuth flow security
- Random callback ports are used to avoid conflicts

## App Approval (Optional)

For personal use, your app works immediately. For public distribution:

1. Go to **"General Settings"** tab
2. Submit your app for review if needed
3. Box will review and approve your app

## Troubleshooting

### Error: "Invalid client_id or client_secret"
- Verify credentials in your box-credentials.json file
- Re-copy Client ID and Client Secret from Box Developer Console

### Error: "Redirect URI mismatch"
- Ensure `http://localhost` is added in Box app settings
- Box supports dynamic ports with localhost

### Error: "Access denied"
- User denied permission grant
- Check application scopes in Box Developer Console

### Error: "Token refresh failed"
- Token may have been revoked
- Click "Disconnect" and reconnect to Box

## Box vs Other Cloud Services

| Feature | Box | Google Drive | GitLab |
|---------|-----|--------------|--------|
| Free Storage | 10 GB | 15 GB | Unlimited (repos) |
| OAuth Type | OAuth 2.0 + PKCE | OAuth 2.0 + PKCE | OAuth 2.0 + PKCE |
| Client Secret | Required | Required | Not Required |
| Setup Complexity | Medium | Medium | Easy |

## File Structure

Backups are stored in Box under:
```
/Marix Backups/
  ├── backup_2024-01-15_10-30-00.marix
  ├── backup_2024-01-16_15-45-30.marix
  └── ...
```

Each backup file is encrypted with Argon2id before upload.
