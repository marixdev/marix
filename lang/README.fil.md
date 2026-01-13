<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>Modernong Zero-Knowledge SSH Client</strong>
</p>

<p align="center">
  <em>Hindi kailanman aalis ang iyong mga kredensyal sa iyong device. Walang cloud. Walang tracking. Walang kompromiso.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
</p>

---

## 🌍 Ibang Wika

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) |
| 🇪🇸 [Español](README.es.md) | 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) |
| 🇧🇷 [Português](README.pt.md) | | | |

---

## ⚠️ Disclaimer

> **You are responsible for your own data.**
>
> Marix stores all data locally with strong encryption. However:
> - If you lose your backup password, **data is unrecoverable**
> - **No servers** — no "forgot password" option
> - **Backup regularly** — hardware can fail
> - You own your security — we provide tools, you decide

---

## 🔒 Zero-Knowledge Architecture

### Mga Pangunahing Prinsipyo

| | Prinsipyo | Paglalarawan |
|---|-----------|--------------|
| 🔐 | **100% Offline** | Lahat ng kredensyal ay naka-imbak nang lokal—hindi kailanman ina-upload |
| ☁️ | **Walang Cloud** | Wala kaming mga server. Hindi kailanman nakakarating sa Internet ang iyong data |
| 📊 | **Walang Telemetry** | Walang tracking, walang analytics, walang data collection |
| 🔓 | **Open Source** | Ganap na ma-audit na code sa ilalim ng GPL-3.0 |

### Encryption Technology

| | Feature | Technology | Paglalarawan |
|---|---------|------------|--------------|
| 🛡️ | **Local Storage** | Argon2id + AES-256 | Naka-encrypt ang mga kredensyal sa device |
| 📦 | **File Backup** | Argon2id + AES-256-GCM | I-export ang encrypted `.marix` files |
| 🔄 | **GitHub Sync** | Argon2id + AES-256-GCM | Zero-knowledge cloud backup |

---

## ⚡ Performance at Optimization

### Adaptive Memory Management

| System RAM | Argon2id Memory | Security Level |
|------------|-----------------|----------------|
| ≥ 8 GB | 64 MB | Mataas |
| ≥ 4 GB | 32 MB | Katamtaman |
| < 4 GB | 16 MB | Na-optimize para sa mababang memory |

### Runtime Optimizations

| Optimization | Technology | Benepisyo |
|--------------|------------|-----------|
| **V8 Heap Limit** | `--max-old-space-size=256MB` | Pinipigilan ang memory bloat |
| **Background Throttling** | `--disable-renderer-backgrounding` | Pinapanatili ang mga koneksyon |
| **Terminal Buffer** | Scrollback: 3,000 linya | 70% memory reduction |
| **Lazy Loading** | On-demand component loading | Mas mabilis na startup |

### Tech Stack

| Component | Technology | Layunin |
|-----------|------------|---------|
| **Framework** | Electron 39 + React 19 | Cross-platform desktop app |
| **Terminal** | xterm.js 6 | High-performance terminal emulation |
| **SSH/SFTP** | ssh2 + node-pty | Native SSH protocol implementation |
| **Code Editor** | CodeMirror 6 | Magaang syntax highlighting |
| **Encryption** | Argon2 + Node.js Crypto | Strong client-side encryption |
| **Styling** | Tailwind CSS 4 | Modern at minimal na CSS |
| **Build** | Webpack 5 + TypeScript 5 | Optimized production bundles |

---

## 📥 I-download

