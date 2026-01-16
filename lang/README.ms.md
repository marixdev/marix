<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>Klien SSH Zero-Knowledge Moden</strong>
</p>

<p align="center">
  <em>Kredensial anda tidak pernah meninggalkan peranti. Tiada awan. Tiada penjejakan. Tiada kompromi.</em>
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
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) |
| 🇪🇸 [Español](README.es.md) | 🇹🇭 [ภาษาไทย](README.th.md) | 🇷🇺 [Русский](README.ru.md) | 🇵🇭 [Filipino](README.fil.md) |
| 🇧🇷 [Português](README.pt.md) | | | |

---

## ⚠️ Disclaimer

> **You are responsible for your own data.**
>
> Marix stores all data locally with strong encryption. However:
> - If you lose your backup password, **data is unrecoverable**
> - **No servers** — no "forgot password" option
> - **Backup regularly** — hardware can fail
> - You own your security

---

## 🔒 Seni Bina Zero-Knowledge

### Prinsip Teras

| | Prinsip | Penerangan |
|---|---------|------------|
| 🔐 | **100% Luar Talian** | Semua kredensial disimpan secara tempatan—tidak pernah dimuat naik |
| ☁️ | **Tiada Awan** | Kami tidak mempunyai pelayan. Data anda tidak pernah menyentuh Internet |
| 📊 | **No Telemetry** | No tracking, no analytics, no data collection |
| 🔓 | **Sumber Terbuka** | Kod yang boleh diaudit sepenuhnya di bawah GPL-3.0 |

### Teknologi Penyulitan

| | Ciri | Teknologi | Penerangan |
|---|------|-----------|------------|
| 🛡️ | **Storan Tempatan** | Argon2id + AES-256 | Kredensial disulitkan pada peranti |
| 📦 | **Sandaran Fail** | Argon2id + AES-256-GCM | Eksport fail `.marix` yang disulitkan |
| 🔄 | **Segerak GitHub** | Argon2id + AES-256-GCM | Sandaran awan zero-knowledge |

---

## ⚡ Prestasi & Pengoptimuman

### Pengurusan Memori Adaptif

| RAM Sistem | Memori Argon2id | Tahap Keselamatan |
|------------|-----------------|-------------------|
| ≥ 8 GB | 64 MB | Tinggi |
| ≥ 4 GB | 32 MB | Sederhana |
| < 4 GB | 16 MB | Dioptimumkan untuk memori rendah |

### Pengoptimuman Runtime

| Pengoptimuman | Teknologi | Manfaat |
|---------------|-----------|---------|
| **Had V8 Heap** | `--max-old-space-size=256MB` | Mencegah pembengkakan memori |
| **Background Throttling** | `--disable-renderer-backgrounding` | Mengekalkan sambungan |
| **Terminal Buffer** | Scrollback: 3,000 baris | Pengurangan memori 70% |
| **Lazy Loading** | Pemuatan komponen atas permintaan | Permulaan lebih pantas |

### Tech Stack

| Komponen | Teknologi | Tujuan |
|----------|-----------|--------|
| **Framework** | Electron 39 + React 19 | Aplikasi desktop merentas platform |
| **Terminal** | xterm.js 6 | Emulasi terminal berprestasi tinggi |
| **SSH/SFTP** | ssh2 + node-pty | Pelaksanaan protokol SSH asli |
| **Code Editor** | CodeMirror 6 | Penyerlahan sintaks ringan |
| **Penyulitan** | Argon2 + Node.js Crypto | Client-side encryption yang kukuh |
| **Styling** | Tailwind CSS 4 | CSS moden dan minimal |
| **Build** | Webpack 5 + TypeScript 5 | Bundle pengeluaran yang dioptimumkan |

---

## 📥 Muat Turun

