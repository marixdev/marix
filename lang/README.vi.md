<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>SSH client zero-knowledge hiện đại</strong>
</p>

<p align="center">
  <em>Credentials không rời thiết bị. Không cloud. Không tracking. Không server.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
</p>

---

## 🌍 Ngôn ngữ khác

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) | 🇰🇷 [한국어](README.ko.md) |
| 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) | 🇪🇸 [Español](README.es.md) |
| 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) | 🇵🇭 [Filipino](README.fil.md) |
| 🇧🇷 [Português](README.pt.md) | | | |

---

## ⚠️ Disclaimer

> **Bạn chịu trách nhiệm về dữ liệu của mình.**
>
> Marix lưu tất cả dữ liệu local với encryption mạnh. Lưu ý:
> - Nếu mất password, dữ liệu **không thể khôi phục**
> - Không có server — không có "quên password"
> - Backup thường xuyên — hardware có thể hỏng
> - Bạn tự quản lý security của mình

---

## 🔒 Zero-knowledge architecture

### Core principles

| | Nguyên tắc | Mô tả |
|---|-----------|-------|
| 🔐 | **100% Offline** | Credentials lưu local — không upload |
| ☁️ | **Không cloud** | Không có server. Data không chạm internet |
| 📊 | **Không telemetry** | Không tracking, không analytics |
| 🔓 | **Open source** | Code audit được theo GPL-3.0 |

### Encryption

| | Feature | Technology | Mô tả |
|---|---------|-----------|-------|
| 🛡️ | **Local storage** | Argon2id + AES-256 | Credentials encrypted at rest |
| 📦 | **File backup** | Argon2id + AES-256-GCM | Export file `.marix` encrypted |
| 🔄 | **GitHub Sync** | Argon2id + AES-256-GCM | Zero-knowledge cloud backup |

---

## ⚡ Performance & optimization

### Adaptive memory management

| System RAM | Argon2id Memory | Security Level |
|--------------|-----------------|-------------|
| ≥ 8 GB | 64 MB | High |
| ≥ 4 GB | 32 MB | Medium |
| < 4 GB | 16 MB | Optimized for low RAM |

### Runtime optimizations

| Optimization | Technology | Benefit |
|------------|-----------|---------|
| **V8 Heap Limit** | `--max-old-space-size=256MB` | Prevents memory bloat |
| **Background Throttling** | `--disable-renderer-backgrounding` | Keeps connections alive |
| **Terminal Buffer** | Scrollback: 3,000 lines | 70% memory reduction |
| **Lazy Loading** | On-demand component loading | Faster startup |

### Tech stack

| Component | Technology | Purpose |
|------------|-----------|----------|
| **Framework** | Electron 39 + React 19 | Cross-platform desktop app |
| **Terminal** | xterm.js 6 | High-performance terminal emulation |
| **SSH/SFTP** | ssh2 + node-pty | Native SSH protocol implementation |
| **Code Editor** | CodeMirror 6 | Lightweight syntax highlighting |
| **Encryption** | Argon2 + Node.js Crypto | Strong client-side encryption |
| **Styling** | Tailwind CSS 4 | Modern, minimal CSS |
| **Build** | Webpack 5 + TypeScript 5 | Optimized production bundles |

---

## 📥 Download

