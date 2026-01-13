<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>现代零知识SSH客户端</strong>
</p>

<p align="center">
  <em>您的凭证永不离开设备。无云端。无追踪。无妥协。</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
</p>

---

## 🌍 其他语言

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇰🇷 [한국어](README.ko.md) |
| 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) | 🇪🇸 [Español](README.es.md) |
| 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) | 🇵🇭 [Filipino](README.fil.md) |
| 🇧🇷 [Português](README.pt.md) | | | |

---

## ⚠️ 免责声明

> **您对自己的数据负责。**
>
> Marix将所有数据以强加密方式本地存储在您的设备上。但是：
> - 如果您丢失备份密码，**我们无法恢复您的数据**
> - **我们没有服务器** — 没有"忘记密码"选项
> - **定期备份** — 硬件可能会故障
> - **您拥有自己的安全** — 我们提供工具，您做决定

---

## 🔒 零知识架构

### 核心原则

| | 原则 | 描述 |
|---|------|------|
| 🔐 | **100%离线** | 所有凭证本地存储—从不上传 |
| ☁️ | **无云端** | 我们没有服务器。您的数据从不接触互联网 |
| 📊 | **无遥测** | 无追踪、无分析、无数据收集 |
| 🔓 | **开源** | GPL-3.0下完全可审计的代码 |

### 加密技术

| | 功能 | 技术 | 描述 |
|---|------|------|------|
| 🛡️ | **本地存储** | Argon2id + AES-256 | 凭证在设备上静态加密 |
| 📦 | **文件备份** | Argon2id + AES-256-GCM | 导出加密的`.marix`文件 |
| 🔄 | **GitHub同步** | Argon2id + AES-256-GCM | 零知识云备份 |

---

## ⚡ 性能与优化

### 自适应内存管理

| 系统内存 | Argon2id内存 | 安全级别 |
|----------|--------------|----------|
| ≥ 8 GB | 64 MB | 高 |
| ≥ 4 GB | 32 MB | 中 |
| < 4 GB | 16 MB | 低内存优化 |

### 运行时优化

| 优化 | 技术 | 效益 |
|------|------|------|
| **V8堆限制** | `--max-old-space-size=256MB` | 防止内存膨胀 |
| **后台节流** | `--disable-renderer-backgrounding` | 保持连接活跃 |
| **终端缓冲** | 回滚：3,000行 | 减少70%内存 |
| **延迟加载** | 按需加载组件 | 更快启动 |

### 技术栈

| 组件 | 技术 | 用途 |
|------|------|------|
| **框架** | Electron 39 + React 19 | 跨平台桌面应用 |
| **终端** | xterm.js 6 | 高性能终端模拟 |
| **SSH/SFTP** | ssh2 + node-pty | 原生SSH协议实现 |
| **代码编辑器** | CodeMirror 6 | 轻量级语法高亮 |
| **加密** | Argon2 + Node.js Crypto | 军事级安全 |
| **样式** | Tailwind CSS 4 | 现代极简CSS |
| **构建** | Webpack 5 + TypeScript 5 | 优化的生产包 |

---

## 📥 下载

