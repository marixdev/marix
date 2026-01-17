<p align="center">
  <img src="icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>A Modern, Zero-Knowledge SSH Client</strong>
</p>

<p align="center">
  <em>Your credentials never leave your device. No cloud. No tracking. No compromise.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
  <img src="https://img.shields.io/badge/version-1.0.6-orange" alt="Version">
</p>

<p align="center">
  <a href="https://marix.dev">🌐 Website</a> •
  <a href="#-download">Download</a> •
  <a href="#-features">Features</a> •
  <a href="#-security">Security</a> •
  <a href="#-languages">Languages</a>
</p>

---

## 🌍 Other Languages

| | | | |
|---|---|---|---|
| 🇻🇳 [Tiếng Việt](lang/README.vi.md) | 🇮🇩 [Bahasa Indonesia](lang/README.id.md) | 🇨🇳 [中文](lang/README.zh.md) | 🇰🇷 [한국어](lang/README.ko.md) |
| 🇯🇵 [日本語](lang/README.ja.md) | 🇫🇷 [Français](lang/README.fr.md) | 🇩🇪 [Deutsch](lang/README.de.md) | 🇪🇸 [Español](lang/README.es.md) |
| 🇹🇭 [ภาษาไทย](lang/README.th.md) | 🇲🇾 [Bahasa Melayu](lang/README.ms.md) | 🇷🇺 [Русский](lang/README.ru.md) | 🇵🇭 [Filipino](lang/README.fil.md) |
| 🇧🇷 [Português](lang/README.pt.md) | | | |

---

## 🎯 Who is Marix for?

- **Developers & DevOps engineers** managing multiple servers
- **System administrators** who value security and efficiency
- **Security-conscious users** who don't trust cloud-based solutions
- **Anyone** who wants full control over their SSH credentials

---

## ⚠️ Disclaimer

> **YOU ARE RESPONSIBLE FOR YOUR OWN DATA.**
>
> Marix stores all data locally on your device with strong encryption. However:
> - **We cannot recover your data** if you lose your backup password
> - **We have no servers** - there is no "forgot password" option
> - **Backup regularly** - hardware can fail
> - **You own your security** - we provide the tools, you make the decisions
>
> By using Marix, you accept full responsibility for your data security.

---

## 🔒 Zero-Knowledge Architecture

> **"Your keys. Your servers. Your privacy."**

### Core Principles

| | Principle | Description |
|---|-----------|-------------|
| 🔐 | **100% Offline** | All credentials stored locally on your device—never uploaded |
| ☁️ | **No Cloud** | We don't have servers. Your data never touches the internet |
| 📊 | **No Telemetry** | Zero tracking, zero analytics, zero data collection |
| 🔓 | **Open Source** | Fully auditable code under GPL-3.0, no hidden backdoors |

### Encryption Technology

