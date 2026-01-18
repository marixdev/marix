<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>Modernong Zero-Knowledge SSH Client</strong>
</p>

<p align="center">
  <em>Ang iyong mga kredensyal ay hindi kailanman umaalis sa iyong device. Walang cloud. Walang tracking. Walang kompromiso.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
  <img src="https://img.shields.io/badge/version-1.0.4-orange" alt="Version">
</p>

<p align="center">
  <a href="https://marix.dev">🌐 Website</a> •
  <a href="#-i-download">I-download</a> •
  <a href="#-mga-feature">Mga Feature</a> •
  <a href="#-seguridad">Seguridad</a> •
  <a href="#-mga-wika">Mga Wika</a>
</p>

---

## 🌍 Ibang Mga Wika

| | | | |
|---|---|---|---|
| ��🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) |
| 🇪🇸 [Español](README.es.md) | 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) |
| 🇵🇭 [Filipino](README.fil.md) | 🇧🇷 [Português](README.pt.md) | | |

---

## 🎯 Para Kanino ang Marix?

- **Mga developer at DevOps engineer** - Namamahala ng maraming server
- **Mga system administrator** - Na inuuna ang seguridad at kahusayan
- **Mga user na may malasakit sa seguridad** - Na hindi nagtitiwala sa mga cloud solution
- **Sinuman** - Na gustong may buong kontrol sa kanilang SSH credentials

---

## ⚠️ Disclaimer

> **Ikaw ang responsable sa iyong data.**
>
> Ang Marix ay nag-iimbak ng lahat ng data nang lokal na may malakas na encryption. Gayunpaman:
> - Kung mawala mo ang iyong backup password, **ang iyong data ay hindi na maibabalik**
> - **Walang server** - walang "nakalimutan ko ang password" na opsyon
> - **Mag-backup nang regular** - maaaring masira ang hardware
> - **Ang seguridad ay sa iyo** - nagbibigay kami ng mga tool, ikaw ang magdedesisyon
>
> Sa paggamit ng Marix, tinatanggap mo ang buong responsibilidad para sa seguridad ng iyong data.

---

## 🔒 Zero-Knowledge Architecture

> **"Ang iyong mga susi. Ang iyong mga server. Ang iyong privacy."**

### Mga Pangunahing Prinsipyo

| | Prinsipyo | Paglalarawan |
|---|-----------|--------------|
| 🔐 | **100% Offline** | Lahat ng credentials ay lokal na naka-imbak sa iyong device—hindi kailanman ini-upload |
| ☁️ | **Walang Cloud** | Walang mga server. Ang iyong data ay hindi kailanman humahawak sa Internet |
| 📊 | **Walang Telemetry** | Walang tracking, walang analytics, walang data collection |
| 🔓 | **Open Source** | Buong auditable code sa ilalim ng GPL-3.0, walang nakatagong backdoors |

### Mga Teknolohiya ng Encryption

| | Feature | Teknolohiya | Paglalarawan |
|---|---------|-------------|--------------|
| 🛡️ | **Lokal na Storage** | Argon2id + AES-256 | Ini-encrypt ang credentials sa device |
| 📦 | **File Backup** | Argon2id + AES-256-GCM | Nag-e-export ng `.marix` files na may authenticated encryption |
| 🔄 | **GitHub Sync** | Argon2id + AES-256-GCM | Zero-knowledge cloud backup—ang GitHub ay nag-iimbak lang ng encrypted blobs |

---

## ⚡ Performance at Optimization

Ang Marix ay optimized para tumakbo nang maayos kahit sa mga low-end na makina:

### Adaptive Memory Management

| System RAM | Argon2id Memory | Security Level |
|------------|-----------------|----------------|
| ≥ 8 GB | 64 MB | Mataas |
| ≥ 4 GB | 32 MB | Katamtaman |
| < 4 GB | 16 MB | Low-memory optimized |

Ang app ay awtomatikong nakaka-detect ng system RAM at nag-aadjust ng mga encryption parameter para sa optimal na performance habang pinapanatili ang seguridad.

### Runtime Optimizations

