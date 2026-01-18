<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>Ứng dụng SSH Zero-Knowledge Hiện đại</strong>
</p>

<p align="center">
  <em>Thông tin đăng nhập của bạn không bao giờ rời khỏi thiết bị. Không có cloud. Không có tracking. Không có thỏa hiệp.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
  <img src="https://img.shields.io/badge/version-1.0.4-orange" alt="Version">
</p>

<p align="center">
  <a href="https://marix.dev">🌐 Website</a> •
  <a href="#-tải-xuống">📥 Tải xuống</a> •
  <a href="#-tính-năng">✨ Tính năng</a> •
  <a href="#-thông-số-bảo-mật">🛡️ Bảo mật</a> •
  <a href="#-ngôn-ngữ-khác">🌍 Ngôn ngữ</a>
</p>

---

## 🌍 Ngôn ngữ khác

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) |
| 🇪🇸 [Español](README.es.md) | 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) |
| 🇵🇭 [Filipino](README.fil.md) | 🇧🇷 [Português](README.pt.md) | | |

---

## 🎯 Marix dành cho ai?

- **Developers & DevOps engineers** quản lý nhiều server
- **Quản trị viên hệ thống** coi trọng bảo mật và hiệu suất
- **Người dùng quan tâm bảo mật** không tin tưởng các giải pháp cloud
- **Bất kỳ ai** muốn kiểm soát hoàn toàn thông tin SSH của mình

---

## ⚠️ Lưu ý quan trọng

> **BẠN CHỊU TRÁCH NHIỆM VỚI DỮ LIỆU CỦA MÌNH.**
>
> Marix lưu trữ tất cả dữ liệu cục bộ trên thiết bị của bạn với mã hóa mạnh. Tuy nhiên:
> - **Chúng tôi không thể khôi phục dữ liệu** nếu bạn mất mật khẩu backup
> - **Chúng tôi không có server** - không có tùy chọn "quên mật khẩu"
> - **Sao lưu thường xuyên** - phần cứng có thể hỏng
> - **Bạn sở hữu bảo mật của mình** - chúng tôi cung cấp công cụ, bạn đưa ra quyết định
>
> Bằng việc sử dụng Marix, bạn chấp nhận toàn bộ trách nhiệm về bảo mật dữ liệu của mình.

---

## 🔒 Kiến trúc Zero-Knowledge

> **"Khóa của bạn. Server của bạn. Quyền riêng tư của bạn."**

### Nguyên tắc cốt lõi

| | Nguyên tắc | Mô tả |
|---|-----------|-------|
| 🔐 | **100% Offline** | Tất cả thông tin lưu cục bộ trên thiết bị—không bao giờ upload |
| ☁️ | **Không có Cloud** | Chúng tôi không có server. Dữ liệu không bao giờ chạm internet |
| 📊 | **Không có Telemetry** | Không tracking, không analytics, không thu thập dữ liệu |
| 🔓 | **Mã nguồn mở** | Code hoàn toàn có thể kiểm tra dưới GPL-3.0, không có backdoor ẩn |

### Công nghệ mã hóa

| | Thành phần | Công nghệ | Mô tả |
|---|-----------|-----------|-------|
| 🛡️ | **Lưu trữ cục bộ** | Argon2id + AES-256 | Thông tin mã hóa khi lưu trên thiết bị |
| 📦 | **File Backup** | Argon2id + AES-256-GCM | Export file `.marix` được mã hóa với authenticated encryption |
| 🔄 | **GitHub Sync** | Argon2id + AES-256-GCM | Sao lưu cloud zero-knowledge—GitHub chỉ lưu blob mã hóa |

---

## ⚡ Hiệu suất & Tối ưu hóa

Marix được tối ưu để chạy mượt mà trên máy cấu hình thấp:

### Quản lý bộ nhớ thích ứng

| RAM hệ thống | Bộ nhớ Argon2id | Mức bảo mật |
|--------------|-----------------|-------------|
| ≥ 8 GB | 64 MB | Cao |
| ≥ 4 GB | 32 MB | Trung bình |
| < 4 GB | 16 MB | Tối ưu cho RAM thấp |

Ứng dụng tự động phát hiện RAM hệ thống và điều chỉnh tham số mã hóa để đạt hiệu suất tối ưu trong khi vẫn duy trì bảo mật.

