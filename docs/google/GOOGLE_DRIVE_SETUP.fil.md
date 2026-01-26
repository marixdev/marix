# Gabay sa Pag-setup ng Google Drive Backup

> **Mga Wika**: [🇺🇸 English](GOOGLE_DRIVE_SETUP.en.md) | [🇻🇳 Tiếng Việt](GOOGLE_DRIVE_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](GOOGLE_DRIVE_SETUP.id.md) | [🇨🇳 中文](GOOGLE_DRIVE_SETUP.zh.md) | [🇰🇷 한국어](GOOGLE_DRIVE_SETUP.ko.md) | [🇯🇵 日本語](GOOGLE_DRIVE_SETUP.ja.md) | [🇫🇷 Français](GOOGLE_DRIVE_SETUP.fr.md) | [🇩🇪 Deutsch](GOOGLE_DRIVE_SETUP.de.md) | [🇪🇸 Español](GOOGLE_DRIVE_SETUP.es.md) | [🇹🇭 ภาษาไทย](GOOGLE_DRIVE_SETUP.th.md) | [🇲🇾 Bahasa Melayu](GOOGLE_DRIVE_SETUP.ms.md) | [🇷🇺 Русский](GOOGLE_DRIVE_SETUP.ru.md) | [🇵🇭 Filipino](GOOGLE_DRIVE_SETUP.fil.md) | [🇧🇷 Português](GOOGLE_DRIVE_SETUP.pt.md) [🇺🇸 English](GOOGLE_DRIVE_SETUP.en.md) | [🇻🇳 Tiếng Việt](GOOGLE_DRIVE_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](GOOGLE_DRIVE_SETUP.id.md) | [🇨🇳 中文](GOOGLE_DRIVE_SETUP.zh.md) | [🇰🇷 한국어](GOOGLE_DRIVE_SETUP.ko.md) | [🇯🇵 日本語](GOOGLE_DRIVE_SETUP.ja.md) | [🇫🇷 Français](GOOGLE_DRIVE_SETUP.fr.md) | [🇩🇪 Deutsch](GOOGLE_DRIVE_SETUP.de.md) | [🇪🇸 Español](GOOGLE_DRIVE_SETUP.es.md) | [🇹🇭 ภาษาไทย](GOOGLE_DRIVE_SETUP.th.md) | [🇲🇾 Bahasa Melayu](GOOGLE_DRIVE_SETUP.ms.md) | [🇷🇺 Русский](GOOGLE_DRIVE_SETUP.ru.md) | [🇵🇭 Filipino](GOOGLE_DRIVE_SETUP.fil.md) | [🇧🇷 Português](GOOGLE_DRIVE_SETUP.pt.md)

---

## Hakbang 1: Gumawa ng Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"New Project"** in the top right corner
3. Name your project: `Marix SSH Client` or any name you prefer
4. Click **"Create"**

## Hakbang 2: I-enable ang Google Drive API

1. In your newly created project, go to **"APIs & Services"** > **"Library"**
2. Search for **"Google Drive API"**
3. Click on the result and press **"Enable"**

## Hakbang 3: Gumawa ng OAuth 2.0 Credentials

### 3.1. I-configure ang OAuth Consent Screen

1. Go to **"APIs & Services"** > **"OAuth consent screen"**
2. Select **"External"** (allows any Google account user)
3. Click **"Create"**

**App information:**
- App name: `Marix SSH Client`
- User support email: `your-email@gmail.com`
- App logo: (optional) upload your logo
- Application home page: `https://github.com/marixdev/marix`
- Application privacy policy link: (optional)
- Application terms of service link: (optional)

**Developer contact information:**
- Email addresses: `your-email@gmail.com`

4. Click **"Save and Continue"**

**Scopes:**
5. Click **"Add or Remove Scopes"**
6. Find and select the following scope:
   - `https://www.googleapis.com/auth/drive.file` (only files created by this app)
7. Click **"Update"** and **"Save and Continue"**

**Test users:** (only needed when Publishing status = Testing)
8. Click **"Add Users"**
9. Enter Google account emails for testing
10. Click **"Save and Continue"**

11. Review and click **"Back to Dashboard"**

### 3.2. Gumawa ng OAuth Client ID

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"Create Credentials"** > **"OAuth client ID"**
3. Select **"Desktop app"** (for Electron app)
4. Name it: `Marix Desktop Client`
5. Click **"Create"**

6. **Copy Client ID**: Click the copy icon to copy your Client ID
   - You only need the `client_id` - no client secret required (using PKCE)
   - Create file `google-credentials.json` in `src/main/services/`

7. **Save Client ID** (client_secret is NOT required with PKCE):
```json
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com"
  }
}
```

## Hakbang 4: I-configure sa Marix

1. Copy the `google-credentials.json` file into `src/main/services/` folder
2. **IMPORTANT**: Add to `.gitignore`:
```
src/main/services/google-credentials.json
```

3. The app will automatically load credentials on startup

## Hakbang 5: Subukan ang OAuth Flow

1. Open Marix app
2. Go to **Settings** > **Backup & Restore** > **Create/Restore Backup**
3. Select the **"Google Drive"** tab
4. Click **"Connect to Google Drive"**
5. Browser will open with Google OAuth screen
6. Select your Google account and grant permissions
7. App will receive the token and display "Connected"

## Mga Tala sa Seguridad

- **DO NOT** commit `google-credentials.json` to Git
- Refresh tokens are stored in Electron store (encrypted)
- Only request minimal necessary permissions
- PKCE is used for secure OAuth flow (no client secret needed)

## I-publish ang App (Kinakailangan)

Para payagan ang lahat ng user na gamitin ang app:

1. Go to **OAuth consent screen**
2. Click **"Publish App"**
3. Ang iyong app ay maaaprobahan kaagad
4. Kahit sino ay maaaring gumamit nang walang "unverified app" warnings

## Pag-aayos ng Problema

### Error: "Access blocked: This app's request is invalid"
- Check that OAuth consent screen is fully configured
- Ensure redirect_uri matches your settings

### Error: "The OAuth client was not found"
- Verify Client ID in credentials file
- Re-download JSON file from Google Cloud Console

### Error: "Access denied"
- User denied permission grant
- Add appropriate scopes in OAuth consent screen
