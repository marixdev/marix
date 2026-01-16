<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>现代零知识 SSH 应用</strong>
</p>

<p align="center">
  <em>您的凭据永远不会离开您的设备。无云服务。无跟踪。无妥协。</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
  <img src="https://img.shields.io/badge/version-1.0.4-orange" alt="Version">
</p>

<p align="center">
  <a href="https://marix.dev">🌐 Website</a> •
  <a href="#-tải-xuống">📥 下载</a> •
  <a href="#-tính-năng">✨ 功能特性</a> •
  <a href="#-thông-số-bảo-mật">🛡️ Bảo mật</a> •
  <a href="#-ngôn-ngữ-khác">🌍 Ngôn ngữ</a>
</p>

---

## 🌍 其他语言

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) |
| 🇪🇸 [Español](README.es.md) | 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) |
| 🇵🇭 [Filipino](README.fil.md) | 🇧🇷 [Português](README.pt.md) | | |

---

## 🎯 Marix 适合谁？

- **开发者和 DevOps 工程师** 管理多台服务器
- **系统管理员** 重视安全和性能
- **关注隐私的用户** 不信任云解决方案
- **任何人** 想要完全控制他们的 SSH 信息

---

## ⚠️ 重要声明

> **您对自己的数据负责。**
>
> Marix 使用强加密在本地存储所有数据。但是:
> - **我们无法恢复数据** 如果您丢失备份密码
> - **我们没有服务器** - 没有"忘记密码"选项
> - **定期备份** - 硬件可能损坏
> - **您拥有自己的安全** - 我们提供工具，您做决定
>
> 使用 Marix，即表示您接受对数据安全的全部责任。

---

## 🔒 零知识架构

> **"您的密钥。您的服务器。您的隐私。"**

### 核心原则

| | Nguyên tắc | 描述 |
|---|-----------|-------|
| 🔐 | **100% 离线** | 所有信息本地存储在设备上—永不上传 |
| ☁️ | **无云服务** | 我们没有服务器。数据永不触网 |
| 📊 | **无遥测** | 无跟踪、无分析、无数据收集 |
| 🔓 | **开源** | 代码完全可审计，GPL-3.0 许可，无隐藏后门 |

### 加密技术

| | 组件 | 技术 | 描述 |
|---|-----------|-----------|-------|
| 🛡️ | **本地存储** | Argon2id + AES-256 | 存储在设备上时加密 |
| 📦 | **文件备份** | Argon2id + AES-256-GCM | 导出加密的 `.marix` 文件，带认证加密 |
| 🔄 | **GitHub 同步** | Argon2id + AES-256-GCM | 零知识云备份—GitHub 仅存储加密数据块 |

---

## ⚡ 性能与优化

Marix 经过优化，可在低规格机器上流畅运行：

### 自适应内存管理

| 系统内存 | Argon2id 内存 | 安全级别 |
|--------------|-----------------|-------------|
| ≥ 8 GB | 64 MB | 高 |
| ≥ 4 GB | 32 MB | 中 |
| < 4 GB | 16 MB | 低内存优化 |

Ứng dụng tự động phát hiện 系统内存 và điều chỉnh tham số mã hóa để đạt hiệu suất tối ưu trong khi vẫn duy trì bảo mật.

### 运行时优化

| 优化 | 技术 | 好处 |
|---------|-----------|---------|
| **V8 Heap Limit** | `--max-old-space-size=256MB` | 防止内存膨胀 |
| **Background Throttling** | `--disable-renderer-backgrounding` | 保持连接活跃 |
| **Terminal Buffer** | Scrollback: 3,000 lines | 比默认减少 70% 内存 |
| **Lazy Loading** | On-demand component loading | 启动更快 |
| **GC Hints** | Manual garbage collection triggers | 减少内存占用 |

### 技术栈

| 组件 | 技术 | 目的 |
|------------|-----------|---------|
| **Framework** | Electron 39 + React 19 | 跨平台桌面应用 |
| **Terminal** | xterm.js 6 | 高性能终端模拟 |
| **SSH/SFTP** | ssh2 + node-pty | 原生 SSH 协议实现 |
| **Code Editor** | CodeMirror 6 | 轻量语法高亮 |
| **加密** | Argon2 + Node.js Crypto | 强大的客户端加密 |
| **Styling** | Tailwind CSS 4 | 现代简约 CSS |
| **Build** | Webpack 5 + TypeScript 5 | 优化的生产包 |

---

## 📥 下载

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

## ✨ 功能特性

### 🔌 多协议连接