| OS | Muat Turun |
|----|-----------|
| **Windows** | [Muat turun .exe](https://github.com/user/marix/releases/latest/download/Marix-Setup.exe) |
| **macOS** | [Intel .dmg](https://github.com/user/marix/releases/latest/download/Marix.dmg) • [Apple Silicon](https://github.com/user/marix/releases/latest/download/Marix-arm64.dmg) |
| **Linux** | [.AppImage](https://github.com/user/marix/releases/latest/download/Marix.AppImage) • [.deb](https://github.com/user/marix/releases/latest/download/marix.deb) • [.rpm](https://github.com/user/marix/releases/latest/download/marix.rpm) |

---

## ✨ Ciri-ciri

### 🔌 Sambungan Pelbagai Protokol

| Protokol | Teknologi | Penerangan |
|----------|-----------|------------|
| **SSH** | ssh2 + node-pty | Secure Shell dengan pengesahan kata laluan & kunci peribadi |
| **SFTP** | ssh2 | Pengurus fail dwi-panel dengan seret dan lepas |
| **FTP/FTPS** | basic-ftp | Sokongan FTP standard dan selamat |
| **RDP** | xfreerdp3 / mstsc | Remote Desktop (xfreerdp3 pada Linux, mstsc pada Windows) |

### 💻 Terminal

- **400+ tema warna** — Dracula, Solarized, Catppuccin, Nord...
- **Fon tersuai** — Mana-mana fon sistem
- **xterm.js 6 penuh** — Emulasi terminal lengkap dengan sokongan Unicode
- **Pemeliharaan sesi** — Tab kekal semasa sambung semula
- **Pengesanan OS** — Pengesanan automatik distro Linux

### 📁 Pengurus Fail SFTP

- **Antara muka dwi-panel** — Tempatan ↔ Jauh bersebelahan
- **Editor bersepadu** — CodeMirror 6 dengan penyerlahan sintaks 15+ bahasa
- **Seret & lepas** — Muat naik/muat turun fail dengan mudah
- **Pengurusan kebenaran** — Antara muka chmod visual

### 🛠️ Alat Terbina Dalam

- **LAN File Transfer**: Hantar fail via LAN — Pengirim pilih fail dan papar kod 6 digit, Penerima masukkan kod untuk cari pengirim dan terima fail secara automatik
- **LAN Server Sharing**: Kongsi konfigurasi pelayan — Pengirim pilih pelayan dan hantar ke peranti yang dipilih, Penerima masukkan kod untuk nyahsulit dan import
- **DNS & Rangkaian**: A, AAAA, MX, TXT, SPF, CNAME, NS, SOA, PTR, Ping, Traceroute, port TCP, HTTP/HTTPS, SMTP, Senarai Hitam, WHOIS, ARIN
- **Pengurus DNS Cloudflare**: Urus domain, rekod DNS, proksi Cloudflare
- **Pengurus Kunci SSH**: Jana RSA-4096, Ed25519, ECDSA-521, import/eksport kunci
- **Pengurus Known Hosts**: Lihat cap jari, import dari hos, padam hos tidak dipercayai

---

## 💾 Sandaran & Pemulihan

### Cara Penyulitan Berfungsi

Semua sandaran menggunakan **Argon2id** dan **AES-256-GCM**:

<p align="center">
  <img src="flow.png" alt="Aliran Penyulitan" width="800">
</p>

### Apa Yang Disandarkan

| Data | Termasuk | Disulitkan |
|------|----------|------------|
| Senarai pelayan | ✅ | ✅ AES-256-GCM |
| Kunci peribadi SSH | ✅ | ✅ AES-256-GCM |
| Token API Cloudflare | ✅ | ✅ AES-256-GCM |
| Tetapan aplikasi | ✅ | ✅ AES-256-GCM |
| Known hosts | ❌ | — |

### Jaminan Keselamatan

- 🔐 **Kata laluan tidak pernah disimpan** — Tidak dalam fail, tidak di GitHub
- 🔒 **Zero-knowledge** — Pembangun pun tidak boleh nyahsulit
- 🛡️ **Tahan brute-force** — Argon2id memerlukan 16-64 MB RAM setiap percubaan
- ✅ **Tahan gangguan** — AES-GCM mengesan sebarang pengubahsuaian

### Sandaran Google Drive (Zero-Knowledge)

Marix kini menyokong sandaran disulitkan end-to-end ke Google Drive anda. Tiada siapa boleh mengakses data anda—walaupun Google—tanpa kata laluan induk anda.

> 📘 **Panduan Persediaan**: [../docs/google/GOOGLE_DRIVE_SETUP.ms.md](../docs/google/GOOGLE_DRIVE_SETUP.ms.md)
> ℹ️ **Versi Pra-dibina**: Jika anda menggunakan versi pra-dibina (AppImage, RPM, dll.), kelayakan Google sudah disertakan. Anda boleh melangkau langkah 1-3 dan sambung terus pada langkah 4.

1. **Cipta projek Google Cloud** dan aktifkan Drive API
2. **Cipta kelayakan OAuth 2.0** (apl desktop)
3. **Muat turun fail JSON** dan simpan sebagai `google-credentials.json`
4. **Sambung di Marix** → apl akan membuka penyemak imbas untuk pengesahan

#### Cara Ia Berfungsi

```
[Kata Laluan Anda] → Argon2id KDF → AES-256-GCM → [Fail Disulitkan] → Google Drive
```

- ✅ **Zero-knowledge**: Kata laluan tidak pernah meninggalkan peranti anda
- ✅ **Penyulitan end-to-end**: Google hanya melihat data disulitkan
- ✅ **Tiada pelayan**: Data mengalir terus dari PC ke Drive
- ✅ **Pemulihan**: Pulihkan dari mana-mana sahaja dengan kata laluan

### Sandaran Google Drive (Zero-Knowledge)

Marix kini menyokong sandaran disulitkan end-to-end ke Google Drive anda. Tiada siapa boleh mengakses data anda—walaupun Google—tanpa kata laluan induk anda.

> 📘 **Panduan Persediaan**: [../docs/google/GOOGLE_DRIVE_SETUP.ms.md](../docs/google/GOOGLE_DRIVE_SETUP.ms.md)

1. **Cipta projek Google Cloud** dan aktifkan Drive API
2. **Cipta kelayakan OAuth 2.0** (apl desktop)
3. **Muat turun fail JSON** dan simpan sebagai `google-credentials.json`
4. **Sambung di Marix** → apl akan membuka penyemak imbas untuk pengesahan

#### Cara Ia Berfungsi

```
[Kata Laluan Anda] → Argon2id KDF → AES-256-GCM → [Fail Disulitkan] → Google Drive
```

- ✅ **Zero-knowledge**: Kata laluan tidak pernah meninggalkan peranti anda
- ✅ **Penyulitan end-to-end**: Google hanya melihat data disulitkan
- ✅ **Tiada pelayan**: Data mengalir terus dari PC ke Drive
- ✅ **Pemulihan**: Pulihkan dari mana-mana sahaja dengan kata laluan

### Sandaran GitHub (Zero-Knowledge)

1. **Log masuk dengan GitHub** → Kod peranti muncul → Pelayar terbuka → Benarkan → Repositori `marix-backup` dicipta secara automatik
2. **Sandaran**: Klik "Sandarkan ke GitHub" → Masukkan kata laluan → Data disulitkan ditolak
3. **Pemulihan**: Log masuk GitHub → "Pulihkan dari GitHub" → Masukkan kata laluan untuk nyahsulit

> ⚠️ **Penting**: Jika anda kehilangan kata laluan sandaran, sandaran anda **tidak boleh dipulihkan selama-lamanya**. Tiada siapa yang boleh nyahsulitkannya.

---

## 🛡️ Spesifikasi Keselamatan

| Komponen | Algoritma | Parameter |
|----------|-----------|-----------|
| Terbitan Kunci | Argon2id | Memori 16-64 MB, 3 lelaran, 4 lorong |
| Penyulitan | AES-256-GCM | Kunci 256-bit, disahkan |
| Garam | CSPRNG | 32 bait setiap sandaran |
| IV/Nonce | CSPRNG | 16 bait setiap operasi |

### Keperluan Kata Laluan

- ✅ Minimum 10 aksara
- ✅ Sekurang-kurangnya 1 huruf besar (A-Z)
- ✅ Sekurang-kurangnya 1 huruf kecil (a-z)
- ✅ Sekurang-kurangnya 1 nombor (0-9)
- ✅ Sekurang-kurangnya 1 aksara khas (!@#$%^&*...)

---

## 🔧 Bina dari Sumber

```bash
git clone https://github.com/marixdev/marix.git
cd marix
npm install
npm run dev      # Pembangunan
npm run build    # Bina
npm run package:linux  # Pakej
```

### Kebergantungan RDP untuk Linux

```bash
# Ubuntu/Debian
sudo apt install freerdp3-x11 xdotool

# Fedora
sudo dnf install freerdp xdotool

# Arch
sudo pacman -S freerdp xdotool
```

---

## 📄 Lesen

**GNU General Public License v3.0** (GPL-3.0)

---

<p align="center">
  <strong>Marix</strong> — Klien SSH zero-knowledge moden<br>
  <em>Data anda. Tanggungjawab anda. Kebebasan anda.</em>
</p>