| Optimization | Technique | Benepisyo |
|--------------|-----------|-----------|
| **V8 Heap Limit** | `--max-old-space-size=256MB` | Pinipigilan ang memory bloat |
| **Background Throttling** | `--disable-renderer-backgrounding` | Pinapanatili ang mga koneksyon |
| **Terminal Buffer** | Scrollback: 3,000 lines | 70% mas mababa sa memory kaysa default |
| **Lazy Loading** | On-demand component loading | Mas mabilis na startup |
| **GC Hints** | Manual GC trigger | Nabawasang memory footprint |

### Tech Stack

| Component | Teknolohiya | Layunin |
|-----------|-------------|---------|
| **Framework** | Electron 39 + React 19 | Cross-platform desktop app |
| **Terminal** | xterm.js 6 | High-performance terminal emulation |
| **SSH/SFTP** | ssh2 + node-pty | Native SSH protocol implementation |
| **Code Editor** | CodeMirror 6 | Magaan na syntax highlighting |
| **Encryption** | Argon2 + Node.js Crypto | Malakas na client-side encryption |
| **Styling** | Tailwind CSS 4 | Modern, minimal CSS |
| **Build** | Webpack 5 + TypeScript 5 | Optimized production bundle |

---

## 📥 I-download

<table>
<tr>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/windows-10.png" width="64"><br>
<b>Windows</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-Setup.exe">I-download .exe</a>
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

## ✨ Mga Feature

### 🔌 Multi-Protocol Connections

| Protocol | Paglalarawan |
|----------|--------------|
| **SSH** | Secure Shell na may password at private key authentication |
| **SFTP** | Dual-pane file manager na may drag-and-drop |
| **FTP/FTPS** | Standard at secure FTP support |
| **RDP** | Remote desktop (xfreerdp3 sa Linux, mstsc sa Windows) |

### 💻 Terminal

- **400+ color themes** - Mula Dracula hanggang Solarized, Catppuccin, Nord at iba pa
- **Customizable fonts** - Anumang system font, anumang laki
- **Buong xterm.js 6** - Kumpletong terminal emulation na may Unicode support
- **Session persistence** - Ang mga tab ay nananatili pagkatapos mag-reconnect
- **OS detection** - Awtomatikong nakaka-detect ng Linux distro at nagpapakita ng system info

### 📁 SFTP File Manager

- **Dual-pane interface** - Local ↔ Remote magkatabi
- **Integrated editor** - CodeMirror 6 na may syntax highlighting para sa 15+ na wika
- **Drag-and-drop** - Madaling mag-upload/download ng files
- **Permission management** - chmod na may visual interface
- **Batch operations** - Pumili ng maraming files para sa transfer

### 🛠️ Built-in na Mga Tool

#### LAN File Transfer
*Agad na pagbabahagi ng files sa pagitan ng mga device sa local network.*

#### LAN Server Sharing
*Ligtas na pagbabahagi ng server configurations sa mga kalapit na device.*

#### DNS & Network Tools
- DNS lookup
- WHOIS queries
- Port scanner
- Traceroute

#### Cloudflare DNS Manager
*Opsyonal na built-in tool para pamahalaan ang Cloudflare DNS direkta mula sa iyong SSH workspace.*

#### SSH Key Manager
- Mag-generate ng SSH key pairs (Ed25519, RSA, ECDSA)
- Import/Export keys
- Pamahalaan ang known hosts

#### Known Hosts Manager
- Tingnan at pamahalaan ang known hosts
- Burahin ang mga lumang fingerprints
- Export/Import known hosts

### 🎨 User Experience

- **Dark at light themes** - Sundin ang system o manu-manong palitan
- **14 na wika** ang suportado
- **Server tags** - Ayusin gamit ang mga colored tags
- **Quick connect** - Cmd/Ctrl+K para maghanap ng servers
- **Connection history** - Mabilis na access sa mga kamakailang koneksyon

---

## 💾 Backup at Restore

### Paano Gumagana ang Encryption

Lahat ng backups ay gumagamit ng **Argon2id** (nanalo sa Password Hashing Competition) at **AES-256-GCM** (authenticated encryption):

```
Password → Argon2id(16-64MB memory) → 256-bit key → AES-256-GCM → Encrypted Backup
```

### Data na Naba-backup