| 协议 | 描述 |
|-----------|-------|
| **SSH** | Secure Shell，支持密码和私钥认证 |
| **SFTP** | 双窗格文件管理器，支持拖放 |
| **FTP/FTPS** | 标准和安全 FTP 支持 |
| **RDP** | 远程桌面（Linux 上为 xfreerdp3，Windows 上为 mstsc） |

### 💻 终端

- **400+ 色彩主题** - 从 Dracula 到 Solarized、Catppuccin、Nord 等
- **自定义字体** - 任何系统字体，任何大小
- **完整 xterm.js 6** - 完整终端模拟，支持 Unicode
- **会话保持** - 标签页在重新连接后保持
- **OS 检测** - 自动检测 Linux 发行版并显示系统信息

### 📁 SFTP 文件管理器

- **双窗格界面** - 本地 ↔ 远程并排
- **集成编辑器** - CodeMirror 6，支持 15+ 语言语法高亮
- **拖放** - 轻松上传/下载文件
- **权限管理** - 直观的 chmod 界面
- **批量操作** - 选择多个文件进行传输

### 🛠️ 内置工具

#### LAN 文件传输
*在局域网设备间即时共享文件。*

#### LAN 服务器共享
*安全地与附近设备共享服务器配置。*

#### DNS 和网络工具
- DNS lookup
- WHOIS query
- Port scanner
- Traceroute

#### Cloudflare DNS 管理器
*可选的集成工具，直接从 SSH 工作区管理 Cloudflare DNS。*

#### SSH 密钥管理器
- Tạo cặp SSH key (Ed25519, RSA, ECDSA)
- Import/export keys
- Quản lý known hosts

#### Known Hosts 管理器
- Xem và quản lý known hosts
- Xóa fingerprints cũ
- Export/import known hosts

### 🎨 用户体验

- **深色和浅色主题** - 跟随系统或手动切换
- 支持 **14 种语言**
- **服务器标签** - 用彩色标签组织
- **快速连接** - Cmd/Ctrl+K 搜索服务器
- **连接历史** - 快速访问最近的连接

---

## 💾 备份与恢复

### 加密如何工作

所有备份使用 **Argon2id**（密码哈希竞赛冠军）和 **AES-256-GCM**（认证加密）：

```
Password → Argon2id(16-64MB memory) → 256 位 key → AES-256-GCM → Encrypted backup
```

### 备份哪些数据

| 数据 | 是 | 加密 |
|---------|:--:|:------:|
| 服务器列表（主机、端口、凭据） | ✅ | ✅ |
| SSH 私钥 | ✅ | ✅ |
| Cloudflare API 令牌 | ✅ | ✅ |
| 应用设置和偏好 | ✅ | ✅ |
| Known hosts | ✅ | ✅ |

### 安全保证

🔐 **密码永不存储** — 不在文件中，不在 GitHub 上，不在任何地方  
🔒 **零知识** — 即使 Marix 开发者也无法解密您的备份  
🛡️ **抗暴力破解** — Argon2id 每次尝试需要 16-64MB RAM  
✅ **防篡改** — AES-GCM 检测对加密数据的任何修改  
🔄 **多机兼容** — 备份存储内存成本以实现可移植性

---

### 本地加密备份

将所有数据导出为加密的 `.marix` 文件：

1. **进入设置** → **备份与恢复**
2. **创建密码** 满足要求：
   - 至少 10 个字符
   - 1 个大写字母、1 个小写字母、1 个数字、1 个特殊字符
3. **导出** - 文件在保存前加密
4. **安全存储** - 保管好备份文件并记住密码

---

### Google Drive 备份（零知识）

安全地将加密备份同步到 Google Drive：

#### 设置

📘 **设置指南**: Xem [docs/google/GOOGLE_DRIVE_SETUP.vi.md](../docs/google/GOOGLE_DRIVE_SETUP.vi.md) để được hướng dẫn chi tiết.

ℹ️ **预构建版本**：如果您使用预构建版本（AppImage、RPM 等），Google 凭据已预集成。您可以跳过步骤 1 直接连接。

1. **配置 OAuth 凭据**：
   - 创建 Google Cloud 项目
   - 启用 Google Drive API
   - 创建 OAuth 2.0 客户端 ID
   - 下载凭据 JSON 文件
   - 保存为 `src/main/services/google-credentials.json`

2. **在 Marix 中连接**：
   - 进入设置 → 备份与恢复 → Google Drive
   - 点击"连接 Google Drive"
   - 浏览器打开以进行 Google OAuth
   - 授予访问权限
   - 应用接收安全令牌

3. **创建备份**：
   - 输入加密密码（10+ 字符）
   - 点击"创建备份"
   - 文件上传到 Drive 上的"Marix Backups"文件夹

