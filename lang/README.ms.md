<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>Klien SSH Zero-Knowledge Moden</strong>
</p>

<p align="center">
  <em>Kelayakan anda tidak pernah meninggalkan peranti anda. Tiada awan. Tiada penjejakan. Tiada kompromi.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/client--side%20encryption-🔒-critical" alt="Client-Side Encryption">
  <img src="https://img.shields.io/badge/version-1.0.7-orange" alt="Version">
</p>

<p align="center">
  <a href="https://marix.dev">🌐 Laman Web</a> •
  <a href="#-muat-turun">Muat Turun</a> •
  <a href="#-ciri-ciri">Ciri-ciri</a> •
  <a href="#-keselamatan">Keselamatan</a> •
  <a href="#-bahasa">Bahasa</a>
</p>

---

## 🌍 Bahasa Lain

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) |
| 🇪🇸 [Español](README.es.md) | 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) |
| 🇵🇭 [Filipino](README.fil.md) | 🇧🇷 [Português](README.pt.md) | | |

---

## 🎯 Untuk Siapa Marix?

- **Pembangun dan jurutera DevOps** - Menguruskan berbilang pelayan
- **Pentadbir sistem** - Yang mengutamakan keselamatan dan kecekapan
- **Pengguna yang mementingkan keselamatan** - Yang tidak mempercayai penyelesaian awan
- **Sesiapa sahaja** - Yang mahukan kawalan penuh ke atas kelayakan SSH mereka

---

## ⚠️ Penafian

> **Anda bertanggungjawab untuk data anda.**
>
> Marix menyimpan semua data secara setempat dengan penyulitan kuat. Walau bagaimanapun:
> - Jika anda kehilangan kata laluan sandaran, **data anda tidak boleh dipulihkan**
> - **Tiada pelayan** - tiada pilihan "lupa kata laluan"
> - **Sandarkan secara berkala** - perkakasan boleh rosak
> - **Keselamatan adalah milik anda** - kami menyediakan alat, anda membuat keputusan
>
> Dengan menggunakan Marix, anda menerima tanggungjawab penuh untuk keselamatan data anda.

---

## 🔒 Seni Bina Penyulitan Sisi Klien

> **"Kunci anda. Pelayan anda. Privasi anda."**

### Model Ancaman

Marix direka untuk andaian keselamatan berikut:

> ⚠️ **Marix mengandaikan persekitaran hos tempatan yang tidak terjejas.**  
> Ia tidak cuba mempertahankan diri daripada musuh tahap OS yang berniat jahat atau masa jalan yang terjejas.

**Dalam skop (dilindungi daripada):**
- Kecurian fail sandaran tanpa kata laluan
- Serangan kata laluan brute-force pada sandaran yang disulitkan
- Pengubahan data dalam transit atau storan (dikesan melalui AEAD)
- Akses penyedia awan kepada data anda (penyulitan sisi klien)

**Di luar skop (tidak dilindungi daripada):**
- Perisian hasad dengan akses root/admin pada peranti anda
- Akses fizikal kepada peranti yang tidak dikunci dengan aplikasi berjalan
- Keylogger atau perisian hasad tangkapan skrin
- Sistem pengendalian atau masa jalan Electron yang terjejas

### Apa yang Marix TIDAK Lakukan

| ❌ | Penerangan |
|----|------------|
| **Tiada storan kunci jauh** | Kunci peribadi tidak pernah meninggalkan peranti anda |
| **Tiada eskrow kunci** | Kami tidak dapat memulihkan kunci anda dalam apa jua keadaan |
| **Tiada pemulihan tanpa kata laluan** | Kata laluan hilang = sandaran hilang (direka sebegitu) |
| **Tiada panggilan rangkaian semasa penyulitan** | Operasi kripto adalah 100% luar talian |
| **Tiada pelayan awan** | Kami tidak mengendalikan sebarang infrastruktur |
| **Tiada telemetri** | Sifar analitik, sifar penjejakan, sifar pengumpulan data |

### Prinsip Asas