| Data | Kasama | Encrypted |
|------|--------|-----------|
| Server list (host, port, credentials) | ✅ | ✅ |
| SSH private keys | ✅ | ✅ |
| Cloudflare API tokens | ✅ | ✅ |
| App settings at preferences | ✅ | ✅ |
| Known hosts | ✅ | ✅ |

### Mga Garantiya sa Seguridad

🔐 **Hindi kailanman nai-store ang password** — hindi sa file, hindi sa GitHub, kahit saan  
🔒 **Zero-Knowledge** — kahit ang mga developer ng Marix ay hindi makakapag-decrypt ng iyong backups  
🛡️ **Bruteforce-resistant** — ang Argon2id ay nangangailangan ng 16-64MB RAM bawat attempt  
✅ **Tamper-proof** — ang AES-GCM ay nakaka-detect ng anumang pagbabago sa encrypted data  
🔄 **Cross-machine compatible** — ang mga backup ay nag-iimbak ng memory cost para sa portability

---

### Local Encrypted Backup

I-export ang lahat ng iyong data bilang encrypted `.marix` file:

1. **Pumunta sa Settings** → **Backup at Restore**
2. **Gumawa ng password** (tumutugon sa mga kinakailangan):
   - Minimum 10 characters
   - 1 uppercase, 1 lowercase, 1 digit, 1 special character
3. **I-export** - ang file ay ini-encrypt bago i-save
4. **Itago nang ligtas** - panatilihin ang backup file, alalahanin ang password

---

### Google Drive Backup (Zero-Knowledge)

Ligtas na i-sync ang mga encrypted backup sa Google Drive:

#### Setup

📘 **Setup Guide**: Tingnan ang [docs/google/GOOGLE_DRIVE_SETUP.fil.md](../docs/google/GOOGLE_DRIVE_SETUP.fil.md)

ℹ️ **Pre-built versions**: Kung gumagamit ka ng pre-built releases (AppImage, RPM, atbp.), kasama na ang Google credentials. Maaari mong laktawan ang step 1 at direktang kumonekta.

1. **I-setup ang OAuth credentials**:
   - Gumawa ng Google Cloud project
   - I-enable ang Google Drive API
   - Gumawa ng OAuth 2.0 Client ID
   - I-download ang credentials JSON file
   - I-save bilang `src/main/services/google-credentials.json`

2. **Kumonekta sa Marix**:
   - Pumunta sa Settings → Backup at Restore → Google Drive
   - I-click ang "Kumonekta sa Google Drive"
   - Magbubukas ang browser para sa Google OAuth
   - Ibigay ang permissions
   - Makakatanggap ang app ng secure token

3. **Gumawa ng backup**:
   - Ilagay ang encryption password (10+ characters)
   - I-click ang "Gumawa ng backup"
   - Ang file ay maa-upload sa "Marix Backups" folder sa Drive

4. **I-restore ang backup**:
   - I-click ang "I-restore mula sa Google Drive"
   - Ilagay ang backup password
   - Lahat ng servers at settings ay maibabalik

#### Paano Ito Gumagana

✅ **End-to-end encryption** - ang data ay ini-encrypt bago umalis sa iyong device  
✅ **Zero-Knowledge** - ang Google ay nakakakita lang ng encrypted blobs  
✅ **Ikaw lang ang may susi** - ang OAuth token ay lokal na naka-store  
✅ **Private folder** - ang mga file ay accessible lang mula sa iyong app

---

### GitHub Backup (Zero-Knowledge)

Ligtas na i-sync ang mga encrypted backup sa private GitHub repo:

#### Setup

1. **Mag-login gamit ang GitHub**:
   - Pumunta sa Settings → Backup at Restore → GitHub Backup
   - I-click ang "Mag-login gamit ang GitHub"
   - May lalabas na device code sa app
   - Awtomatikong magbubukas ang browser - ilagay ang code para mag-authenticate
   - Tapos na! Awtomatikong nagagawa ang private repo `marix-backup`

2. **Mag-backup**:
   - I-click ang "I-backup sa GitHub"
   - Ilagay ang backup password
   - Ang encrypted data ay ipinupush sa repo