| | Feature | Technology | Description |
|---|---------|------------|-------------|
| 🛡️ | **Local Storage** | Argon2id + AES-256 | Credentials encrypted at rest on your device |
| 📦 | **File Backup** | Argon2id + AES-256-GCM | Export encrypted \`.marix\` files with authenticated encryption |
| 🔄 | **GitHub Sync** | Argon2id + AES-256-GCM | Zero-knowledge cloud backup—GitHub stores only encrypted blobs |

---

## ⚡ Performance & Optimization

Marix is optimized to run smoothly on low-end machines:

### Adaptive Memory Management

| System RAM | Argon2id Memory | Security Level |
|------------|-----------------|----------------|
| ≥ 8 GB | 64 MB | High |
| ≥ 4 GB | 32 MB | Medium |
| < 4 GB | 16 MB | Optimized for low-memory |

The app automatically detects your system RAM and adjusts encryption parameters for optimal performance while maintaining security.

### Runtime Optimizations

| Optimization | Technology | Benefit |
|--------------|------------|---------|
| **V8 Heap Limit** | \`--max-old-space-size=256MB\` | Prevents memory bloat |
| **Background Throttling** | \`--disable-renderer-backgrounding\` | Keeps connections alive |
| **Terminal Buffer** | Scrollback: 3,000 lines | 70% memory reduction vs default |
| **Lazy Loading** | On-demand component loading | Faster startup |
| **GC Hints** | Manual garbage collection triggers | Reduced memory footprint |

### Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | Electron 39 + React 19 | Cross-platform desktop app |
| **Terminal** | xterm.js 6 | High-performance terminal emulation |
| **SSH/SFTP** | ssh2 + node-pty | Native SSH protocol implementation |
| **Code Editor** | CodeMirror 6 | Lightweight syntax highlighting |
| **Encryption** | Argon2 + Node.js Crypto | Strong client-side encryption |
| **Styling** | Tailwind CSS 4 | Modern, minimal CSS |
| **Build** | Webpack 5 + TypeScript 5 | Optimized production bundles |

---

## 📥 Download

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

## ✨ Features

### 🔌 Multi-Protocol Connections

| Protocol | Technology | Description |
|----------|------------|-------------|
| **SSH** | ssh2 + node-pty | Secure Shell with password & private key authentication |
| **SFTP** | ssh2 | Dual-pane file manager with drag-and-drop |
| **FTP/FTPS** | basic-ftp | Standard and secure FTP support |
| **RDP** | xfreerdp3 / mstsc | Remote Desktop (xfreerdp3 on Linux, mstsc on Windows) |

### 💻 Terminal

- **400+ color themes** - From Dracula to Solarized, Catppuccin, Nord, and more
- **Customizable fonts** - Any system font, any size
- **Full xterm.js 6** - Complete terminal emulation with Unicode support
- **Session preservation** - Tabs persist across reconnects
- **OS detection** - Auto-detect Linux distro & display system info

### 📁 SFTP File Manager

- **Dual-pane interface** - Local ↔ Remote side by side
- **Integrated editor** - CodeMirror 6 with 15+ language syntax highlighting
- **Drag & drop** - Upload/download files easily
- **Permission management** - chmod with visual interface
- **Batch operations** - Multi-select files for transfer

### 🛠️ Built-in Tools

<details>
<summary><b>LAN File Transfer</b></summary>

*Share files instantly between devices on your local network.*

- **Sender**: Select files → Show 6-digit code → Wait for receiver
- **Receiver**: Enter sender's code → Auto-find sender via UDP → Select save folder → Receive files
- Real-time transfer progress with speed display
- TCP-based reliable transfer (64KB chunks)
- Send multiple files and folders
- Works on WiFi and Ethernet

</details>

<details>
<summary><b>LAN Server Sharing</b></summary>

*Share server configurations with nearby devices securely.*

- **Sender**: Select servers → Show 6-digit code → Select peer device → Send encrypted data
- **Receiver**: Receive notification → Enter sender's code to decrypt → Import servers
- AES-256-CBC encryption with scrypt key derivation
- Auto-discover devices on local network
- Option to include/exclude passwords and private keys

</details>

<details>
<summary><b>DNS & Network Tools</b></summary>

- A / AAAA / MX / TXT / SPF / CNAME / NS / SOA / PTR lookups
- Ping & Traceroute
- TCP port testing
- HTTP/HTTPS checker with SSL info
- SMTP server testing
- IP Blacklist checker (10 RBLs)
- WHOIS lookup
- ARIN/IP ownership lookup
- Listening ports scanner

</details>

<details>
<summary><b>Cloudflare DNS Manager</b></summary>

*Optional built-in tool for managing Cloudflare DNS directly from your SSH workspace.*

- Manage all your domains
- Create/Edit/Delete DNS records
- Support for A, AAAA, CNAME, MX, TXT, SRV, CAA records
- Toggle Cloudflare proxy (orange cloud)
- TTL management
- **API key included in encrypted backups**

</details>

<details>
<summary><b>SSH Key Manager</b></summary>

- Generate RSA-4096, Ed25519, ECDSA-521 keys
- Import existing keys from file
- Export public/private keys
- Secure local storage in ~/.marix/ssh_keys
- Key fingerprint display
- **Keys included in encrypted backups**

</details>

<details>
<summary><b>Known Hosts Manager</b></summary>

- View all SSH fingerprints
- Import from host
- Remove untrusted hosts
- Verify host authenticity

</details>

<details>
<summary><b>Custom Hotkeys</b></summary>

*Create keyboard shortcuts to quickly execute commands in SSH terminal.*

- **Quick command execution** - Press `Ctrl+Shift+[key]` (or `Cmd+Shift+[key]` on Mac) to instantly run commands
- **Custom shortcuts** - Assign any single character (A-Z, 0-9) to your frequently used commands
- **Examples**:
  - `Ctrl+Shift+L` → `ls -la` (list files)
  - `Ctrl+Shift+D` → `docker ps` (list containers)
  - `Ctrl+Shift+S` → `sudo systemctl status nginx` (check nginx status)
- **Auto-execute** - Commands are typed and executed automatically (with Enter)
- **Local storage** - Hotkeys stored locally, never uploaded
- **Manage easily** - Add, edit, or delete hotkeys from the Hotkeys menu

**How to use:**
1. Open **Hotkeys** menu from the sidebar
2. Click **Add Hotkey**
3. Enter a key (single character, e.g., `L`)
4. Enter the command (e.g., `ls -la`)
5. Optionally add a description
6. Click **Add**
7. In SSH terminal, press `Ctrl+Shift+L` to execute the command

</details>

### 🎨 User Experience

- **Dark & Light themes** - Follow system or toggle manually
- **14 languages** supported
- **Server tagging** - Organize with colored tags
- **Quick connect** - Cmd/Ctrl+K to search servers
- **Connection history** - Quick access to recent connections

---

## 💾 Backup & Restore

### How Encryption Works

All backups use **Argon2id** (winner of the Password Hashing Competition) and **AES-256-GCM** (authenticated encryption):

<p align="center">
  <img src="lang/flow.png" alt="Encryption Flow" width="800">
</p>

### What Gets Backed Up

| Data | Included | Encrypted |
|------|----------|-----------|
| Server list (hosts, ports, credentials) | ✅ | ✅ AES-256-GCM |
| SSH private keys | ✅ | ✅ AES-256-GCM |
| Cloudflare API token | ✅ | ✅ AES-256-GCM |
| App settings & preferences | ✅ | ✅ AES-256-GCM |
| Known hosts | ❌ | — |

### Security Guarantees

- 🔐 **Password never stored** — Not in the file, not on GitHub, not anywhere
- 🔒 **Zero-knowledge** — Even Marix developers cannot decrypt your backup
- 🛡️ **Brute-force resistant** — Argon2id requires 16-64MB RAM per attempt
- ✅ **Tamper-proof** — AES-GCM detects any modification to encrypted data
- 🔄 **Cross-machine compatible** — Backup stores memory cost for portability

---

### Local Encrypted Backup

Export all your data as an encrypted \`.marix\` file:

1. **Go to Settings** → **Backup & Restore**
2. **Create password** meeting requirements:
   - Minimum 10 characters
   - 1 uppercase, 1 lowercase, 1 number, 1 special character
3. **Export** - File is encrypted before saving
4. **Store safely** - Keep the backup file and remember your password

### Google Drive Backup (Zero-Knowledge)

Securely sync your encrypted backup to your Google Drive:

#### Setup

> 📘 **Setup Guide**: [Google Drive Setup Documentation](docs/google/GOOGLE_DRIVE_SETUP.en.md)

> ℹ️ **Pre-packaged Version**: If you're using the pre-built release (AppImage, RPM, etc.), Google credentials are already included. You can skip step 1 and connect directly.

1. **Configure OAuth Credentials**:
   - Create a Google Cloud Project
   - Enable Google Drive API
   - Create OAuth 2.0 Client ID
   - Download credentials JSON file
   - Save as `src/main/services/google-credentials.json`

2. **Connect in Marix**:
   - Go to Settings → Backup & Restore → Google Drive
   - Click "Connect to Google Drive"
   - Browser opens for Google OAuth
   - Grant permissions
   - App receives secure token

3. **Create Backup**:
   - Enter encryption password (10+ characters)
   - Click "Create Backup"
   - File uploaded to "Marix Backups" folder on Drive

4. **Restore Backup**:
   - Click "Restore from Google Drive"
   - Enter your backup password
   - All servers and settings restored

#### How It Works

```
[Your Data] → [Argon2id + AES-256] → [Encrypted Blob] → [Google Drive]
                   ↑
            Your Password
            (never uploaded)