### Tối ưu runtime

| Tối ưu | Công nghệ | Lợi ích |
|---------|-----------|---------|
| **V8 Heap Limit** | `--max-old-space-size=256MB` | Ngăn chặn memory bloat |
| **Background Throttling** | `--disable-renderer-backgrounding` | Giữ kết nối luôn hoạt động |
| **Terminal Buffer** | Scrollback: 3,000 lines | Giảm 70% bộ nhớ so với mặc định |
| **Lazy Loading** | On-demand component loading | Khởi động nhanh hơn |
| **GC Hints** | Manual garbage collection triggers | Giảm memory footprint |

### Tech Stack

| Thành phần | Công nghệ | Mục đích |
|------------|-----------|---------|
| **Framework** | Electron 39 + React 19 | Ứng dụng desktop đa nền tảng |
| **Terminal** | xterm.js 6 | Mô phỏng terminal hiệu suất cao |
| **SSH/SFTP** | ssh2 + node-pty | Triển khai SSH protocol gốc |
| **Code Editor** | CodeMirror 6 | Syntax highlighting nhẹ |
| **Mã hóa** | Argon2 + Node.js Crypto | Mã hóa client-side mạnh mẽ |
| **Styling** | Tailwind CSS 4 | CSS hiện đại, tối giản |
| **Build** | Webpack 5 + TypeScript 5 | Bundle sản phẩm tối ưu |

---

## 📥 Tải xuống

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

## ✨ Tính năng

### 🔌 Kết nối đa giao thức

| Giao thức | Mô tả |
|-----------|-------|
| **SSH** | Secure Shell với xác thực password & private key |
| **SFTP** | Quản lý file dual-pane với drag-and-drop |
| **FTP/FTPS** | Hỗ trợ FTP tiêu chuẩn và bảo mật |
| **RDP** | Remote Desktop (xfreerdp3 trên Linux, mstsc trên Windows) |

### 💻 Terminal

- **400+ color themes** - Từ Dracula đến Solarized, Catppuccin, Nord, và hơn thế nữa
- **Phông chữ tùy chỉnh** - Bất kỳ phông hệ thống nào, bất kỳ kích thước nào
- **Full xterm.js 6** - Mô phỏng terminal hoàn chỉnh với hỗ trợ Unicode
- **Bảo toàn phiên** - Các tab tồn tại qua các lần kết nối lại
- **Phát hiện OS** - Tự động phát hiện distro Linux & hiển thị thông tin hệ thống

### 📁 SFTP File Manager

- **Giao diện dual-pane** - Local ↔ Remote song song
- **Editor tích hợp** - CodeMirror 6 với 15+ ngôn ngữ syntax highlighting
- **Drag & drop** - Upload/download file dễ dàng
- **Quản lý permission** - chmod với giao diện trực quan
- **Thao tác batch** - Chọn nhiều file để transfer

### 🛠️ Công cụ tích hợp

#### LAN File Transfer
*Chia sẻ file ngay lập tức giữa các thiết bị trên mạng cục bộ.*

#### LAN Server Sharing
*Chia sẻ cấu hình server với các thiết bị gần đó một cách an toàn.*

#### DNS & Network Tools
- DNS lookup
- WHOIS query
- Port scanner
- Traceroute

#### Cloudflare DNS Manager
*Công cụ tích hợp tùy chọn để quản lý Cloudflare DNS trực tiếp từ workspace SSH của bạn.*

#### SSH Key Manager
- Tạo cặp SSH key (Ed25519, RSA, ECDSA)
- Import/export keys
- Quản lý known hosts

#### Known Hosts Manager
- Xem và quản lý known hosts
- Xóa fingerprints cũ
- Export/import known hosts

### 🎨 Trải nghiệm người dùng

- **Themes Dark & Light** - Theo hệ thống hoặc chuyển đổi thủ công
- **14 ngôn ngữ** được hỗ trợ
- **Gắn thẻ server** - Tổ chức với các thẻ màu
- **Kết nối nhanh** - Cmd/Ctrl+K để tìm server
- **Lịch sử kết nối** - Truy cập nhanh các kết nối gần đây

---

## 💾 Backup & Restore

