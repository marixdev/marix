<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>Aplikasi SSH Zero-Knowledge Modern</strong>
</p>

<p align="center">
  <em>Kredensial Anda tidak pernah meninggalkan perangkat. Tanpa cloud. Tanpa tracking. Tanpa kompromi.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
  <img src="https://img.shields.io/badge/version-1.0.4-orange" alt="Version">
</p>

<p align="center">
  <a href="https://marix.dev">🌐 Website</a> •
  <a href="#-unduh">📥 Unduh</a> •
  <a href="#-fitur">✨ Fitur</a> •
  <a href="#-spesifikasi-keamanan">🛡️ Keamanan</a> •
  <a href="#-bahasa-lain">🌍 Bahasa</a>
</p>

---

## 🌍 Bahasa lain

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩�� [Deutsch](README.de.md) |
| 🇪🇸 [Español](README.es.md) | 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) |
| 🇵🇭 [Filipino](README.fil.md) | 🇧🇷 [Português](README.pt.md) | | |

---

## 🎯 Untuk siapa Marix?

- **Developers & DevOps engineers** yang mengelola banyak server
- **Administrator sistem** yang mengutamakan keamanan dan kinerja
- **Pengguna peduli privasi** yang tidak mempercayai solusi cloud
- **Siapa saja** yang ingin kontrol penuh atas informasi SSH mereka

---

## ⚠️ Pemberitahuan Penting

> **ANDA BERTANGGUNG JAWAB ATAS DATA ANDA.**
>
> Marix menyimpan semua data secara lokal di perangkat Anda dengan enkripsi kuat. Namun:
> - **Kami tidak dapat memulihkan data** jika Anda kehilangan password backup
> - **Kami tidak memiliki server** - tidak ada opsi "lupa password"
> - **Backup secara rutin** - hardware bisa rusak
> - **Anda memiliki keamanan Anda** - kami menyediakan tools, Anda yang memutuskan
>
> Dengan menggunakan Marix, Anda menerima tanggung jawab penuh atas keamanan data Anda.

---

## 🔒 Arsitektur Zero-Knowledge

> **"Kunci Anda. Server Anda. Privasi Anda."**

### Prinsip inti

| | Prinsip | Deskripsi |
|---|---------|-----------|
| 🔐 | **100% Offline** | Semua informasi disimpan lokal di perangkat—tidak pernah diupload |
| ☁️ | **Tanpa Cloud** | Kami tidak memiliki server. Data tidak pernah menyentuh internet |
| 📊 | **Tanpa Telemetry** | Tidak ada tracking, analytics, atau pengumpulan data |
| 🔓 | **Open Source** | Kode sepenuhnya dapat diaudit di bawah GPL-3.0, tanpa backdoor tersembunyi |

### Teknologi enkripsi

| | Komponen | Teknologi | Deskripsi |
|---|-----------|-----------|-----------|
| 🛡️ | **Penyimpanan lokal** | Argon2id + AES-256 | Informasi dienkripsi saat disimpan di perangkat |
| 📦 | **File Backup** | Argon2id + AES-256-GCM | Export file `.marix` yang dienkripsi dengan authenticated encryption |
| 🔄 | **GitHub Sync** | Argon2id + AES-256-GCM | Backup cloud zero-knowledge—GitHub hanya menyimpan blob terenkripsi |

---

## ⚡ Kinerja & Optimisasi

Marix dioptimalkan untuk berjalan lancar pada mesin dengan spesifikasi rendah:

### Manajemen memori adaptif

| RAM sistem | Memori Argon2id | Level keamanan |
|------------|-----------------|----------------|
| ≥ 8 GB | 64 MB | Tinggi |
| ≥ 4 GB | 32 MB | Sedang |
| < 4 GB | 16 MB | Dioptimalkan untuk RAM rendah |

Aplikasi secara otomatis mendeteksi RAM sistem dan menyesuaikan parameter enkripsi untuk mencapai kinerja optimal sambil mempertahankan keamanan.

### Optimasi runtime