| | Prinsip | Penerangan |
|---|---------|------------|
| 🔐 | **100% Luar Talian** | Semua kelayakan disimpan secara setempat pada peranti anda—tidak pernah dimuat naik |
| ☁️ | **Tiada Awan** | Tiada pelayan. Data anda tidak pernah menyentuh Internet |
| 📊 | **Tiada Telemetri** | Tiada penjejakan, tiada analitik, tiada pengumpulan data |
| 🔓 | **Sumber Terbuka** | Kod boleh diaudit sepenuhnya di bawah GPL-3.0, tiada pintu belakang tersembunyi |

### Teknologi Penyulitan

| | Ciri | Teknologi | Penerangan |
|---|-----|-----------|------------|
| 🛡️ | **Storan Setempat** | Argon2id + AES-256 | Menyulitkan kelayakan pada peranti |
| 📦 | **Sandaran Fail** | Argon2id + AES-256-GCM | Eksport fail `.marix` dengan penyulitan yang disahkan |
| 🔄 | **Segerak Awan** | Argon2id + AES-256-GCM | Penyulitan sisi klien—penyedia awan hanya menyimpan blob yang disulitkan |

---

## ⚡ Prestasi dan Pengoptimuman

Marix dioptimumkan untuk berjalan lancar walaupun pada mesin yang lemah:

### KDF Auto-Tune (Amalan Terbaik)

Marix menggunakan **auto-calibration** untuk parameter Argon2id—amalan terbaik yang diterima pakai secara meluas dalam kriptografi gunaan:

| Ciri | Penerangan |
|------|------------|
| **Masa Sasaran** | ~1 saat (800-1200ms) pada mesin pengguna |
| **Auto-Calibration** | Memori dan iterasi dilaras automatik pada pelancaran pertama |
| **Adaptif** | Berfungsi secara optimum pada mesin lemah dan berkuasa |
| **Calibration Latar Belakang** | Berjalan semasa permulaan app untuk UX lancar |
| **Parameter Disimpan** | Parameter KDF disimpan dengan data disulitkan untuk penyahsulitan merentas mesin |
| **Lantai Keselamatan** | Minimum 64MB memori, 2 iterasi (melebihi OWASP 47MB) |

> **Mengapa ~1 saat?** Ini adalah cadangan standard dalam kriptografi praktikal. Ia menyediakan rintangan brute-force yang kuat sambil kekal boleh diterima untuk pengalaman pengguna. Parameter menyesuaikan diri secara automatik kepada setiap mesin—tidak perlu meneka tetapan "standard".

### Memori Asas (Titik Permulaan untuk Auto-Tune)

| RAM Sistem | Memori Asas | Kemudian Auto-Tuned |
|------------|-------------|---------------------|
| ≥ 16 GB | 512 MB | → Dikalibrasi ke ~1s |
| ≥ 8 GB | 256 MB | → Dikalibrasi ke ~1s |
| ≥ 4 GB | 128 MB | → Dikalibrasi ke ~1s |
| < 4 GB | 64 MB | → Dikalibrasi ke ~1s |

### Pengoptimuman Runtime

| Pengoptimuman | Teknik | Manfaat |
|---------------|--------|---------|
| **Had Heap V8** | `--max-old-space-size=256MB` | Mencegah kembung memori |
| **Pendikit Latar Belakang** | `--disable-renderer-backgrounding` | Mengekalkan sambungan |
| **Penimbal Terminal** | Scrollback: 3,000 baris | 70% kurang memori daripada lalai |
| **Pemuatan Malas** | Pemuatan komponen atas permintaan | Permulaan lebih pantas |
| **Petunjuk GC** | Pencetus GC manual | Jejak memori dikurangkan |

### Tindanan Teknologi

| Komponen | Teknologi | Tujuan |
|----------|-----------|--------|
| **Rangka Kerja** | Electron 39 + React 19 | Aplikasi desktop merentas platform |
| **Terminal** | xterm.js 6 | Emulasi terminal berprestasi tinggi |
| **SSH/SFTP** | ssh2 + node-pty | Pelaksanaan protokol SSH asli |
| **Editor Kod** | CodeMirror 6 | Penyorotan sintaks ringan |
| **Penyulitan** | Argon2 + Node.js Crypto | Penyulitan sisi klien yang kuat |
| **Penggayaan** | Tailwind CSS 4 | CSS moden dan minimal |
| **Binaan** | Webpack 5 + TypeScript 5 | Bundle pengeluaran yang dioptimumkan |

