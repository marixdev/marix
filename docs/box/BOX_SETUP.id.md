# Panduan Pengaturan Backup Box.net

> **Bahasa**: [🇺🇸 English](BOX_SETUP.en.md) | [🇻🇳 Tiếng Việt](BOX_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](BOX_SETUP.id.md) | [🇨🇳 中文](BOX_SETUP.zh.md) | [🇰🇷 한국어](BOX_SETUP.ko.md) | [🇯🇵 日本語](BOX_SETUP.ja.md) | [🇫🇷 Français](BOX_SETUP.fr.md) | [🇩🇪 Deutsch](BOX_SETUP.de.md) | [🇪🇸 Español](BOX_SETUP.es.md) | [🇹🇭 ภาษาไทย](BOX_SETUP.th.md) | [🇲🇾 Bahasa Melayu](BOX_SETUP.ms.md) | [🇷🇺 Русский](BOX_SETUP.ru.md) | [🇵🇭 Filipino](BOX_SETUP.fil.md) | [🇧🇷 Português](BOX_SETUP.pt.md)

---

## Langkah 1: Buat Akun Box Developer

1. Buka [Box Developer Console](https://app.box.com/developers/console)
2. Masuk dengan akun Box Anda (atau buat baru)
3. Klik **"Create New App"**

## Langkah 2: Buat Aplikasi OAuth 2.0

1. Pilih **"Custom App"**
2. Pilih **"User Authentication (OAuth 2.0)"**
3. Beri nama aplikasi: `Marix SSH Client` atau nama yang Anda inginkan
4. Klik **"Create App"**

## Langkah 3: Konfigurasi Pengaturan Aplikasi

### 3.1. Kredensial OAuth 2.0

1. Di pengaturan aplikasi, buka tab **"Configuration"**
2. Catat:
   - **Client ID**
   - **Client Secret** (klik "Fetch Client Secret" jika diperlukan)

### 3.2. OAuth 2.0 Redirect URI

1. Gulir ke **"OAuth 2.0 Redirect URI"**
2. Tambahkan: `http://localhost` (Box mengizinkan port localhost mana pun)
3. Klik **"Save Changes"**

### 3.3. Cakupan Aplikasi

1. Di bawah **"Application Scopes"**, pastikan ini diaktifkan:
   - ✅ Read all files and folders stored in Box
   - ✅ Write all files and folders stored in Box
2. Klik **"Save Changes"**

## Langkah 4: Konfigurasi Kredensial di Marix

### Opsi A: Pengembangan Lokal

1. Buat `box-credentials.json` di `src/main/services/`:
```json
{
  "client_id": "YOUR_BOX_CLIENT_ID",
  "client_secret": "YOUR_BOX_CLIENT_SECRET"
}
```

2. **PENTING**: Tambahkan ke `.gitignore`:
```
src/main/services/box-credentials.json
```

### Opsi B: CI/CD dengan GitHub Secrets (Direkomendasikan)

1. Buka repositori GitHub Anda → **Settings** → **Secrets and variables** → **Actions**
2. Tambahkan secrets ini:
   - `BOX_CLIENT_ID`: Client ID Box Anda
   - `BOX_CLIENT_SECRET`: Client Secret Box Anda
3. Alur kerja build akan secara otomatis menyuntikkan kredensial saat build

## Langkah 5: Uji Alur OAuth

1. Buka aplikasi Marix
2. Buka **Pengaturan** > **Backup & Restore** > **Buat/Pulihkan Backup**
3. Pilih tab **"Box"**
4. Klik **"Hubungkan ke Box"**
5. Browser akan membuka layar OAuth Box
6. Masuk dan berikan izin
7. Aplikasi akan menerima token dan menampilkan "Terhubung"

## Catatan Keamanan

- **JANGAN** commit `box-credentials.json` ke Git
- Gunakan **GitHub Secrets** untuk build CI/CD untuk melindungi client_secret
- Token disimpan dengan aman menggunakan safeStorage Electron
- PKCE digunakan untuk keamanan alur OAuth tambahan
- Port callback acak digunakan untuk menghindari konflik

## Persetujuan Aplikasi (Opsional)

Untuk penggunaan pribadi, aplikasi Anda langsung berfungsi. Untuk distribusi publik:

1. Buka tab **"General Settings"**
2. Kirim aplikasi Anda untuk ditinjau jika diperlukan
3. Box akan meninjau dan menyetujui aplikasi Anda

## Pemecahan Masalah

### Error: "Invalid client_id or client_secret"
- Verifikasi kredensial di file box-credentials.json Anda
- Salin ulang Client ID dan Client Secret dari Box Developer Console

### Error: "Redirect URI mismatch"
- Pastikan `http://localhost` ditambahkan di pengaturan aplikasi Box
- Box mendukung port dinamis dengan localhost

### Error: "Access denied"
- Pengguna menolak pemberian izin
- Periksa cakupan aplikasi di Box Developer Console
