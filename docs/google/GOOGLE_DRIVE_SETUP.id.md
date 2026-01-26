# Panduan Pengaturan Cadangan Google Drive

> **Bahasa**: [🇺🇸 English](GOOGLE_DRIVE_SETUP.en.md) | [🇻🇳 Tiếng Việt](GOOGLE_DRIVE_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](GOOGLE_DRIVE_SETUP.id.md) | [🇨🇳 中文](GOOGLE_DRIVE_SETUP.zh.md) | [🇰🇷 한국어](GOOGLE_DRIVE_SETUP.ko.md) | [🇯🇵 日本語](GOOGLE_DRIVE_SETUP.ja.md) | [🇫🇷 Français](GOOGLE_DRIVE_SETUP.fr.md) | [🇩🇪 Deutsch](GOOGLE_DRIVE_SETUP.de.md) | [🇪🇸 Español](GOOGLE_DRIVE_SETUP.es.md) | [🇹🇭 ภาษาไทย](GOOGLE_DRIVE_SETUP.th.md) | [🇲🇾 Bahasa Melayu](GOOGLE_DRIVE_SETUP.ms.md) | [🇷🇺 Русский](GOOGLE_DRIVE_SETUP.ru.md) | [🇵🇭 Filipino](GOOGLE_DRIVE_SETUP.fil.md) | [🇧🇷 Português](GOOGLE_DRIVE_SETUP.pt.md)

---

## Langkah 1: Buat Google Cloud Project

1. Kunjungi [Google Cloud Console](https://console.cloud.google.com/)
2. Klik **"New Project"** di pojok kanan atas
3. Beri nama proyek: `Marix SSH Client` atau nama yang Anda inginkan
4. Klik **"Create"**

## Langkah 2: Aktifkan Google Drive API

1. Di proyek yang baru dibuat, buka **"APIs & Services"** > **"Library"**
2. Cari **"Google Drive API"**
3. Klik hasilnya dan tekan **"Enable"**

## Langkah 3: Buat OAuth 2.0 Credentials

### 3.1. Konfigurasi OAuth Consent Screen

1. Buka **"APIs & Services"** > **"OAuth consent screen"**
2. Pilih **"External"** (memungkinkan pengguna akun Google mana pun)
3. Klik **"Create"**

**Informasi aplikasi:**
- App name: `Marix SSH Client`
- User support email: `your-email@gmail.com`
- App logo: (opsional) upload logo Anda
- Application home page: `https://github.com/marixdev/marix`
- Application privacy policy link: (opsional)
- Application terms of service link: (opsional)

**Informasi kontak pengembang:**
- Email addresses: `your-email@gmail.com`

4. Klik **"Save and Continue"**

**Scopes:**
5. Klik **"Add or Remove Scopes"**
6. Temukan dan pilih scope berikut:
   - `https://www.googleapis.com/auth/drive.file` (hanya file yang dibuat oleh aplikasi ini)
7. Klik **"Update"** dan **"Save and Continue"**

**Test users:** (hanya diperlukan saat Publishing status = Testing)
8. Klik **"Add Users"**
9. Masukkan email akun Google untuk testing
10. Klik **"Save and Continue"**

11. Review dan klik **"Back to Dashboard"**

### 3.2. Buat OAuth Client ID

1. Buka **"APIs & Services"** > **"Credentials"**
2. Klik **"Create Credentials"** > **"OAuth client ID"**
3. Pilih **"Desktop app"** (untuk aplikasi Electron)
4. Beri nama: `Marix Desktop Client`
5. Klik **"Create"**

6. **Salin Client ID**: Klik ikon salin untuk menyalin Client ID Anda
   - Anda hanya memerlukan `client_id` - tidak perlu client secret (menggunakan PKCE)
   - Buat file `google-credentials.json` di `src/main/services/`

7. **Simpan Client ID** (client_secret TIDAK diperlukan dengan PKCE):
```json
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com"
  }
}
```

## Langkah 4: Konfigurasi di Marix

1. Copy file `google-credentials.json` ke folder `src/main/services/`
2. **PENTING**: Tambahkan ke `.gitignore`:
```
src/main/services/google-credentials.json
```

3. Aplikasi akan secara otomatis memuat credentials saat startup

## Langkah 5: Tes OAuth Flow

1. Buka aplikasi Marix
2. Buka **Settings** > **Backup & Restore** > **Create/Restore Backup**
3. Pilih tab **"Google Drive"**
4. Klik **"Connect to Google Drive"**
5. Browser akan terbuka dengan layar OAuth Google
6. Pilih akun Google Anda dan berikan izin
7. Aplikasi akan menerima token dan menampilkan "Connected"

## Catatan Keamanan

- **JANGAN** commit `google-credentials.json` ke Git
- Refresh token disimpan di Electron store (terenkripsi)
- Hanya minta izin minimum yang diperlukan
- PKCE digunakan untuk alur OAuth yang aman (tidak perlu client secret)

## Publikasi Aplikasi (Wajib)

Untuk mengizinkan semua pengguna menggunakan aplikasi:

1. Buka **OAuth consent screen**
2. Klik **"Publish App"**
3. Aplikasi Anda akan langsung disetujui
4. Siapa pun dapat menggunakannya tanpa peringatan "unverified app"

## Pemecahan Masalah

### Error: "Access blocked: This app's request is invalid"
- Periksa bahwa OAuth consent screen sudah dikonfigurasi lengkap
- Pastikan redirect_uri sesuai dengan pengaturan

### Error: "The OAuth client was not found"
- Verifikasi Client ID di file credentials
- Download ulang file JSON dari Google Cloud Console

### Error: "Access denied"
- Pengguna menolak pemberian izin
- Tambahkan scope yang sesuai di OAuth consent screen