### Mã hóa hoạt động như thế nào

Tất cả backup sử dụng **Argon2id** (người chiến thắng Password Hashing Competition) và **AES-256-GCM** (authenticated encryption):

```
Password → Argon2id(16-64MB memory) → 256-bit key → AES-256-GCM → Encrypted backup
```

### Dữ liệu nào được sao lưu

| Dữ liệu | Có | Mã hóa |
|---------|:--:|:------:|
| Danh sách server (hosts, ports, credentials) | ✅ | ✅ |
| SSH private keys | ✅ | ✅ |
| Cloudflare API token | ✅ | ✅ |
| Cài đặt & preferences ứng dụng | ✅ | ✅ |
| Known hosts | ✅ | ✅ |

### Đảm bảo bảo mật

🔐 **Password không bao giờ được lưu** — Không trong file, không trên GitHub, không ở đâu cả  
🔒 **Zero-knowledge** — Ngay cả nhà phát triển Marix cũng không thể giải mã backup của bạn  
🛡️ **Kháng brute-force** — Argon2id yêu cầu 16-64MB RAM mỗi lần thử  
✅ **Chống giả mạo** — AES-GCM phát hiện mọi sửa đổi đối với dữ liệu mã hóa  
🔄 **Tương thích đa máy** — Backup lưu memory cost để có tính di động

---

### Backup mã hóa cục bộ

Export tất cả dữ liệu của bạn dưới dạng file `.marix` được mã hóa:

1. **Vào Settings** → **Backup & Restore**
2. **Tạo password** đáp ứng yêu cầu:
   - Tối thiểu 10 ký tự
   - 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt
3. **Export** - File được mã hóa trước khi lưu
4. **Lưu trữ an toàn** - Giữ file backup và nhớ mật khẩu

---

### Google Drive Backup (Zero-Knowledge)

Đồng bộ an toàn backup được mã hóa của bạn lên Google Drive:

#### Cài đặt

📘 **Hướng dẫn cài đặt**: Xem [docs/google/GOOGLE_DRIVE_SETUP.vi.md](../docs/google/GOOGLE_DRIVE_SETUP.vi.md) để được hướng dẫn chi tiết.

ℹ️ **Phiên bản đóng gói sẵn**: Nếu bạn dùng bản build có sẵn (AppImage, RPM, v.v.), Google credentials đã được tích hợp sẵn. Bạn có thể bỏ qua bước 1 và kết nối trực tiếp.

1. **Cấu hình OAuth Credentials**:
   - Tạo Google Cloud Project
   - Bật Google Drive API
   - Tạo OAuth 2.0 Client ID
   - Download file credentials JSON
   - Lưu thành `src/main/services/google-credentials.json`

2. **Kết nối trong Marix**:
   - Vào Settings → Backup & Restore → Google Drive
   - Click "Kết nối Google Drive"
   - Browser mở để OAuth với Google
   - Cấp quyền truy cập
   - App nhận token bảo mật

3. **Tạo Backup**:
   - Nhập mật khẩu mã hóa (10+ ký tự)
   - Click "Tạo Backup"
   - File được upload vào thư mục "Marix Backups" trên Drive

4. **Khôi phục Backup**:
   - Click "Khôi phục từ Google Drive"
   - Nhập mật khẩu backup
   - Tất cả server và settings được khôi phục

#### Cách hoạt động

✅ **Mã hóa đầu cuối** - Dữ liệu được mã hóa trước khi rời thiết bị  
✅ **Zero-knowledge** - Google chỉ thấy blob mã hóa  
✅ **Chỉ bạn có key** - OAuth token lưu local  
✅ **Thư mục riêng** - File chỉ app của bạn truy cập được

---

### GitHub Backup (Zero-Knowledge)

Đồng bộ an toàn backup được mã hóa của bạn lên repository GitHub private:

#### Cài đặt

1. **Login với GitHub**:
   - Vào Settings → Backup & Restore → GitHub Backup
   - Click "Login với GitHub"
   - Mã device code sẽ xuất hiện trong app
   - Browser tự động mở - nhập code và authorize
   - Xong! Repository private `marix-backup` tự động được tạo

2. **Backup**:
   - Click "Backup to GitHub"
   - Nhập mật khẩu backup
   - Dữ liệu mã hóa được push lên repository

