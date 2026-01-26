# Panduan Persediaan Sandaran Box.net

> **Bahasa**: [🇺🇸 English](BOX_SETUP.en.md) | [🇻🇳 Tiếng Việt](BOX_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](BOX_SETUP.id.md) | [🇨🇳 中文](BOX_SETUP.zh.md) | [🇰🇷 한국어](BOX_SETUP.ko.md) | [🇯🇵 日本語](BOX_SETUP.ja.md) | [🇫🇷 Français](BOX_SETUP.fr.md) | [🇩🇪 Deutsch](BOX_SETUP.de.md) | [🇪🇸 Español](BOX_SETUP.es.md) | [🇹🇭 ภาษาไทย](BOX_SETUP.th.md) | [🇲🇾 Bahasa Melayu](BOX_SETUP.ms.md) | [🇷🇺 Русский](BOX_SETUP.ru.md) | [🇵🇭 Filipino](BOX_SETUP.fil.md) | [🇧🇷 Português](BOX_SETUP.pt.md)

---

## Langkah 1: Cipta Akaun Box Developer

1. Pergi ke [Box Developer Console](https://app.box.com/developers/console)
2. Log masuk dengan akaun Box anda (atau cipta yang baru)
3. Klik **"Create New App"**

## Langkah 2: Cipta Aplikasi OAuth 2.0

1. Pilih **"Custom App"**
2. Pilih **"User Authentication (OAuth 2.0)"**
3. Namakan aplikasi anda: `Marix SSH Client` atau nama pilihan anda
4. Klik **"Create App"**

## Langkah 3: Konfigurasikan Tetapan Aplikasi

### 3.1. Kelayakan OAuth 2.0

1. Dalam tetapan aplikasi, pergi ke tab **"Configuration"**
2. Catatkan:
   - **Client ID**
   - **Client Secret** (klik "Fetch Client Secret" jika perlu)

### 3.2. OAuth 2.0 Redirect URI

1. Tatal ke **"OAuth 2.0 Redirect URI"**
2. Tambah: `http://localhost` (Box membenarkan mana-mana port localhost)
3. Klik **"Save Changes"**

### 3.3. Skop Aplikasi

1. Di bawah **"Application Scopes"**, pastikan ini diaktifkan:
   - ✅ Read all files and folders stored in Box
   - ✅ Write all files and folders stored in Box
2. Klik **"Save Changes"**

## Langkah 4: Konfigurasikan Kelayakan dalam Marix

### Pilihan A: Pembangunan Tempatan

1. Cipta `box-credentials.json` dalam `src/main/services/`:
```json
{
  "client_id": "YOUR_BOX_CLIENT_ID",
  "client_secret": "YOUR_BOX_CLIENT_SECRET"
}
```

2. **PENTING**: Tambah ke `.gitignore`:
```
src/main/services/box-credentials.json
```

### Pilihan B: CI/CD dengan GitHub Secrets (Disyorkan)

1. Pergi ke repositori GitHub anda → **Settings** → **Secrets and variables** → **Actions**
2. Tambah secrets ini:
   - `BOX_CLIENT_ID`: Client ID Box anda
   - `BOX_CLIENT_SECRET`: Client Secret Box anda
3. Aliran kerja build akan menyuntik kelayakan secara automatik semasa build

## Langkah 5: Uji Aliran OAuth

1. Buka aplikasi Marix
2. Pergi ke **Tetapan** > **Sandaran & Pulihkan** > **Cipta/Pulihkan Sandaran**
3. Pilih tab **"Box"**
4. Klik **"Sambung ke Box"**
5. Pelayar akan membuka skrin OAuth Box
6. Log masuk dan berikan kebenaran
7. Aplikasi akan menerima token dan memaparkan "Disambungkan"

## Nota Keselamatan

- **JANGAN** commit `box-credentials.json` ke Git
- Gunakan **GitHub Secrets** untuk build CI/CD untuk melindungi client_secret
- Token disimpan dengan selamat menggunakan safeStorage Electron
- PKCE digunakan untuk keselamatan aliran OAuth tambahan
- Port callback rawak digunakan untuk mengelakkan konflik

## Kelulusan Aplikasi (Pilihan)

Untuk kegunaan peribadi, aplikasi anda berfungsi serta-merta. Untuk pengedaran awam:

1. Pergi ke tab **"General Settings"**
2. Hantar aplikasi anda untuk semakan jika perlu
3. Box akan menyemak dan meluluskan aplikasi anda

## Penyelesaian Masalah

### Ralat: "Invalid client_id or client_secret"
- Sahkan kelayakan dalam fail box-credentials.json anda
- Salin semula Client ID dan Client Secret dari Box Developer Console

### Ralat: "Redirect URI mismatch"
- Pastikan `http://localhost` ditambah dalam tetapan aplikasi Box
- Box menyokong port dinamik dengan localhost

### Ralat: "Access denied"
- Pengguna menolak pemberian kebenaran
- Periksa skop aplikasi dalam Box Developer Console
