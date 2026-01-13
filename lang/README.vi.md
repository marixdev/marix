<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>Ứng Dụng SSH Zero-Knowledge Hiện Đại</strong>
</p>

<p align="center">
  <em>Thông tin đăng nhập của bạn không bao giờ rời khỏi thiết bị. Không cloud. Không theo dõi. Không thỏa hiệp.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
</p>

---

## 🌍 Ngôn Ngữ Khác

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) | 🇰🇷 [한국어](README.ko.md) |
| 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) | 🇪🇸 [Español](README.es.md) |
| 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) | 🇵🇭 [Filipino](README.fil.md) |
| 🇧🇷 [Português](README.pt.md) | | | |

---

## ⚠️ Tuyên Bố Miễn Trừ Trách Nhiệm

> **BẠN CHỊU TRÁCH NHIỆM VỀ DỮ LIỆU CỦA CHÍNH MÌNH.**
>
> Marix lưu trữ tất cả dữ liệu cục bộ trên thiết bị của bạn với mã hóa mạnh. Tuy nhiên:
> - **Chúng tôi không thể khôi phục dữ liệu** nếu bạn mất mật khẩu sao lưu
> - **Chúng tôi không có máy chủ** — không có tùy chọn "quên mật khẩu"
> - **Sao lưu thường xuyên** — phần cứng có thể hỏng
> - **Bạn sở hữu bảo mật của mình** — chúng tôi cung cấp công cụ, bạn đưa ra quyết định

---

## 🔒 Kiến Trúc Zero-Knowledge

### Nguyên Tắc Cốt Lõi

| | Nguyên Tắc | Mô Tả |
|---|-----------|-------|
| 🔐 | **100% Ngoại Tuyến** | Tất cả thông tin đăng nhập lưu cục bộ—không bao giờ tải lên |
| ☁️ | **Không Cloud** | Chúng tôi không có máy chủ. Dữ liệu không bao giờ chạm internet |
| 📊 | **Không Telemetry** | Không theo dõi, không phân tích, không thu thập dữ liệu |
| 🔓 | **Mã Nguồn Mở** | Code có thể kiểm toán hoàn toàn theo GPL-3.0 |

### Công Nghệ Mã Hóa

| | Tính Năng | Công Nghệ | Mô Tả |
|---|---------|-----------|-------|
| 🛡️ | **Lưu Trữ Cục Bộ** | Argon2id + AES-256 | Thông tin được mã hóa khi lưu trên thiết bị |
| 📦 | **Sao Lưu File** | Argon2id + AES-256-GCM | Xuất file `.marix` được mã hóa với xác thực |
| 🔄 | **Đồng Bộ GitHub** | Argon2id + AES-256-GCM | Sao lưu cloud zero-knowledge |

---

## ⚡ Hiệu Năng & Tối Ưu Hóa

### Quản Lý Bộ Nhớ Thích Ứng

| RAM Hệ Thống | Bộ Nhớ Argon2id | Mức Bảo Mật |
|--------------|-----------------|-------------|
| ≥ 8 GB | 64 MB | Cao |
| ≥ 4 GB | 32 MB | Trung Bình |
| < 4 GB | 16 MB | Tối ưu cho máy RAM thấp |

### Tối Ưu Hóa Runtime

| Tối Ưu Hóa | Công Nghệ | Lợi Ích |
|------------|-----------|---------|
| **Giới Hạn V8 Heap** | `--max-old-space-size=256MB` | Ngăn chặn phình bộ nhớ |
| **Background Throttling** | `--disable-renderer-backgrounding` | Giữ kết nối hoạt động |
| **Terminal Buffer** | Scrollback: 3,000 dòng | Giảm 70% bộ nhớ |
| **Lazy Loading** | Tải component theo yêu cầu | Khởi động nhanh hơn |

### Tech Stack

| Thành Phần | Công Nghệ | Mục Đích |
|------------|-----------|----------|
| **Framework** | Electron 39 + React 19 | Ứng dụng desktop đa nền tảng |
| **Terminal** | xterm.js 6 | Giả lập terminal hiệu năng cao |
| **SSH/SFTP** | ssh2 + node-pty | Triển khai giao thức SSH native |
| **Code Editor** | CodeMirror 6 | Syntax highlighting nhẹ |
| **Mã Hóa** | Argon2 + Node.js Crypto | Bảo mật cấp quân sự |
| **Styling** | Tailwind CSS 4 | CSS hiện đại, tối giản |
| **Build** | Webpack 5 + TypeScript 5 | Bundle production tối ưu |

---

## 📥 Tải Xuống

