# Gabay sa Pag-setup ng Box.net Backup

> **Mga Wika**: [🇺🇸 English](BOX_SETUP.en.md) | [🇻🇳 Tiếng Việt](BOX_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](BOX_SETUP.id.md) | [🇨🇳 中文](BOX_SETUP.zh.md) | [🇰🇷 한국어](BOX_SETUP.ko.md) | [🇯🇵 日本語](BOX_SETUP.ja.md) | [🇫🇷 Français](BOX_SETUP.fr.md) | [🇩🇪 Deutsch](BOX_SETUP.de.md) | [🇪🇸 Español](BOX_SETUP.es.md) | [🇹🇭 ภาษาไทย](BOX_SETUP.th.md) | [🇲🇾 Bahasa Melayu](BOX_SETUP.ms.md) | [🇷🇺 Русский](BOX_SETUP.ru.md) | [🇵🇭 Filipino](BOX_SETUP.fil.md) | [🇧🇷 Português](BOX_SETUP.pt.md)

---

## Hakbang 1: Gumawa ng Box Developer Account

1. Pumunta sa [Box Developer Console](https://app.box.com/developers/console)
2. Mag-login gamit ang iyong Box account (o gumawa ng bago)
3. I-click ang **"Create New App"**

## Hakbang 2: Gumawa ng OAuth 2.0 Application

1. Piliin ang **"Custom App"**
2. Piliin ang **"User Authentication (OAuth 2.0)"**
3. Pangalanan ang iyong app: `Marix SSH Client` o anumang pangalan na gusto mo
4. I-click ang **"Create App"**

## Hakbang 3: I-configure ang Application Settings

### 3.1. OAuth 2.0 Credentials

1. Sa iyong app settings, pumunta sa **"Configuration"** tab
2. Itala ang:
   - **Client ID**
   - **Client Secret** (i-click ang "Fetch Client Secret" kung kinakailangan)

### 3.2. OAuth 2.0 Redirect URI

1. Mag-scroll pababa sa **"OAuth 2.0 Redirect URI"**
2. Idagdag: `http://localhost` (pinapayagan ng Box ang anumang localhost port)
3. I-click ang **"Save Changes"**

### 3.3. Application Scopes

1. Sa ilalim ng **"Application Scopes"**, tiyaking naka-enable ang mga ito:
   - ✅ Read all files and folders stored in Box
   - ✅ Write all files and folders stored in Box
2. I-click ang **"Save Changes"**

## Hakbang 4: I-configure ang Credentials sa Marix

### Opsyon A: Lokal na Development

1. Gumawa ng `box-credentials.json` sa `src/main/services/`:
```json
{
  "client_id": "YOUR_BOX_CLIENT_ID",
  "client_secret": "YOUR_BOX_CLIENT_SECRET"
}
```

2. **MAHALAGA**: Idagdag sa `.gitignore`:
```
src/main/services/box-credentials.json
```

### Opsyon B: CI/CD gamit ang GitHub Secrets (Inirerekomenda)

1. Pumunta sa iyong GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Idagdag ang mga secrets na ito:
   - `BOX_CLIENT_ID`: Ang iyong Box Client ID
   - `BOX_CLIENT_SECRET`: Ang iyong Box Client Secret
3. Awtomatikong i-inject ng build workflow ang credentials habang nag-build

## Hakbang 5: I-test ang OAuth Flow

1. Buksan ang Marix app
2. Pumunta sa **Settings** > **Backup & Restore** > **Create/Restore Backup**
3. Piliin ang **"Box"** tab
4. I-click ang **"Connect to Box"**
5. Magbubukas ang browser sa Box OAuth screen
6. Mag-login at mag-grant ng permissions
7. Makakatanggap ang app ng token at magpapakita ng "Connected"

## Mga Tala sa Seguridad

- **HUWAG** i-commit ang `box-credentials.json` sa Git
- Gamitin ang **GitHub Secrets** para sa CI/CD builds para protektahan ang client_secret
- Ligtas na naka-store ang tokens gamit ang safeStorage ng Electron
- Ginagamit ang PKCE para sa karagdagang seguridad ng OAuth flow
- Ginagamit ang random callback ports para maiwasan ang conflicts

## App Approval (Opsyonal)

Para sa personal na paggamit, gumagana agad ang iyong app. Para sa public distribution:

1. Pumunta sa **"General Settings"** tab
2. I-submit ang iyong app para sa review kung kinakailangan
3. Ire-review at i-approve ng Box ang iyong app

## Troubleshooting

### Error: "Invalid client_id or client_secret"
- I-verify ang credentials sa iyong box-credentials.json file
- Kopyahin muli ang Client ID at Client Secret mula sa Box Developer Console

### Error: "Redirect URI mismatch"
- Tiyaking naidagdag ang `http://localhost` sa Box app settings
- Sinusuportahan ng Box ang dynamic ports sa localhost

### Error: "Access denied"
- Tinanggihan ng user ang permission grant
- Suriin ang application scopes sa Box Developer Console
