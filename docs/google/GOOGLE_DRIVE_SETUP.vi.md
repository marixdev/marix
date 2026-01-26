# Hướng Dẫn Cấu Hình Google Drive Backup

> **Ngôn ngữ**: [🇺🇸 English](GOOGLE_DRIVE_SETUP.en.md) | [🇻🇳 Tiếng Việt](GOOGLE_DRIVE_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](GOOGLE_DRIVE_SETUP.id.md) | [🇨🇳 中文](GOOGLE_DRIVE_SETUP.zh.md) | [🇰🇷 한국어](GOOGLE_DRIVE_SETUP.ko.md) | [🇯🇵 日本語](GOOGLE_DRIVE_SETUP.ja.md) | [🇫🇷 Français](GOOGLE_DRIVE_SETUP.fr.md) | [🇩🇪 Deutsch](GOOGLE_DRIVE_SETUP.de.md) | [🇪🇸 Español](GOOGLE_DRIVE_SETUP.es.md) | [🇹🇭 ภาษาไทย](GOOGLE_DRIVE_SETUP.th.md) | [🇲🇾 Bahasa Melayu](GOOGLE_DRIVE_SETUP.ms.md) | [🇷🇺 Русский](GOOGLE_DRIVE_SETUP.ru.md) | [🇵🇭 Filipino](GOOGLE_DRIVE_SETUP.fil.md) | [🇧🇷 Português](GOOGLE_DRIVE_SETUP.pt.md)

---

## Bước 1: Tạo Google Cloud Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"New Project"** ở góc trên bên phải
3. Đặt tên project: `Marix SSH Client` hoặc tên bạn muốn
4. Click **"Create"**

## Bước 2: Bật Google Drive API

1. Trong project vừa tạo, vào **"APIs & Services"** > **"Library"**
2. Tìm kiếm **"Google Drive API"**
3. Click vào kết quả và nhấn **"Enable"**

## Bước 3: Tạo OAuth 2.0 Credentials

### 3.1. Cấu hình OAuth Consent Screen

1. Vào **"APIs & Services"** > **"OAuth consent screen"**
2. Chọn **"External"** (cho phép bất kỳ ai dùng Google account)
3. Click **"Create"**

**Thông tin ứng dụng:**
- App name: `Marix SSH Client`
- User support email: `your-email@gmail.com`
- App logo: (tùy chọn) upload logo của bạn
- Application home page: `https://github.com/marixdev/marix`
- Application privacy policy link: (tùy chọn)
- Application terms of service link: (tùy chọn)

**Thông tin liên hệ nhà phát triển:**
- Email addresses: `your-email@gmail.com`

4. Click **"Save and Continue"**

**Phạm vi quyền (Scopes):**
5. Click **"Add or Remove Scopes"**
6. Tìm và chọn scope sau:
   - `https://www.googleapis.com/auth/drive.file` (chỉ các file được tạo bởi app này)
7. Click **"Update"** và **"Save and Continue"**

**Test users:** (chỉ cần khi Publishing status = Testing)
8. Click **"Add Users"**
9. Nhập email Google accounts để test
10. Click **"Save and Continue"**

11. Review và click **"Back to Dashboard"**

### 3.2. Tạo OAuth Client ID

1. Vào **"APIs & Services"** > **"Credentials"**
2. Click **"Create Credentials"** > **"OAuth client ID"**
3. Chọn **"Desktop app"** (cho ứng dụng Electron)
4. Đặt tên: `Marix Desktop Client`
5. Click **"Create"**

6. **Sao chép Client ID**: Nhấp vào biểu tượng sao chép để lấy Client ID
   - Bạn chỉ cần `client_id` - không cần client secret (sử dụng PKCE)
   - Tạo file `google-credentials.json` trong `src/main/services/`

7. **Lưu Client ID** (client_secret KHÔNG cần thiết với PKCE):
```json
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com"
  }
}
```

## Bước 4: Cấu hình trong Marix

1. Copy file `google-credentials.json` vào thư mục `src/main/services/`
2. **QUAN TRỌNG**: Thêm vào `.gitignore`:
```
src/main/services/google-credentials.json
```

3. App sẽ tự động load credentials khi khởi động

## Bước 5: Test OAuth Flow

1. Mở ứng dụng Marix
2. Vào **Settings** > **Backup & Restore** > **Tạo/Khôi Phục Backup**
3. Chọn tab **"Google Drive"**
4. Click **"Kết nối Google Drive"**
5. Trình duyệt sẽ mở với trang OAuth của Google
6. Chọn tài khoản Google và cho phép quyền truy cập
7. App sẽ nhận token và hiển thị "Đã kết nối"

## Lưu Ý Bảo Mật

- **KHÔNG** commit file `google-credentials.json` lên Git
- Refresh token được lưu trong Electron store (đã mã hóa)
- Chỉ yêu cầu quyền tối thiểu cần thiết
- PKCE được sử dụng cho OAuth flow an toàn (không cần client secret)

## Công Khai Ứng Dụng (Bắt buộc)

Để cho phép tất cả người dùng sử dụng ứng dụng:

1. Vào **OAuth consent screen**
2. Click **"Publish App"**
3. Ứng dụng của bạn sẽ được duyệt ngay lập tức
4. Mọi người có thể dùng mà không bị cảnh báo "unverified app"

## Xử Lý Sự Cố

### Lỗi: "Access blocked: This app's request is invalid"
- Kiểm tra OAuth consent screen đã cấu hình đầy đủ
- Đảm bảo redirect_uri khớp với cài đặt

### Lỗi: "The OAuth client was not found"
- Kiểm tra Client ID trong file credentials
- Download lại file JSON từ Google Cloud Console

### Lỗi: "Access denied"
- Người dùng từ chối cấp quyền
- Thêm scope phù hợp trong OAuth consent screen