```

- ✅ **End-to-end encrypted** - Data encrypted before leaving your device
- ✅ **Zero-knowledge** - Google only sees encrypted blobs
- ✅ **Your keys only** - OAuth tokens stored locally
- ✅ **Private backup folder** - Files only accessible by your app

### GitHub Backup (Zero-Knowledge)

Securely sync your encrypted backup to a private GitHub repository:

#### Setup

1. **Login with GitHub**:
   - Go to Settings → Backup & Restore → GitHub Backup
   - Click "Login with GitHub"
   - A device code will appear in the app
   - Browser opens automatically - enter the code and authorize
   - Done! A private repository \`marix-backup\` is automatically created

2. **Backup**:
   - Click "Backup to GitHub"
   - Enter your backup password
   - Encrypted data is pushed to your repository

3. **Restore on another device**:
   - Install Marix
   - Login with GitHub (same steps as above)
   - Click "Restore from GitHub"
   - Enter your backup password to decrypt

#### Why GitHub is Safe

| Layer | Protection |
|-------|------------|
| **Client-side encryption** | Data encrypted before leaving device |
| **Argon2id KDF** | 16-64MB memory, 3 iterations, 4 parallel lanes |
| **AES-256-GCM** | Authenticated encryption with random IV |
| **GitHub storage** | Only encrypted ciphertext stored |
| **No Marix server** | Direct client ↔ GitHub communication |

> ⚠️ **Important**: If you lose your backup password, your backup is **permanently unrecoverable**. We cannot decrypt it. No one can.

---

## 🛡️ Security Specifications

### Encryption Details

| Component | Algorithm | Parameters |
|-----------|-----------|------------|
| Key Derivation | Argon2id | 16-64MB memory (auto), 3 iterations, 4 lanes |
| Encryption | AES-256-GCM | 256-bit key, authenticated |
| Salt | CSPRNG | 32 bytes per backup |
| IV/Nonce | CSPRNG | 16 bytes per operation |
| Auth Tag | GCM | 16 bytes |

### SSH Key Algorithms

| Algorithm | Key Size | Use Case |
|-----------|----------|----------|
| Ed25519 | 256-bit | Recommended (fast, secure) |
| RSA | 4096-bit | Legacy compatibility |
| ECDSA | 521-bit | Alternative to Ed25519 |

### Password Requirements

Your backup password must contain:
- ✅ Minimum 10 characters
- ✅ At least 1 uppercase letter (A-Z)
- ✅ At least 1 lowercase letter (a-z)
- ✅ At least 1 number (0-9)
- ✅ At least 1 special character (!@#\$%^&*...)

---

## 🔧 Build from Source

\`\`\`bash
# Clone repository
git clone https://github.com/marixdev/marix.git
cd marix

# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Package for distribution
npm run package:win    # Windows (.exe)
npm run package:mac    # macOS (.zip)
npm run package:linux  # Linux (.AppImage, .deb, .rpm)
\`\`\`

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Windows 10, macOS 10.15, Ubuntu 20.04 | Latest |
| RAM | 2 GB | 4 GB+ |
| Storage | 200 MB | 500 MB |

### Linux RDP Dependencies

\`\`\`bash
# Ubuntu/Debian
sudo apt install freerdp3-x11 xdotool

# Fedora
sudo dnf install freerdp xdotool

# Arch
sudo pacman -S freerdp xdotool
\`\`\`

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0** (GPL-3.0).

This means:
- ✅ You can use, modify, and distribute this software
- ✅ You can use it for commercial purposes
- ⚠️ Any modifications must also be released under GPL-3.0
- ⚠️ You must disclose source code when distributing
- ⚠️ You must state changes made to the code

See [LICENSE](LICENSE) for the full license text.

---

<p align="center">
  <strong>Marix</strong> — A modern, zero-knowledge SSH client<br>
  <em>Your data. Your responsibility. Your freedom.</em><br><br>
  <sub>If you want convenience at the cost of privacy, Marix is not for you.</sub>
</p>
