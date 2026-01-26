# Google Drive 备份设置指南

> **语言**: [🇺🇸 English](GOOGLE_DRIVE_SETUP.en.md) | [🇻🇳 Tiếng Việt](GOOGLE_DRIVE_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](GOOGLE_DRIVE_SETUP.id.md) | [🇨🇳 中文](GOOGLE_DRIVE_SETUP.zh.md) | [🇰🇷 한국어](GOOGLE_DRIVE_SETUP.ko.md) | [🇯🇵 日本語](GOOGLE_DRIVE_SETUP.ja.md) | [🇫🇷 Français](GOOGLE_DRIVE_SETUP.fr.md) | [🇩🇪 Deutsch](GOOGLE_DRIVE_SETUP.de.md) | [🇪🇸 Español](GOOGLE_DRIVE_SETUP.es.md) | [🇹🇭 ภาษาไทย](GOOGLE_DRIVE_SETUP.th.md) | [🇲🇾 Bahasa Melayu](GOOGLE_DRIVE_SETUP.ms.md) | [🇷🇺 Русский](GOOGLE_DRIVE_SETUP.ru.md) | [🇵🇭 Filipino](GOOGLE_DRIVE_SETUP.fil.md) | [🇧🇷 Português](GOOGLE_DRIVE_SETUP.pt.md)

---

## 步骤 1：创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 点击右上角的 **"新建项目"**
3. 命名您的项目：`Marix SSH Client` 或您喜欢的任何名称
4. 点击 **"创建"**

## 步骤 2：启用 Google Drive API

1. 在新创建的项目中，转到 **"API 和服务"** > **"库"**
2. 搜索 **"Google Drive API"**
3. 点击结果并按 **"启用"**

## 步骤 3：创建 OAuth 2.0 凭据

### 3.1. 配置 OAuth 同意屏幕

1. 转到 **"API 和服务"** > **"OAuth 同意屏幕"**
2. 选择 **"外部"**（允许任何 Google 账户用户）
3. 点击 **"创建"**

**应用信息：**
- 应用名称：`Marix SSH Client`
- 用户支持电子邮件：`your-email@gmail.com`
- 应用徽标：（可选）上传您的徽标
- 应用首页：`https://github.com/marixdev/marix`
- 应用隐私政策链接：（可选）
- 应用服务条款链接：（可选）

**开发者联系信息：**
- 电子邮件地址：`your-email@gmail.com`

4. 点击 **"保存并继续"**

**范围：**
5. 点击 **"添加或移除范围"**
6. 找到并选择以下范围：
   - `https://www.googleapis.com/auth/drive.file`（仅此应用创建的文件）
7. 点击 **"更新"** 和 **"保存并继续"**

**测试用户：**（仅在发布状态 = 测试中时需要）
8. 点击 **"添加用户"**
9. 输入用于测试的 Google 账户电子邮件
10. 点击 **"保存并继续"**

11. 审核并点击 **"返回信息中心"**

### 3.2. 创建 OAuth 客户端 ID

1. 转到 **"API 和服务"** > **"凭据"**
2. 点击 **"创建凭据"** > **"OAuth 客户端 ID"**
3. 选择 **"桌面应用"**（用于 Electron 应用）
4. 命名：`Marix Desktop Client`
5. 点击 **"创建"**

6. **复制客户端 ID**：点击复制图标来复制您的 Client ID
   - 您只需要 `client_id` - 不需要 client secret（使用 PKCE）
   - 在 `src/main/services/` 中创建文件 `google-credentials.json`

7. **保存客户端 ID**（使用 PKCE 无需 client_secret）：
```json
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com"
  }
}
```

## 步骤 4：在 Marix 中配置

1. 将 `google-credentials.json` 文件复制到 `src/main/services/` 文件夹
2. **重要**：添加到 `.gitignore`：
```
src/main/services/google-credentials.json
```

3. 应用将在启动时自动加载凭据

## 步骤 5：测试 OAuth 流程

1. 打开 Marix 应用
2. 转到 **设置** > **备份与还原** > **创建/还原备份**
3. 选择 **"Google Drive"** 选项卡
4. 点击 **"连接到 Google Drive"**
5. 浏览器将打开 Google OAuth 屏幕
6. 选择您的 Google 账户并授予权限
7. 应用将接收令牌并显示"已连接"

## 安全注意事项

- **请勿**将 `google-credentials.json` 提交到 Git
- 刷新令牌存储在 Electron store 中（已加密）
- 仅请求必要的最小权限
- 使用 PKCE 进行安全的 OAuth 流程（无需客户端密钥）

## 发布应用（必需）

要允许所有用户使用该应用：

1. 转到 **OAuth 同意屏幕**
2. 点击 **"发布应用"**
3. 您的应用将立即获得批准
4. 任何人都可以使用，不会出现"未验证应用"警告

## 故障排除

### 错误："Access blocked: This app's request is invalid"
- 检查 OAuth 同意屏幕是否完全配置
- 确保 redirect_uri 与设置匹配

### 错误："The OAuth client was not found"
- 验证凭据文件中的客户端 ID
- 从 Google Cloud Console 重新下载 JSON 文件

### 错误："Access denied"
- 用户拒绝授予权限
- 在 OAuth 同意屏幕中添加适当的范围