| Optimasi | Teknologi | Manfaat |
|----------|-----------|---------|
| **V8 Heap Limit** | `--max-old-space-size=256MB` | Mencegah memory bloat |
| **Background Throttling** | `--disable-renderer-backgrounding` | Menjaga koneksi tetap aktif |
| **Terminal Buffer** | Scrollback: 3,000 baris | Mengurangi 70% memori dibanding default |
| **Lazy Loading** | On-demand component loading | Startup lebih cepat |
| **GC Hints** | Manual garbage collection triggers | Mengurangi memory footprint |

### Tech Stack

| Komponen | Teknologi | Tujuan |
|----------|-----------|--------|
| **Framework** | Electron 39 + React 19 | Aplikasi desktop lintas platform |
| **Terminal** | xterm.js 6 | Emulasi terminal performa tinggi |
| **SSH/SFTP** | ssh2 + node-pty | Implementasi SSH protocol native |
| **Code Editor** | CodeMirror 6 | Syntax highlighting ringan |
| **Enkripsi** | Argon2 + Node.js Crypto | Enkripsi client-side yang kuat |
| **Styling** | Tailwind CSS 4 | CSS modern, minimalis |
| **Build** | Webpack 5 + TypeScript 5 | Bundle produksi yang dioptimalkan |

---

## 📥 Unduh

<table>
<tr>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/windows-10.png" width="64"><br>
<b>Windows</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-Setup.exe">Download .exe</a>
</td>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/mac-os.png" width="64"><br>
<b>macOS</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-Intel.zip">Intel .zip</a><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-arm64.zip">Apple Silicon</a>
</td>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/linux.png" width="64"><br>
<b>Linux</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix.AppImage">.AppImage</a> •
<a href="https://github.com/user/marix/releases/latest/download/marix.deb">.deb</a> •
<a href="https://github.com/user/marix/releases/latest/download/marix.rpm">.rpm</a>
</td>
</tr>
</table>

---

## ✨ Fitur

### 🔌 Koneksi multi-protokol

| Protokol | Deskripsi |
|----------|-----------|
| **SSH** | Secure Shell dengan autentikasi password & private key |
| **SFTP** | Manajer file dual-pane dengan drag-and-drop |
| **FTP/FTPS** | Dukungan FTP standar dan aman |
| **RDP** | Remote Desktop (xfreerdp3 di Linux, mstsc di Windows) |

### 💻 Terminal

- **400+ tema warna** - Dari Dracula hingga Solarized, Catppuccin, Nord, dan lebih banyak lagi
- **Font kustom** - Font sistem apa pun, ukuran berapa pun
- **Full xterm.js 6** - Emulasi terminal lengkap dengan dukungan Unicode
- **Preservasi sesi** - Tab bertahan melalui koneksi ulang
- **Deteksi OS** - Deteksi distro Linux otomatis & menampilkan info sistem

### 📁 SFTP File Manager

- **Interface dual-pane** - Lokal ↔ Remote berdampingan
- **Editor terintegrasi** - CodeMirror 6 dengan syntax highlighting 15+ bahasa
- **Drag & drop** - Upload/download file dengan mudah
- **Manajemen permission** - chmod dengan interface intuitif
- **Operasi batch** - Pilih banyak file untuk transfer

### 🛠️ Tools terintegrasi

#### LAN File Transfer
*Bagikan file secara instan antara perangkat di jaringan lokal.*

#### LAN Server Sharing
*Bagikan konfigurasi server dengan perangkat terdekat secara aman.*

#### DNS & Network Tools
- DNS lookup
- WHOIS query
- Port scanner
- Traceroute

#### Cloudflare DNS Manager
*Tool opsional terintegrasi untuk mengelola Cloudflare DNS langsung dari workspace SSH Anda.*

#### SSH Key Manager
- Generate pasangan SSH key (Ed25519, RSA, ECDSA)
- Import/export keys
- Kelola known hosts

#### Known Hosts Manager
- Lihat dan kelola known hosts
- Hapus fingerprints lama
- Export/import known hosts

### 🎨 Pengalaman pengguna

- **Tema Dark & Light** - Ikuti sistem atau beralih manual
- **14 bahasa** didukung
- **Tag server** - Organisir dengan tag berwarna
- **Koneksi cepat** - Cmd/Ctrl+K untuk mencari server
- **Riwayat koneksi** - Akses cepat koneksi terbaru

