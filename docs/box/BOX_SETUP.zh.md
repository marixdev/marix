# Box.net 备份设置指南

> **语言**: [🇺🇸 English](BOX_SETUP.en.md) | [🇻🇳 Tiếng Việt](BOX_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](BOX_SETUP.id.md) | [🇨🇳 中文](BOX_SETUP.zh.md) | [🇰🇷 한국어](BOX_SETUP.ko.md) | [🇯🇵 日本語](BOX_SETUP.ja.md) | [🇫🇷 Français](BOX_SETUP.fr.md) | [🇩🇪 Deutsch](BOX_SETUP.de.md) | [🇪🇸 Español](BOX_SETUP.es.md) | [🇹🇭 ภาษาไทย](BOX_SETUP.th.md) | [🇲🇾 Bahasa Melayu](BOX_SETUP.ms.md) | [🇷🇺 Русский](BOX_SETUP.ru.md) | [🇵🇭 Filipino](BOX_SETUP.fil.md) | [🇧🇷 Português](BOX_SETUP.pt.md)

---

## 步骤 1：创建 Box 开发者账户

1. 访问 [Box Developer Console](https://app.box.com/developers/console)
2. 使用您的 Box 账户登录（或创建新账户）
3. 点击 **"Create New App"**

## 步骤 2：创建 OAuth 2.0 应用程序

1. 选择 **"Custom App"**
2. 选择 **"User Authentication (OAuth 2.0)"**
3. 为应用命名：`Marix SSH Client` 或您喜欢的名称
4. 点击 **"Create App"**

## 步骤 3：配置应用程序设置

### 3.1. OAuth 2.0 凭证

1. 在应用设置中，转到 **"Configuration"** 选项卡
2. 记录：
   - **Client ID**
   - **Client Secret**（如果需要，点击 "Fetch Client Secret"）

### 3.2. OAuth 2.0 重定向 URI

1. 滚动到 **"OAuth 2.0 Redirect URI"**
2. 添加：`http://localhost`（Box 允许任何 localhost 端口）
3. 点击 **"Save Changes"**

### 3.3. 应用程序范围

1. 在 **"Application Scopes"** 下，确保启用以下选项：
   - ✅ Read all files and folders stored in Box
   - ✅ Write all files and folders stored in Box
2. 点击 **"Save Changes"**

## 步骤 4：在 Marix 中配置凭证

### 选项 A：本地开发

1. 在 `src/main/services/` 中创建 `box-credentials.json`：
```json
{
  "client_id": "YOUR_BOX_CLIENT_ID",
  "client_secret": "YOUR_BOX_CLIENT_SECRET"
}
```

2. **重要**：添加到 `.gitignore`：
```
src/main/services/box-credentials.json
```

### 选项 B：使用 GitHub Secrets 的 CI/CD（推荐）

1. 转到您的 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 添加这些 secrets：
   - `BOX_CLIENT_ID`：您的 Box Client ID
   - `BOX_CLIENT_SECRET`：您的 Box Client Secret
3. 构建工作流将在构建期间自动注入凭证

## 步骤 5：测试 OAuth 流程

1. 打开 Marix 应用
2. 转到 **设置** > **备份和恢复** > **创建/恢复备份**
3. 选择 **"Box"** 选项卡
4. 点击 **"连接到 Box"**
5. 浏览器将打开 Box OAuth 屏幕
6. 登录并授权
7. 应用将收到令牌并显示"已连接"

## 安全注意事项

- **不要**将 `box-credentials.json` 提交到 Git
- 使用 **GitHub Secrets** 进行 CI/CD 构建以保护 client_secret
- 令牌使用 Electron 的 safeStorage 安全存储
- PKCE 用于增强 OAuth 流程安全性
- 使用随机回调端口以避免冲突

## 应用程序批准（可选）

个人使用时，您的应用立即可用。公开分发时：

1. 转到 **"General Settings"** 选项卡
2. 如果需要，提交您的应用进行审核
3. Box 将审核并批准您的应用

## 故障排除

### 错误："Invalid client_id or client_secret"
- 验证 box-credentials.json 文件中的凭证
- 从 Box Developer Console 重新复制 Client ID 和 Client Secret

### 错误："Redirect URI mismatch"
- 确保在 Box 应用设置中添加了 `http://localhost`
- Box 支持 localhost 的动态端口

### 错误："Access denied"
- 用户拒绝授权
- 检查 Box Developer Console 中的应用程序范围
