<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>Klien SSH Zero-Knowledge Modern</strong>
</p>

<p align="center">
  <em>Kredensial Anda tidak pernah meninggalkan perangkat. Tanpa cloud. Tanpa pelacakan. Tanpa kompromi.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
</p>

---

## 🌍 Bahasa Lain

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇨🇳 [中文](README.zh.md) | 🇰🇷 [한국어](README.ko.md) |
| 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) | 🇪🇸 [Español](README.es.md) |
| 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) | 🇵🇭 [Filipino](README.fil.md) |
| 🇧🇷 [Português](README.pt.md) | | | |

---

## ⚠️ Disclaimer

> **You are responsible for your own data.**
>
> Marix menyimpan semua data secara local dengan encryption kuat. Namun:
> - Password hilang = **data tidak dapat dipulihkan**
> - **Tidak ada server** — tidak ada opsi "lupa password"
> - **Backup secara teratur** — hardware bisa rusak
> - Anda memiliki security Anda sendiri

---

## 🔒 Arsitektur Zero-Knowledge

### Prinsip Inti

| | Prinsip | Deskripsi |
|---|---------|-----------|
| 🔐 | **100% Offline** | Semua kredensial disimpan lokal—tidak pernah diunggah |
| ☁️ | **Tanpa Cloud** | Kami tidak memiliki server. Data tidak pernah menyentuh internet |
| 📊 | **No Telemetry** | Tanpa pelacakan, tanpa analitik, tanpa pengumpulan data |
| 🔓 | **Open Source** | Kode yang sepenuhnya dapat diaudit di bawah GPL-3.0 |

### Teknologi Enkripsi

| | Fitur | Teknologi | Deskripsi |
|---|-------|-----------|-----------|
| 🛡️ | **Penyimpanan Lokal** | Argon2id + AES-256 | Kredensial dienkripsi saat disimpan |
| 📦 | **Backup File** | Argon2id + AES-256-GCM | Ekspor file `.marix` terenkripsi |
| 🔄 | **Sinkronisasi GitHub** | Argon2id + AES-256-GCM | Backup cloud zero-knowledge |

---

## ⚡ Performa & Optimasi

### Manajemen Memori Adaptif

| RAM Sistem | Memori Argon2id | Level Keamanan |
|------------|-----------------|----------------|
| ≥ 8 GB | 64 MB | Tinggi |
| ≥ 4 GB | 32 MB | Sedang |
| < 4 GB | 16 MB | Dioptimalkan untuk RAM rendah |

### Optimasi Runtime

| Optimasi | Teknologi | Manfaat |
|----------|-----------|---------|
| **Batas V8 Heap** | `--max-old-space-size=256MB` | Mencegah pembengkakan memori |
| **Background Throttling** | `--disable-renderer-backgrounding` | Menjaga koneksi tetap hidup |
| **Terminal Buffer** | Scrollback: 3.000 baris | Pengurangan memori 70% |
| **Lazy Loading** | Pemuatan komponen sesuai permintaan | Startup lebih cepat |

### Tech Stack

| Komponen | Teknologi | Tujuan |
|----------|-----------|--------|
| **Framework** | Electron 39 + React 19 | Aplikasi desktop lintas platform |
| **Terminal** | xterm.js 6 | Emulasi terminal performa tinggi |
| **SSH/SFTP** | ssh2 + node-pty | Implementasi protokol SSH native |
| **Code Editor** | CodeMirror 6 | Syntax highlighting ringan |
| **Enkripsi** | Argon2 + Node.js Crypto | Client-side encryption yang kuat |
| **Styling** | Tailwind CSS 4 | CSS modern dan minimal |
| **Build** | Webpack 5 + TypeScript 5 | Bundle produksi teroptimasi |

---

## 📥 Unduh