---

## 💾 Backup & Restore

### Bagaimana enkripsi bekerja

Semua backup menggunakan **Argon2id** (pemenang Password Hashing Competition) dan **AES-256-GCM** (authenticated encryption):

```
Password → Argon2id(16-64MB memory) → 256-bit key → AES-256-GCM → Backup terenkripsi
```

### Data apa yang di-backup

| Data | Ya | Terenkripsi |
|------|:--:|:-----------:|
| Daftar server (hosts, ports, credentials) | ✅ | ✅ |
| SSH private keys | ✅ | ✅ |
| Cloudflare API token | ✅ | ✅ |
| Pengaturan & preferensi aplikasi | ✅ | ✅ |
| Known hosts | ✅ | ✅ |

### Jaminan keamanan

🔐 **Password tidak pernah disimpan** — Tidak di file, tidak di GitHub, tidak di mana pun  
🔒 **Zero-knowledge** — Bahkan pengembang Marix tidak dapat mendekripsi backup Anda  
🛡️ **Tahan brute-force** — Argon2id membutuhkan 16-64MB RAM per percobaan  
✅ **Anti-tamper** — AES-GCM mendeteksi setiap modifikasi pada data terenkripsi  
🔄 **Kompatibel multi-mesin** — Backup menyimpan memory cost untuk portabilitas

---

### Backup terenkripsi lokal

Export semua data Anda sebagai file `.marix` yang terenkripsi:

1. **Masuk ke Settings** → **Backup & Restore**
2. **Buat password** yang memenuhi persyaratan:
   - Minimal 10 karakter
   - 1 huruf besar, 1 huruf kecil, 1 angka, 1 karakter khusus
3. **Export** - File dienkripsi sebelum disimpan
4. **Simpan dengan aman** - Jaga file backup dan ingat password

---

### Google Drive Backup (Zero-Knowledge)

Sinkronkan backup terenkripsi Anda dengan aman ke Google Drive:

#### Setup

📘 **Panduan setup**: Lihat [docs/google/GOOGLE_DRIVE_SETUP.id.md](../docs/google/GOOGLE_DRIVE_SETUP.id.md) untuk panduan lengkap.

ℹ️ **Versi pre-built**: Jika Anda menggunakan build siap pakai (AppImage, RPM, dll.), kredensial Google sudah terintegrasi. Anda bisa skip langkah 1 dan langsung terhubung.

1. **Konfigurasi OAuth Credentials**:
   - Buat Google Cloud Project
   - Aktifkan Google Drive API
   - Buat OAuth 2.0 Client ID
   - Download file credentials JSON
   - Simpan sebagai `src/main/services/google-credentials.json`

2. **Hubungkan di Marix**:
   - Masuk ke Settings → Backup & Restore → Google Drive
   - Klik "Hubungkan Google Drive"
   - Browser membuka untuk OAuth dengan Google
   - Berikan izin akses
   - App menerima token aman

3. **Buat Backup**:
   - Masukkan password enkripsi (10+ karakter)
   - Klik "Buat Backup"
   - File diupload ke folder "Marix Backups" di Drive

4. **Pulihkan Backup**:
   - Klik "Pulihkan dari Google Drive"
   - Masukkan password backup
   - Semua server dan settings dipulihkan

#### Cara kerja

✅ **Enkripsi end-to-end** - Data dienkripsi sebelum meninggalkan perangkat  
✅ **Zero-knowledge** - Google hanya melihat blob terenkripsi  
✅ **Hanya Anda yang punya key** - OAuth token disimpan lokal  
✅ **Folder pribadi** - File hanya dapat diakses oleh app Anda

---

### GitHub Backup (Zero-Knowledge)

Sinkronkan backup terenkripsi Anda dengan aman ke repository GitHub private:

#### Setup

1. **Login dengan GitHub**:
   - Masuk ke Settings → Backup & Restore → GitHub Backup
   - Klik "Login dengan GitHub"
   - Device code akan muncul di app
   - Browser otomatis membuka - masukkan code dan authorize
   - Selesai! Repository private `marix-backup` otomatis dibuat