| OS | I-download |
|----|-----------|
| **Windows** | [I-download .exe](https://github.com/user/marix/releases/latest/download/Marix-Setup.exe) |
| **macOS** | [Intel .dmg](https://github.com/user/marix/releases/latest/download/Marix.dmg) • [Apple Silicon](https://github.com/user/marix/releases/latest/download/Marix-arm64.dmg) |
| **Linux** | [.AppImage](https://github.com/user/marix/releases/latest/download/Marix.AppImage) • [.deb](https://github.com/user/marix/releases/latest/download/marix.deb) • [.rpm](https://github.com/user/marix/releases/latest/download/marix.rpm) |

---

## ✨ Mga Feature

### 🔌 Multi-Protocol Connections

| Protocol | Technology | Paglalarawan |
|----------|------------|--------------|
| **SSH** | ssh2 + node-pty | Secure Shell na may password at private key authentication |
| **SFTP** | ssh2 | Dual-pane file manager na may drag-and-drop |
| **FTP/FTPS** | basic-ftp | Standard at secure FTP support |
| **RDP** | xfreerdp3 / mstsc | Remote Desktop (xfreerdp3 sa Linux, mstsc sa Windows) |

### 💻 Terminal

- **400+ color themes** — Dracula, Solarized, Catppuccin, Nord...
- **Custom fonts** — Anumang system font
- **Full xterm.js 6** — Kumpletong terminal emulation na may Unicode support
- **Session preservation** — Nananatili ang mga tab kapag nag-reconnect
- **OS detection** — Auto-detect ng Linux distro

### 📁 SFTP File Manager

- **Dual-pane interface** — Local ↔ Remote na magkatabi
- **Integrated editor** — CodeMirror 6 na may syntax highlighting para sa 15+ na wika
- **Drag & drop** — Madaling pag-upload/download ng mga file
- **Permission management** — Visual chmod interface

### 🛠️ Mga Built-in Tool

- **DNS at Network**: A, AAAA, MX, TXT, SPF, CNAME, NS, SOA, PTR, Ping, Traceroute, TCP port, HTTP/HTTPS, SMTP, Blacklist, WHOIS, ARIN
- **Cloudflare DNS Manager**: Pamahalaan ang mga domain, DNS records, Cloudflare proxy
- **SSH Key Manager**: Gumawa ng RSA-4096, Ed25519, ECDSA-521, mag-import/export ng mga key
- **Known Hosts Manager**: Tingnan ang mga fingerprint, mag-import mula sa host, magtanggal ng mga hindi pinagkakatiwalaang host

---

## 💾 Backup at Restore

### Paano Gumagana ang Encryption

Lahat ng backup ay gumagamit ng **Argon2id** at **AES-256-GCM**:

<p align="center">
  <img src="flow.png" alt="Encryption Flow" width="800">
</p>

### Ano ang Naba-backup

| Data | Kasama | Naka-encrypt |
|------|--------|--------------|
| Listahan ng server | ✅ | ✅ AES-256-GCM |
| SSH private key | ✅ | ✅ AES-256-GCM |
| Cloudflare API token | ✅ | ✅ AES-256-GCM |
| App settings | ✅ | ✅ AES-256-GCM |
| Known hosts | ❌ | — |

### Security Guarantees

- 🔐 **Hindi kailanman iniimbak ang password** — Hindi sa file, hindi sa GitHub
- 🔒 **Zero-knowledge** — Kahit ang mga developer ay hindi maka-decrypt
- 🛡️ **Brute-force resistant** — Nangangailangan ang Argon2id ng 16-64 MB RAM bawat pagtatangka
- ✅ **Tamper-proof** — Nakaka-detect ang AES-GCM ng anumang pagbabago

### GitHub Backup (Zero-Knowledge)

1. **Mag-login gamit ang GitHub** → Lalabas ang device code → Magbubukas ang browser → I-authorize → Awtomatikong nalilikha ang `marix-backup` repository
2. **Backup**: I-click ang "Backup sa GitHub" → Ilagay ang password → Napu-push ang encrypted data
3. **Restore**: Mag-login sa GitHub → "Restore mula sa GitHub" → Ilagay ang password para i-decrypt

> ⚠️ **Mahalaga**: Kung mawala ang iyong backup password, ang iyong backup ay **permanenteng hindi na mababawi**. Walang sinuman ang maka-decrypt nito.

---

## 🛡️ Security Specifications

| Component | Algorithm | Parameters |
|-----------|-----------|------------|
| Key Derivation | Argon2id | 16-64 MB memory, 3 iterations, 4 lanes |
| Encryption | AES-256-GCM | 256-bit key, authenticated |
| Salt | CSPRNG | 32 bytes bawat backup |
| IV/Nonce | CSPRNG | 16 bytes bawat operation |

### Password Requirements

- ✅ Minimum 10 characters
- ✅ Hindi bababa sa 1 uppercase letter (A-Z)
- ✅ Hindi bababa sa 1 lowercase letter (a-z)
- ✅ Hindi bababa sa 1 number (0-9)
- ✅ Hindi bababa sa 1 special character (!@#$%^&*...)

---

## 🔧 I-build mula sa Source

```bash
git clone https://github.com/marixdev/marix.git
cd marix
npm install
npm run dev      # Development
npm run build    # Build
npm run package:linux  # Package
```

### RDP Dependencies para sa Linux

```bash
# Ubuntu/Debian
sudo apt install freerdp3-x11 xdotool

# Fedora
sudo dnf install freerdp xdotool

# Arch
sudo pacman -S freerdp xdotool
```

---

## 📄 Lisensya

**GNU General Public License v3.0** (GPL-3.0)

---

<p align="center">
  <strong>Marix</strong> — Modernong zero-knowledge SSH client<br>
  <em>Ang iyong data. Ang iyong responsibilidad. Ang iyong kalayaan.</em>
</p>