| OS | Unduh |
|----|-------|
| **Windows** | [Unduh .exe](https://github.com/user/marix/releases/latest/download/Marix-Setup.exe) |
| **macOS** | [Intel .dmg](https://github.com/user/marix/releases/latest/download/Marix.dmg) • [Apple Silicon](https://github.com/user/marix/releases/latest/download/Marix-arm64.dmg) |
| **Linux** | [.AppImage](https://github.com/user/marix/releases/latest/download/Marix.AppImage) • [.deb](https://github.com/user/marix/releases/latest/download/marix.deb) • [.rpm](https://github.com/user/marix/releases/latest/download/marix.rpm) |

---

## ✨ Fitur

### 🔌 Koneksi Multi-Protokol

| Protokol | Teknologi | Deskripsi |
|----------|-----------|-----------|
| **SSH** | ssh2 + node-pty | Secure Shell dengan autentikasi password & private key |
| **SFTP** | ssh2 | File manager dual-panel dengan drag-and-drop |
| **FTP/FTPS** | basic-ftp | Dukungan FTP standar dan aman |
| **RDP** | xfreerdp3 / mstsc | Remote Desktop (xfreerdp3 di Linux, mstsc di Windows) |

### 💻 Terminal

- **400+ tema warna** — Dracula, Solarized, Catppuccin, Nord...
- **Font kustom** — Font sistem apapun
- **Full xterm.js 6** — Emulasi terminal lengkap dengan Unicode
- **Preservasi sesi** — Tab tetap ada saat reconnect
- **Deteksi OS** — Auto-detect distro Linux

### 📁 File Manager SFTP

- **Interface dual-panel** — Lokal ↔ Remote berdampingan
- **Editor terintegrasi** — CodeMirror 6 dengan syntax highlighting 15+ bahasa
- **Drag & drop** — Upload/download file dengan mudah
- **Manajemen permission** — chmod dengan interface visual

### 🛠️ Tools Bawaan

- **DNS & Network**: A, AAAA, MX, TXT, SPF, CNAME, NS, SOA, PTR, Ping, Traceroute, TCP port, HTTP/HTTPS, SMTP, Blacklist, WHOIS, ARIN
- **Cloudflare DNS Manager**: Kelola domain, record DNS, proxy Cloudflare
- **SSH Key Manager**: Generate RSA-4096, Ed25519, ECDSA-521, import/export key
- **Known Hosts Manager**: Lihat fingerprint, import dari host, hapus host tidak terpercaya

---

## 💾 Backup & Restore

### Cara Enkripsi Bekerja

Semua backup menggunakan **Argon2id** dan **AES-256-GCM**:

<p align="center">
  <img src="flow.png" alt="Alur Enkripsi" width="800">
</p>

### Apa yang Di-backup

| Data | Termasuk | Terenkripsi |
|------|----------|-------------|
| Daftar server | ✅ | ✅ AES-256-GCM |
| SSH private key | ✅ | ✅ AES-256-GCM |
| Cloudflare API token | ✅ | ✅ AES-256-GCM |
| Pengaturan aplikasi | ✅ | ✅ AES-256-GCM |
| Known hosts | ❌ | — |

### Jaminan Keamanan

- 🔐 **Password tidak pernah disimpan** — Tidak di file, tidak di GitHub
- 🔒 **Zero-knowledge** — Bahkan developer tidak bisa mendekripsi
- 🛡️ **Tahan brute-force** — Argon2id membutuhkan 16-64MB RAM per percobaan
- ✅ **Tahan manipulasi** — AES-GCM mendeteksi modifikasi apapun

### Backup GitHub (Zero-Knowledge)

1. **Login dengan GitHub** → Kode perangkat muncul → Browser terbuka → Izinkan → Repository `marix-backup` otomatis dibuat
2. **Backup**: Klik "Backup ke GitHub" → Masukkan password → Data terenkripsi di-push
3. **Restore**: Login GitHub → "Restore dari GitHub" → Masukkan password untuk dekripsi

> ⚠️ **Penting**: Jika kehilangan password, backup **tidak dapat dipulihkan selamanya**. Tidak ada yang bisa mendekripsinya.

---

## 🛡️ Spesifikasi Keamanan

| Komponen | Algoritma | Parameter |
|----------|-----------|-----------|
| Key Derivation | Argon2id | 16-64MB memori, 3 iterasi, 4 lane |
| Enkripsi | AES-256-GCM | Key 256-bit, terautentikasi |
| Salt | CSPRNG | 32 byte per backup |
| IV/Nonce | CSPRNG | 16 byte per operasi |

### Persyaratan Password

- ✅ Minimal 10 karakter
- ✅ Minimal 1 huruf besar (A-Z)
- ✅ Minimal 1 huruf kecil (a-z)
- ✅ Minimal 1 angka (0-9)
- ✅ Minimal 1 karakter khusus (!@#$%^&*...)

---

## 🔧 Build dari Source

```bash
git clone https://github.com/marixdev/marix.git
cd marix
npm install
npm run dev      # Development
npm run build    # Build
npm run package:linux  # Package
```

### Dependensi RDP untuk Linux

```bash
# Ubuntu/Debian
sudo apt install freerdp3-x11 xdotool

# Fedora
sudo dnf install freerdp xdotool

# Arch
sudo pacman -S freerdp xdotool
```

---

## 📄 Lisensi

**GNU General Public License v3.0** (GPL-3.0)

---

<p align="center">
  <strong>Marix</strong> — Klien SSH zero-knowledge modern<br>
  <em>Data Anda. Tanggung jawab Anda. Kebebasan Anda.</em>
</p>