---

## 📥 Muat Turun

<table>
<tr>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/windows-10.png" width="64"><br>
<b>Windows</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-Setup.exe">Muat Turun .exe</a>
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

## ✨ Ciri-ciri

### 🔌 Sambungan Pelbagai Protokol

| Protokol | Penerangan |
|----------|------------|
| **SSH** | Secure Shell dengan pengesahan kata laluan dan kunci persendirian |
| **SFTP** | Pengurus fail panel berkembar dengan seret dan lepas |
| **FTP/FTPS** | Sokongan FTP standard dan selamat |
| **RDP** | Desktop jauh (xfreerdp3 di Linux, mstsc di Windows) |

### 💻 Terminal

- **400+ tema warna** - Dari Dracula ke Solarized, Catppuccin, Nord dan banyak lagi
- **Fon boleh disesuaikan** - Sebarang fon sistem, sebarang saiz
- **xterm.js 6 penuh** - Emulasi terminal lengkap dengan sokongan Unicode
- **Kekalkan sesi** - Tab kekal selepas menyambung semula
- **Pengesanan OS** - Mengesan pengedaran Linux secara automatik & memaparkan maklumat sistem

### 📁 Pengurus Fail SFTP

- **Antara muka panel berkembar** - Setempat ↔ Jauh bersebelahan
- **Editor bersepadu** - CodeMirror 6 dengan penyorotan sintaks untuk 15+ bahasa
- **Seret dan lepas** - Muat naik/Muat turun fail dengan mudah
- **Pengurusan kebenaran** - chmod dengan antara muka visual
- **Operasi kelompok** - Pilih berbilang fail untuk pemindahan

### 🛠️ Alat Terbina Dalam

#### Pemindahan Fail LAN
*Kongsi fail dengan serta-merta antara peranti di rangkaian tempatan.*

#### Perkongsian Pelayan LAN
*Kongsi konfigurasi pelayan dengan selamat dengan peranti berdekatan.*

#### Alat DNS & Rangkaian
- Carian DNS
- Pertanyaan WHOIS
- Pengimbas port
- Traceroute

#### Pengurus DNS Cloudflare
*Alat terbina dalam pilihan untuk mengurus DNS Cloudflare terus dari ruang kerja SSH anda.*

#### Pengurus Kunci SSH
- Jana pasangan kunci SSH (Ed25519, RSA, ECDSA)
- Import/Eksport kunci
- Urus known hosts

#### Pengurus Known Hosts
- Lihat dan urus known hosts
- Padam cap jari lama
- Eksport/Import known hosts

### 🎨 Pengalaman Pengguna

- **Tema gelap & cerah** - Ikut sistem atau tukar secara manual
- **14 bahasa** disokong
- **Tag pelayan** - Susun dengan tag berwarna
- **Sambungan pantas** - Cmd/Ctrl+K untuk mencari pelayan
- **Sejarah sambungan** - Akses pantas ke sambungan terkini

---

## 💾 Sandaran dan Pemulihan

### Bagaimana Penyulitan Berfungsi

Semua sandaran menggunakan **Argon2id** (pemenang Password Hashing Competition) dan **AES-256-GCM** (penyulitan yang disahkan):

```
Kata laluan → Argon2id(memori 64-512MB) → Kunci 256-bit → AES-256-GCM → Sandaran Disulitkan
```

### Data yang Disandarkan

| Data | Termasuk | Disulitkan |
|------|----------|------------|
| Senarai pelayan (hos, port, kelayakan) | ✅ | ✅ |
| Kunci persendirian SSH | ✅ | ✅ |
| Token API Cloudflare | ✅ | ✅ |
| Tetapan & keutamaan aplikasi | ✅ | ✅ |
| Known hosts | ✅ | ✅ |

### Jaminan Keselamatan