2. **Backup**:
   - Klik "Backup to GitHub"
   - Masukkan password backup
   - Data terenkripsi di-push ke repository

3. **Restore di perangkat lain**:
   - Install Marix
   - Login dengan GitHub (langkah yang sama)
   - Klik "Restore from GitHub"
   - Masukkan password backup untuk dekripsi

#### Mengapa GitHub aman

| Lapisan | Proteksi |
|---------|----------|
| **Enkripsi client-side** | Data dienkripsi sebelum meninggalkan perangkat |
| **Argon2id KDF** | 16-64MB memory, 3 iterations, 4 parallel lanes |
| **AES-256-GCM** | Authenticated encryption dengan IV acak |
| **GitHub storage** | Hanya ciphertext terenkripsi yang disimpan |
| **Tanpa Marix server** | Komunikasi langsung client ↔ GitHub |

⚠️ **Penting**: Jika Anda kehilangan password backup, backup Anda **tidak dapat dipulihkan selamanya**. Kami tidak bisa mendekripsi. Tidak ada yang bisa.

---

## 🛡️ Spesifikasi keamanan

### Detail enkripsi

| Algoritma | Parameter |
|-----------|-----------|
| **Key Derivation** | Argon2id (memory: 16-64MB, iterations: 3, parallelism: 4) |
| **Symmetric Encryption** | AES-256-GCM |
| **Salt** | 32 bytes (cryptographically random) |
| **IV/Nonce** | 16 bytes (unique per encryption) |
| **Auth Tag** | 16 bytes (GCM authentication tag) |

### Algoritma SSH Key

| Algoritma | Ukuran Key | Penggunaan |
|-----------|------------|------------|
| **Ed25519** | 256-bit | Direkomendasikan (cepat, aman) |
| **RSA** | 2048-4096 bit | Kompatibilitas legacy |
| **ECDSA** | 256-521 bit | Alternatif untuk Ed25519 |

### Persyaratan password

Password backup Anda harus mengandung:

✅ Minimal 10 karakter  
✅ Setidaknya 1 huruf besar (A-Z)  
✅ Setidaknya 1 huruf kecil (a-z)  
✅ Setidaknya 1 angka (0-9)  
✅ Setidaknya 1 karakter khusus (!@#$%^&*...)

---

## 🔧 Build dari Source

```bash
# Clone repository
git clone https://github.com/user/marix.git
cd marix

# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Package untuk distribusi
npm run package:win    # Windows (.exe)
npm run package:mac    # macOS (.zip)
npm run package:linux  # Linux (.AppImage, .deb, .rpm)
```

### Persyaratan sistem

|  | Minimal | Direkomendasikan |
|--|---------|------------------|
| **OS** | Windows 10, macOS 10.13, Ubuntu 18.04 | Terbaru |
| **RAM** | 2 GB | 4 GB+ |
| **Penyimpanan** | 200 MB | 500 MB |

### Dependensi RDP untuk Linux

```bash
# Install xfreerdp3 untuk dukungan RDP
sudo apt install freerdp3-x11  # Debian/Ubuntu
sudo dnf install freerdp       # Fedora
sudo pacman -S freerdp         # Arch
```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **GNU General Public License v3.0** (GPL-3.0).

Ini berarti:

✅ Anda dapat menggunakan, memodifikasi, dan mendistribusikan software ini  
✅ Anda dapat menggunakannya untuk tujuan komersial  
⚠️ Setiap modifikasi juga harus dirilis di bawah GPL-3.0  
⚠️ Anda harus membuka source code saat mendistribusikan  
⚠️ Anda harus menyatakan perubahan yang dibuat pada kode

Lihat [LICENSE](../LICENSE) untuk teks lisensi lengkap.

---

<p align="center">
  <strong>Marix</strong><br>
  Aplikasi SSH zero-knowledge modern<br><br>
  <em>Data Anda. Tanggung jawab Anda. Kebebasan Anda.</em><br><br>
  Jika Anda menginginkan kenyamanan dengan mengorbankan privasi, Marix bukan untuk Anda.
</p>