| Hệ điều hành | Tải xuống |
|--------------|-----------|
| **Windows** | [Tải .exe](https://github.com/user/marix/releases/latest/download/Marix-Setup.exe) |
| **macOS** | [Intel .dmg](https://github.com/user/marix/releases/latest/download/Marix.dmg) • [Apple Silicon](https://github.com/user/marix/releases/latest/download/Marix-arm64.dmg) |
| **Linux** | [.AppImage](https://github.com/user/marix/releases/latest/download/Marix.AppImage) • [.deb](https://github.com/user/marix/releases/latest/download/marix.deb) • [.rpm](https://github.com/user/marix/releases/latest/download/marix.rpm) |

---

## ✨ Tính Năng

### 🔌 Kết Nối Đa Giao Thức

| Giao Thức | Công Nghệ | Mô Tả |
|-----------|-----------|-------|
| **SSH** | ssh2 + node-pty | Secure Shell với xác thực mật khẩu & private key |
| **SFTP** | ssh2 | Trình quản lý file hai panel với kéo thả |
| **FTP/FTPS** | basic-ftp | Hỗ trợ FTP tiêu chuẩn và bảo mật |
| **RDP** | xfreerdp3 / mstsc | Remote Desktop (xfreerdp3 trên Linux, mstsc trên Windows) |

### 💻 Terminal

- **Hơn 400 theme màu** — Dracula, Solarized, Catppuccin, Nord...
- **Font tùy chỉnh** — Bất kỳ font hệ thống nào
- **Full xterm.js 6** — Giả lập terminal hoàn chỉnh với Unicode
- **Bảo toàn phiên** — Tab được giữ lại khi kết nối lại
- **Phát hiện OS** — Tự động phát hiện distro Linux

### 📁 Trình Quản Lý File SFTP

- **Giao diện hai panel** — Local ↔ Remote cạnh nhau
- **Editor tích hợp** — CodeMirror 6 với syntax highlighting 15+ ngôn ngữ
- **Kéo & thả** — Upload/download file dễ dàng
- **Quản lý quyền** — chmod với giao diện trực quan

### 🛠️ Công Cụ Tích Hợp

- **DNS & Mạng**: A, AAAA, MX, TXT, SPF, CNAME, NS, SOA, PTR, Ping, Traceroute, TCP port, HTTP/HTTPS, SMTP, Blacklist, WHOIS, ARIN
- **Quản Lý DNS Cloudflare**: Quản lý domain, bản ghi DNS, proxy Cloudflare
- **Quản Lý SSH Key**: Tạo RSA-4096, Ed25519, ECDSA-521, import/export key
- **Quản Lý Known Hosts**: Xem fingerprint, import từ host, xóa host không tin cậy

---

## 💾 Sao Lưu & Khôi Phục

### Cách Mã Hóa Hoạt Động

Tất cả sao lưu sử dụng mã hóa cấp quân sự với **Argon2id** và **AES-256-GCM**:

<p align="center">
  <img src="flow.png" alt="Luồng Mã Hóa" width="800">
</p>

### Những Gì Được Sao Lưu

| Dữ Liệu | Bao Gồm | Mã Hóa |
|---------|---------|--------|
| Danh sách server | ✅ | ✅ AES-256-GCM |
| SSH private key | ✅ | ✅ AES-256-GCM |
| Cloudflare API token | ✅ | ✅ AES-256-GCM |
| Cài đặt ứng dụng | ✅ | ✅ AES-256-GCM |
| Known hosts | ❌ | — |

### Đảm Bảo Bảo Mật

- 🔐 **Mật khẩu không bao giờ lưu** — Không trong file, không trên GitHub
- 🔒 **Zero-knowledge** — Ngay cả nhà phát triển cũng không thể giải mã
- 🛡️ **Chống brute-force** — Argon2id yêu cầu 16-64MB RAM mỗi lần thử
- ✅ **Chống giả mạo** — AES-GCM phát hiện mọi sửa đổi

### Sao Lưu GitHub (Zero-Knowledge)

1. **Đăng nhập với GitHub** → Mã thiết bị xuất hiện → Trình duyệt mở → Cho phép → Repository `marix-backup` tự động tạo
2. **Sao lưu**: Nhấp "Sao lưu lên GitHub" → Nhập mật khẩu → Dữ liệu mã hóa được đẩy lên
3. **Khôi phục**: Đăng nhập GitHub → "Khôi phục từ GitHub" → Nhập mật khẩu để giải mã

> ⚠️ **Quan trọng**: Nếu mất mật khẩu, backup **vĩnh viễn không thể khôi phục**. Không ai có thể giải mã.

---

## 🛡️ Thông Số Bảo Mật

| Thành Phần | Thuật Toán | Tham Số |
|------------|------------|---------|
| Key Derivation | Argon2id | 16-64MB bộ nhớ, 3 vòng lặp, 4 luồng |
| Mã hóa | AES-256-GCM | Khóa 256-bit, có xác thực |
| Salt | CSPRNG | 32 byte mỗi backup |
| IV/Nonce | CSPRNG | 16 byte mỗi thao tác |

### Yêu Cầu Mật Khẩu

- ✅ Tối thiểu 10 ký tự
- ✅ Ít nhất 1 chữ hoa (A-Z)
- ✅ Ít nhất 1 chữ thường (a-z)
- ✅ Ít nhất 1 số (0-9)
- ✅ Ít nhất 1 ký tự đặc biệt (!@#$%^&*...)

---

## 🔧 Build Từ Mã Nguồn

```bash
git clone https://github.com/marixdev/marix.git
cd marix
npm install
npm run dev      # Phát triển
npm run build    # Build
npm run package:linux  # Đóng gói
```

### Dependencies RDP cho Linux

```bash
# Ubuntu/Debian
sudo apt install freerdp3-x11 xdotool

# Fedora
sudo dnf install freerdp xdotool

# Arch
sudo pacman -S freerdp xdotool
```

---

## 📄 Giấy Phép

**GNU General Public License v3.0** (GPL-3.0)

---

<p align="center">
  <strong>Marix</strong> — Ứng dụng SSH zero-knowledge hiện đại<br>
  <em>Dữ liệu của bạn. Trách nhiệm của bạn. Tự do của bạn.</em>
</p>