🔐 **Kata laluan tidak pernah disimpan** — tidak dalam fail, tidak di GitHub, di mana-mana sahaja  
🔒 **Penyulitan sisi klien** — Semua penyulitan berlaku secara lokal sebelum data meninggalkan peranti  
🛡️ **Tahan bruteforce** — Argon2id memerlukan RAM 64-512MB setiap percubaan (auto-laras)  
✅ **Pengesanan gangguan** — AES-GCM (AEAD) mengesan sebarang perubahan pada data yang disulitkan  
🔄 **Serasi merentas mesin** — sandaran menyimpan parameter KDF untuk kemudahalihan

---

### Sandaran Setempat Disulitkan

Eksport semua data anda sebagai fail `.marix` yang disulitkan:

1. **Pergi ke Tetapan** → **Sandaran dan Pemulihan**
2. **Cipta kata laluan** (memenuhi keperluan):
   - Minimum 10 aksara
   - 1 huruf besar, 1 huruf kecil, 1 digit, 1 aksara khas
3. **Eksport** - fail disulitkan sebelum disimpan
4. **Simpan dengan selamat** - simpan fail sandaran, ingat kata laluan

---

### Sandaran Google Drive (Zero-Knowledge)

Segerakkan sandaran yang disulitkan ke Google Drive dengan selamat:

#### Persediaan

📘 **Panduan Persediaan**: Lihat [docs/google/GOOGLE_DRIVE_SETUP.ms.md](../docs/google/GOOGLE_DRIVE_SETUP.ms.md)

ℹ️ **Versi pra-binaan**: Jika anda menggunakan keluaran pra-binaan (AppImage, RPM, dll.), kelayakan Google sudah disertakan. Anda boleh langkau langkah 1 dan sambung terus.

1. **Sediakan kelayakan OAuth**:
   - Cipta projek Google Cloud
   - Aktifkan API Google Drive
   - Cipta ID klien OAuth 2.0
   - Muat turun fail JSON kelayakan
   - Simpan sebagai `src/main/services/google-credentials.json`

2. **Sambung dalam Marix**:
   - Pergi ke Tetapan → Sandaran dan Pemulihan → Google Drive
   - Klik "Sambung ke Google Drive"
   - Pelayar dibuka untuk Google OAuth
   - Berikan kebenaran
   - Aplikasi menerima token selamat

3. **Cipta sandaran**:
   - Masukkan kata laluan penyulitan (10+ aksara)
   - Klik "Cipta sandaran"
   - Fail dimuat naik ke folder "Marix Backups" di Drive

4. **Pulihkan sandaran**:
   - Klik "Pulihkan dari Google Drive"
   - Masukkan kata laluan sandaran
   - Semua pelayan dan tetapan dipulihkan

#### Bagaimana Ia Berfungsi

✅ **Penyulitan hujung-ke-hujung** - data disulitkan sebelum meninggalkan peranti anda  
✅ **Zero-Knowledge** - Google hanya melihat blob yang disulitkan  
✅ **Hanya anda yang mempunyai kunci** - token OAuth disimpan secara setempat  
✅ **Folder peribadi** - fail hanya boleh diakses dari aplikasi anda

---

### Sandaran GitHub (Zero-Knowledge)

Segerakkan sandaran yang disulitkan ke repo GitHub peribadi dengan selamat:

#### Persediaan

1. **Log masuk dengan GitHub**:
   - Pergi ke Tetapan → Sandaran dan Pemulihan → Sandaran GitHub
   - Klik "Log masuk dengan GitHub"
   - Kod peranti muncul dalam aplikasi
   - Pelayar dibuka secara automatik - masukkan kod untuk mengesahkan
   - Siap! Repo peribadi `marix-backup` dicipta secara automatik

2. **Sandarkan**:
   - Klik "Sandarkan ke GitHub"
   - Masukkan kata laluan sandaran
   - Data yang disulitkan ditolak ke repo

3. **Pulihkan pada peranti lain**:
   - Pasang Marix
   - Log masuk dengan GitHub (langkah yang sama)
   - Klik "Pulihkan dari GitHub"
   - Masukkan kata laluan sandaran untuk menyahsulit