3. **Restore trên thiết bị khác**:
   - Cài Marix
   - Login với GitHub (các bước tương tự)
   - Click "Restore from GitHub"
   - Nhập mật khẩu backup để giải mã

#### Tại sao GitHub an toàn

| Lớp | Bảo vệ |
|-----|--------|
| **Mã hóa client-side** | Dữ liệu mã hóa trước khi rời thiết bị |
| **Argon2id KDF** | 16-64MB memory, 3 iterations, 4 parallel lanes |
| **AES-256-GCM** | Authenticated encryption với random IV |
| **GitHub storage** | Chỉ ciphertext mã hóa được lưu |
| **Không có Marix server** | Giao tiếp trực tiếp client ↔ GitHub |

⚠️ **Quan trọng**: Nếu bạn mất mật khẩu backup, backup của bạn **không thể khôi phục vĩnh viễn**. Chúng tôi không thể giải mã. Không ai có thể.

---

## 🛡️ Thông số bảo mật

### Chi tiết mã hóa

| Thuật toán | Tham số |
|------------|----------|
| **Key Derivation** | Argon2id (memory: 16-64MB, iterations: 3, parallelism: 4) |
| **Symmetric Encryption** | AES-256-GCM |
| **Salt** | 32 bytes (cryptographically random) |
| **IV/Nonce** | 16 bytes (unique per encryption) |
| **Auth Tag** | 16 bytes (GCM authentication tag) |

### Thuật toán SSH Key

| Thuật toán | Kích thước Key | Trường hợp sử dụng |
|------------|----------------|---------------------|
| **Ed25519** | 256-bit | Được khuyến nghị (nhanh, bảo mật) |
| **RSA** | 2048-4096 bit | Tương thích legacy |
| **ECDSA** | 256-521 bit | Thay thế cho Ed25519 |

### Yêu cầu mật khẩu

Mật khẩu backup của bạn phải chứa:

✅ Tối thiểu 10 ký tự  
✅ Ít nhất 1 chữ hoa (A-Z)  
✅ Ít nhất 1 chữ thường (a-z)  
✅ Ít nhất 1 số (0-9)  
✅ Ít nhất 1 ký tự đặc biệt (!@#$%^&*...)

---

## �� Build từ Source

```bash
# Clone repository
git clone https://github.com/user/marix.git
cd marix

# Cài dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Đóng gói để phân phối
npm run package:win    # Windows (.exe)
npm run package:mac    # macOS (.zip)
npm run package:linux  # Linux (.AppImage, .deb, .rpm)
```

### Yêu cầu hệ thống

|  | Tối thiểu | Khuyến nghị |
|--|-----------|-------------|
| **OS** | Windows 10, macOS 10.13, Ubuntu 18.04 | Mới nhất |
| **RAM** | 2 GB | 4 GB+ |
| **Lưu trữ** | 200 MB | 500 MB |

### Dependencies RDP cho Linux

```bash
# Cài xfreerdp3 để hỗ trợ RDP
sudo apt install freerdp3-x11  # Debian/Ubuntu
sudo dnf install freerdp       # Fedora
sudo pacman -S freerdp         # Arch
```

---

## 📄 Giấy phép

Dự án này được cấp phép theo **GNU General Public License v3.0** (GPL-3.0).

Điều này có nghĩa:

✅ Bạn có thể sử dụng, sửa đổi và phân phối phần mềm này  
✅ Bạn có thể sử dụng nó cho mục đích thương mại  
⚠️ Mọi sửa đổi cũng phải được phát hành dưới GPL-3.0  
⚠️ Bạn phải công khai source code khi phân phối  
⚠️ Bạn phải nêu rõ các thay đổi được thực hiện đối với code

Xem [LICENSE](../LICENSE) để biết toàn bộ văn bản giấy phép.

---

<p align="center">
  <strong>Marix</strong><br>
  Ứng dụng SSH zero-knowledge hiện đại<br><br>
  <em>Dữ liệu của bạn. Trách nhiệm của bạn. Tự do của bạn.</em><br><br>
  Nếu bạn muốn sự tiện lợi với cái giá là quyền riêng tư, Marix không dành cho bạn.
</p>