4. **恢复备份**：
   - 点击"从 Google Drive 恢复"
   - 输入备份密码
   - 所有服务器和设置被恢复

#### 如何工作

✅ **加密 đầu cuối** - 数据 được mã hóa trước khi rời thiết bị  
✅ **零知识** - Google 只看到加密数据块  
✅ **只有您拥有密钥** - OAuth 令牌本地存储  
✅ **私有文件夹** - 文件只能由您的应用访问

---

### GitHub 备份（零知识）

安全地将加密备份同步到私有 GitHub 仓库：

#### 设置

1. **使用 GitHub 登录**：
   - 进入设置 → 备份与恢复 → GitHub 备份
   - 点击"使用 GitHub 登录"
   - 设备代码将出现在应用中
   - 浏览器自动打开 - 输入代码并授权
   - 完成！私有仓库 `marix-backup` 自动创建

2. **备份**：
   - 点击"备份到 GitHub"
   - 输入备份密码
   - 数据 mã hóa được push lên repository

3. **在其他设备上恢复**：
   - 安装 Marix
   - 使用 GitHub 登录（相同步骤）
   - 点击"从 GitHub 恢复"
   - 输入备份密码 để giải mã

#### 为什么 GitHub 安全

| 层 | 保护 |
|-----|--------|
| **加密 client-side** | 数据 mã hóa trước khi rời thiết bị |
| **Argon2id KDF** | 16-64MB 内存，3 次迭代，4 个并行通道 |
| **AES-256-GCM** | 带随机 IV 的认证加密 |
| **GitHub 存储** | 仅存储加密密文 |
| **无 Marix 服务器** | 客户端 ↔ GitHub 直接通信 |

⚠️ **重要**：如果您丢失备份密码，您的备份**将永久无法恢复**。我们无法解密。没有人可以。

---

## 🛡️ 安全规格

### 加密详情

| 算法 | 参数 |
|------------|----------|
| **密钥派生** | Argon2id (memory: 16-64MB, iterations: 3, parallelism: 4) |
| **对称加密** | AES-256-GCM |
| **盐值** | 32 字节（密码学随机） |
| **IV/Nonce** | 16 字节（每次加密唯一） |
| **认证标签** | 16 字节（GCM 认证标签） |

### 算法 SSH Key

| 算法 | 密钥大小 | 使用场景 |
|------------|----------------|---------------------|
| **Ed25519** | 256 位 | 推荐（快速、安全） |
| **RSA** | 2048-4096 位 | 旧版兼容性 |
| **ECDSA** | 256-521 位 | Ed25519 的替代品 |

### 密码要求

您的备份密码必须包含：

✅ 至少 10 个字符  
✅ 至少 1 个大写字母（A-Z）  
✅ 至少 1 个小写字母（a-z）  
✅ 至少 1 个数字（0-9）  
✅ 至少 1 个特殊字符（!@#$%^&*...）

---

## �� Build từ Source

```bash
# 克隆仓库
git clone https://github.com/user/marix.git
cd marix

# 安装依赖
npm install

# 开发
npm run dev

# 构建
npm run build

# 打包分发
npm run package:win    # Windows (.exe)
npm run package:mac    # macOS (.zip)
npm run package:linux  # Linux (.AppImage, .deb, .rpm)
```

### 系统要求

|  | 最低 | 推荐 |
|--|-----------|-------------|
| **OS** | Windows 10, macOS 10.13, Ubuntu 18.04 | 最新 |
| **RAM** | 2 GB | 4 GB+ |
| **Lưu trữ** | 200 MB | 500 MB |

### Linux 的 RDP 依赖

```bash
# 安装 xfreerdp3 以支持 RDP
sudo apt install freerdp3-x11  # Debian/Ubuntu
sudo dnf install freerdp       # Fedora
sudo pacman -S freerdp         # Arch
```

---

## 📄 许可证

本项目采用 **GNU 通用公共许可证 v3.0**（GPL-3.0）。

这意味着：

✅ 您可以使用、修改和分发此软件  
✅ 您可以将其用于商业目的  
⚠️ 任何修改也必须在 GPL-3.0 下发布  
⚠️ 分发时必须公开源代码  
⚠️ 必须说明对代码所做的更改

查看 [LICENSE](../LICENSE) 了解完整许可文本。

---

<p align="center">
  <strong>Marix</strong><br>
  现代零知识 SSH 应用<br><br>
  <em>数据 của bạn. Trách nhiệm của bạn. Tự do của bạn.</em><br><br>
  如果您想要以隐私为代价的便利，Marix 不适合您。
</p>