#### Mengapa GitHub Selamat

| Lapisan | Perlindungan |
|---------|-------------|
| **Penyulitan sisi klien** | Data disulitkan sebelum meninggalkan peranti |
| **Argon2id KDF** | Memori 64-512MB (auto), 4 lelaran, 1-4 lorong selari |
| **AES-256-GCM** | Penyulitan yang disahkan dengan IV rawak |
| **Storan GitHub** | Hanya menyimpan teks sifer yang disulitkan |
| **Tiada pelayan Marix** | Klien ↔ GitHub secara langsung |

⚠️ **Penting**: Jika anda kehilangan kata laluan sandaran, sandaran anda **tidak boleh dipulihkan secara kekal**. Kami tidak boleh menyahsulitnya. Tiada siapa yang boleh.

---

## 🛡️ Spesifikasi Keselamatan

### Butiran Penyulitan

| Algoritma | Parameter |
|-----------|-----------|
| **Terbitan kunci** | Argon2id (Memori: 64-512MB auto, Lelaran: 4, Keselarian: 1-4) |
| **Penyulitan simetri** | AES-256-GCM |
| **Garam** | 32 bait (rawak kriptografi) |
| **IV/Nonce** | 16 bait (unik setiap penyulitan) |
| **Tag pengesahan** | 16 bait (tag pengesahan GCM) |

### Algoritma Kunci SSH

| Algoritma | Saiz Kunci | Penggunaan |
|-----------|------------|------------|
| **Ed25519** | 256-bit | Disyorkan (pantas, selamat) |
| **RSA** | 2048-4096-bit | Keserasian warisan |
| **ECDSA** | 256-521-bit | Alternatif kepada Ed25519 |

### Keperluan Kata Laluan

Kata laluan sandaran mesti mempunyai:

✅ Minimum 10 aksara  
✅ Sekurang-kurangnya 1 huruf besar (A-Z)  
✅ Sekurang-kurangnya 1 huruf kecil (a-z)  
✅ Sekurang-kurangnya 1 digit (0-9)  
✅ Sekurang-kurangnya 1 aksara khas (!@#$%^&*...)

---

## 🔧 Bina dari Sumber

```bash
# Klon repo
git clone https://github.com/user/marix.git
cd marix

# Pasang kebergantungan
npm install

# Pembangunan
npm run dev

# Bina
npm run build

# Pakej untuk pengedaran
npm run package:win    # Windows (.exe)
npm run package:mac    # macOS (.zip)
npm run package:linux  # Linux (.AppImage, .deb, .rpm)
```

### Keperluan Sistem

|  | Minimum | Disyorkan |
|--|---------|-----------|
| **OS** | Windows 10, macOS 10.13, Ubuntu 18.04 | Versi terkini |
| **RAM** | 2 GB | 4 GB+ |
| **Storan** | 200 MB | 500 MB |

### Kebergantungan RDP untuk Linux

```bash
# Pasang xfreerdp3 untuk sokongan RDP
sudo apt install freerdp3-x11  # Debian/Ubuntu
sudo dnf install freerdp       # Fedora
sudo pacman -S freerdp         # Arch
```

---

## �� Lesen

Projek ini dilesenkan di bawah **GNU General Public License v3.0** (GPL-3.0).

Ini bermakna:

✅ Anda boleh menggunakan, mengubah suai dan mengedarkan perisian ini  
✅ Anda boleh menggunakannya untuk tujuan komersial  
⚠️ Semua pengubahsuaian mesti juga dikeluarkan di bawah GPL-3.0  
⚠️ Anda mesti menyediakan kod sumber semasa pengedaran  
⚠️ Anda mesti menyatakan perubahan yang dibuat pada kod

Lihat [LICENSE](../LICENSE) untuk teks lesen penuh.

---

<p align="center">
  <strong>Marix</strong><br>
  Klien SSH Zero-Knowledge Moden<br><br>
  <em>Data anda. Tanggungjawab anda. Kebebasan anda.</em><br><br>
  Jika anda mahukan kemudahan dengan mengorbankan privasi anda, Marix bukan untuk anda.
</p>