| Hệ điều hành | Download |
|--------------|-----------|
| **Windows** | [Tải .exe](https://github.com/user/marix/releases/latest/download/Marix-Setup.exe) |
| **macOS** | [Intel .dmg](https://github.com/user/marix/releases/latest/download/Marix.dmg) • [Apple Silicon](https://github.com/user/marix/releases/latest/download/Marix-arm64.dmg) |
| **Linux** | [.AppImage](https://github.com/user/marix/releases/latest/download/Marix.AppImage) • [.deb](https://github.com/user/marix/releases/latest/download/marix.deb) • [.rpm](https://github.com/user/marix/releases/latest/download/marix.rpm) |

---

## ✨ Features

### 🔌 Multi-protocol connections

| Protocol | Technology | Mô tả |
|-----------|-----------|-------|
| **SSH** | ssh2 + node-pty | Secure Shell với password & private key authentication |
| **SFTP** | ssh2 | Dual-pane file manager với drag-drop |
| **FTP/FTPS** | basic-ftp | Standard and secure FTP support |
| **RDP** | xfreerdp3 / mstsc | Remote Desktop (xfreerdp3 trên Linux, mstsc trên Windows) |

### 💻 Terminal

- **400+ color themes** — Dracula, Solarized, Catppuccin, Nord...
- **Custom fonts** — Bất kỳ font hệ thống
- **Full xterm.js 6** — Terminal emulation hoàn chỉnh với Unicode
- **Session preservation** — Tab giữ lại khi reconnect
- **OS detection** — Auto-detect Linux distro

### 📁 SFTP file manager

- **Dual-pane interface** — Local ↔ Remote cạnh nhau
- **Integrated editor** — CodeMirror 6 với syntax highlighting 15+ ngôn ngữ
- **Drag & drop** — Upload/download file dễ dàng
- **Permission management** — chmod với visual interface

### 🛠️ Built-in tools

- **DNS & Network**: A, AAAA, MX, TXT, SPF, CNAME, NS, SOA, PTR, Ping, Traceroute, TCP port, HTTP/HTTPS, SMTP, Blacklist, WHOIS, ARIN
- **Cloudflare DNS Manager**: Quản lý domain, DNS records, Cloudflare proxy
- **SSH Key Manager**: Generate RSA-4096, Ed25519, ECDSA-521, import/export key
- **Known Hosts Manager**: Xem fingerprint, import từ host, xóa host không trust

---

## 💾 Backup & Restore

### Encryption

Tất cả backup sử dụng **Argon2id** và **AES-256-GCM**:

<p align="center">
  <img src="flow.png" alt="Luồng Mã Hóa" width="800">
</p>

### What gets backed up

| Data | Included | Encrypted |
|---------|---------|--------|
| Server list | ✅ | ✅ AES-256-GCM |
| SSH private key | ✅ | ✅ AES-256-GCM |
| Cloudflare API token | ✅ | ✅ AES-256-GCM |
| App settings | ✅ | ✅ AES-256-GCM |
| Known hosts | ❌ | — |

### Security guarantees

- 🔐 **Password never stored** — Không trong file, không trên GitHub
- 🔒 **Zero-knowledge** — Developer cũng không thể decrypt
- 🛡️ **Brute-force resistant** — Argon2id yêu cầu 16-64MB RAM mỗi attempt
- ✅ **Tamper-proof** — AES-GCM detect mọi modification

### GitHub Backup (Zero-Knowledge)

1. **Login với GitHub** → Device code xuất hiện → Browser mở → Authorize → Repository `marix-backup` tự động tạo
2. **Backup**: Click "Backup to GitHub" → Nhập password → Encrypted data được push
3. **Restore**: Login GitHub → "Restore from GitHub" → Nhập password để decrypt

> ⚠️ **Important**: Nếu mất password, backup **không thể recover**. Không ai có thể decrypt.

---

## 🛡️ Security specifications

| Component | Algorithm | Parameters |
|------------|------------|----------|
| Key Derivation | Argon2id | 16-64MB memory, 3 iterations, 4 lanes |
| Encryption | AES-256-GCM | 256-bit key, authenticated |
| Salt | CSPRNG | 32 bytes per backup |
| IV/Nonce | CSPRNG | 16 bytes per operation |

### Password requirements

- ✅ Tối thiểu 10 ký tự
- ✅ Ít nhất 1 uppercase (A-Z)
- ✅ Ít nhất 1 lowercase (a-z)
- ✅ Ít nhất 1 number (0-9)
- ✅ Ít nhất 1 special character (!@#$%^&*...)

---

## 🔧 Build from source

```bash
git clone https://github.com/marixdev/marix.git
cd marix
npm install
npm run dev      # Development
npm run build    # Build
npm run package:linux  # Package
```

### RDP dependencies for Linux

```bash
# Ubuntu/Debian
sudo apt install freerdp3-x11 xdotool

# Fedora
sudo dnf install freerdp xdotool

# Arch
sudo pacman -S freerdp xdotool
```

---

## 📄 License

**GNU General Public License v3.0** (GPL-3.0)

---

<p align="center">
  <strong>Marix</strong> — Modern zero-knowledge SSH client<br>
  <em>Your data. Your responsibility. Your freedom.</em>
</p>