3. **I-restore sa ibang device**:
   - I-install ang Marix
   - Mag-login gamit ang GitHub (parehong mga hakbang)
   - I-click ang "I-restore mula sa GitHub"
   - Ilagay ang backup password para i-decrypt

#### Bakit Ligtas ang GitHub

| Layer | Proteksyon |
|-------|------------|
| **Client-side encryption** | Ang data ay ini-encrypt bago umalis sa device |
| **Argon2id KDF** | 16-64MB memory, 3 iterations, 4 parallel lanes |
| **AES-256-GCM** | Authenticated encryption na may random IV |
| **GitHub storage** | Nag-iimbak lang ng encrypted ciphertext |
| **Walang Marix server** | Client ↔ GitHub direkta |

⚠️ **Importante**: Kung mawala mo ang iyong backup password, ang iyong mga backup ay **permanenteng hindi na maibabalik**. Hindi namin ito ma-decrypt. Walang makakagawa nito.

---

## 🛡️ Security Specifications

### Mga Detalye ng Encryption

| Algorithm | Parameters |
|-----------|------------|
| **Key derivation** | Argon2id (Memory: 16-64MB, Iterations: 3, Parallelism: 4) |
| **Symmetric encryption** | AES-256-GCM |
| **Salt** | 32 bytes (cryptographically random) |
| **IV/Nonce** | 16 bytes (unique per encryption) |
| **Authentication tag** | 16 bytes (GCM auth tag) |

### SSH Key Algorithms

| Algorithm | Key Size | Paggamit |
|-----------|----------|----------|
| **Ed25519** | 256-bit | Recommended (mabilis, ligtas) |
| **RSA** | 2048-4096-bit | Legacy compatibility |
| **ECDSA** | 256-521-bit | Alternatibo sa Ed25519 |

### Mga Kinakailangan sa Password

Ang mga backup password ay dapat may:

✅ Minimum 10 characters  
✅ Hindi bababa sa 1 uppercase (A-Z)  
✅ Hindi bababa sa 1 lowercase (a-z)  
✅ Hindi bababa sa 1 digit (0-9)  
✅ Hindi bababa sa 1 special character (!@#$%^&*...)

---

## 🔧 Mag-build mula sa Source

```bash
# I-clone ang repo
git clone https://github.com/user/marix.git
cd marix

# I-install ang dependencies
npm install

# Development
npm run dev

# Build
npm run build

# I-package para sa distribution
npm run package:win    # Windows (.exe)
npm run package:mac    # macOS (.zip)
npm run package:linux  # Linux (.AppImage, .deb, .rpm)
```

### Mga Kinakailangan ng System

|  | Minimum | Recommended |
|--|---------|-------------|
| **OS** | Windows 10, macOS 10.13, Ubuntu 18.04 | Pinakabagong version |
| **RAM** | 2 GB | 4 GB+ |
| **Storage** | 200 MB | 500 MB |

### RDP Dependencies para sa Linux

```bash
# I-install ang xfreerdp3 para sa RDP support
sudo apt install freerdp3-x11  # Debian/Ubuntu
sudo dnf install freerdp       # Fedora
sudo pacman -S freerdp         # Arch
```

---

## 📄 Lisensya

Ang proyektong ito ay lisensyado sa ilalim ng **GNU General Public License v3.0** (GPL-3.0).

Ibig sabihin nito:

✅ Maaari mong gamitin, baguhin at ipamahagi ang software na ito  
✅ Maaari mo itong gamitin para sa mga komersyal na layunin  
⚠️ Lahat ng pagbabago ay dapat ding i-release sa ilalim ng GPL-3.0  
⚠️ Dapat mong gawin available ang source code kapag namamahagi  
⚠️ Dapat mong sabihin ang mga pagbabagong ginawa sa code

Tingnan ang [LICENSE](../LICENSE) para sa buong teksto ng lisensya.

---

<p align="center">
  <strong>Marix</strong><br>
  Modernong Zero-Knowledge SSH Client<br><br>
  <em>Ang iyong data. Ang iyong responsibilidad. Ang iyong kalayaan.</em><br><br>
  Kung gusto mo ng kaginhawahan sa halaga ng iyong privacy, ang Marix ay hindi para sa iyo.
</p>