| 操作系统 | 下载 |
|----------|------|
| **Windows** | [下载 .exe](https://github.com/user/marix/releases/latest/download/Marix-Setup.exe) |
| **macOS** | [Intel .dmg](https://github.com/user/marix/releases/latest/download/Marix.dmg) • [Apple Silicon](https://github.com/user/marix/releases/latest/download/Marix-arm64.dmg) |
| **Linux** | [.AppImage](https://github.com/user/marix/releases/latest/download/Marix.AppImage) • [.deb](https://github.com/user/marix/releases/latest/download/marix.deb) • [.rpm](https://github.com/user/marix/releases/latest/download/marix.rpm) |

---

## ✨ 功能

### 🔌 多协议连接

| 协议 | 技术 | 描述 |
|------|------|------|
| **SSH** | ssh2 + node-pty | 支持密码和私钥认证的安全Shell |
| **SFTP** | ssh2 | 支持拖放的双面板文件管理器 |
| **FTP/FTPS** | basic-ftp | 标准和安全FTP支持 |
| **RDP** | xfreerdp3 / mstsc | 远程桌面（Linux用xfreerdp3，Windows用mstsc） |

### 💻 终端

- **400+颜色主题** — Dracula、Solarized、Catppuccin、Nord...
- **自定义字体** — 任何系统字体
- **完整xterm.js 6** — 带Unicode支持的完整终端模拟
- **会话保持** — 重连时保留标签页
- **OS检测** — 自动检测Linux发行版

### 📁 SFTP文件管理器

- **双面板界面** — 本地 ↔ 远程并排显示
- **集成编辑器** — CodeMirror 6支持15+语言语法高亮
- **拖放** — 轻松上传/下载文件
- **权限管理** — 可视化chmod界面

### 🛠️ 内置工具

- **DNS和网络**: A、AAAA、MX、TXT、SPF、CNAME、NS、SOA、PTR、Ping、Traceroute、TCP端口、HTTP/HTTPS、SMTP、黑名单、WHOIS、ARIN
- **Cloudflare DNS管理**: 管理域名、DNS记录、Cloudflare代理
- **SSH密钥管理**: 生成RSA-4096、Ed25519、ECDSA-521，导入/导出密钥
- **已知主机管理**: 查看指纹、从主机导入、删除不信任的主机

---

## 💾 备份与恢复

### 加密工作原理

所有备份使用**Argon2id**和**AES-256-GCM**军事级加密：

<p align="center">
  <img src="flow.png" alt="加密流程" width="800">
</p>

### 备份内容

| 数据 | 包含 | 加密 |
|------|------|------|
| 服务器列表 | ✅ | ✅ AES-256-GCM |
| SSH私钥 | ✅ | ✅ AES-256-GCM |
| Cloudflare API令牌 | ✅ | ✅ AES-256-GCM |
| 应用设置 | ✅ | ✅ AES-256-GCM |
| 已知主机 | ❌ | — |

### 安全保证

- 🔐 **密码从不存储** — 不在文件中，不在GitHub上
- 🔒 **零知识** — 即使开发者也无法解密
- 🛡️ **抗暴力破解** — Argon2id每次尝试需要16-64MB内存
- ✅ **防篡改** — AES-GCM检测任何修改

### GitHub备份（零知识）

1. **用GitHub登录** → 设备码出现 → 浏览器打开 → 授权 → 自动创建`marix-backup`仓库
2. **备份**: 点击"备份到GitHub" → 输入密码 → 加密数据被推送
3. **恢复**: 登录GitHub → "从GitHub恢复" → 输入密码解密

> ⚠️ **重要**: 如果丢失密码，备份**永久无法恢复**。没有人能解密它。

---

## 🛡️ 安全规格

| 组件 | 算法 | 参数 |
|------|------|------|
| 密钥派生 | Argon2id | 16-64MB内存，3次迭代，4并行 |
| 加密 | AES-256-GCM | 256位密钥，带认证 |
| 盐 | CSPRNG | 每次备份32字节 |
| IV/Nonce | CSPRNG | 每次操作16字节 |

### 密码要求

- ✅ 至少10个字符
- ✅ 至少1个大写字母（A-Z）
- ✅ 至少1个小写字母（a-z）
- ✅ 至少1个数字（0-9）
- ✅ 至少1个特殊字符（!@#$%^&*...）

---

## 🔧 从源码构建

```bash
git clone https://github.com/marixdev/marix.git
cd marix
npm install
npm run dev      # 开发
npm run build    # 构建
npm run package:linux  # 打包
```

### Linux RDP依赖

```bash
# Ubuntu/Debian
sudo apt install freerdp3-x11 xdotool

# Fedora
sudo dnf install freerdp xdotool

# Arch
sudo pacman -S freerdp xdotool
```

---

## 📄 许可证

**GNU通用公共许可证v3.0**（GPL-3.0）

---

<p align="center">
  <strong>Marix</strong> — 现代零知识SSH客户端<br>
  <em>您的数据。您的责任。您的自由。</em>
</p>
