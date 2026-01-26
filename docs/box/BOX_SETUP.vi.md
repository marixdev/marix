# Hướng Dẫn Cài Đặt Sao Lưu Box.net

> **Ngôn ngữ**: [🇺🇸 English](BOX_SETUP.en.md) | [🇻🇳 Tiếng Việt](BOX_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](BOX_SETUP.id.md) | [🇨🇳 中文](BOX_SETUP.zh.md) | [🇰🇷 한국어](BOX_SETUP.ko.md) | [🇯🇵 日本語](BOX_SETUP.ja.md) | [🇫🇷 Français](BOX_SETUP.fr.md) | [🇩🇪 Deutsch](BOX_SETUP.de.md) | [🇪🇸 Español](BOX_SETUP.es.md) | [🇹🇭 ภาษาไทย](BOX_SETUP.th.md) | [🇲🇾 Bahasa Melayu](BOX_SETUP.ms.md) | [🇷🇺 Русский](BOX_SETUP.ru.md) | [🇵🇭 Filipino](BOX_SETUP.fil.md) | [🇧🇷 Português](BOX_SETUP.pt.md)

---

## Bước 1: Tạo Tài Khoản Box Developer

1. Truy cập [Box Developer Console](https://app.box.com/developers/console)
2. Đăng nhập bằng tài khoản Box (hoặc tạo mới)
3. Nhấp **"Create New App"**

## Bước 2: Tạo Ứng Dụng OAuth 2.0

1. Chọn **"Custom App"**
2. Chọn **"User Authentication (OAuth 2.0)"**
3. Đặt tên ứng dụng: `Marix SSH Client` hoặc tên bạn muốn
4. Nhấp **"Create App"**

## Bước 3: Cấu Hình Ứng Dụng

### 3.1. Thông Tin Xác Thực OAuth 2.0

1. Trong cài đặt ứng dụng, vào tab **"Configuration"**
2. Ghi lại:
   - **Client ID**
   - **Client Secret** (nhấp "Fetch Client Secret" nếu cần)

### 3.2. OAuth 2.0 Redirect URI

1. Cuộn xuống **"OAuth 2.0 Redirect URI"**
2. Thêm: `http://localhost` (Box cho phép bất kỳ cổng localhost nào)
3. Nhấp **"Save Changes"**

### 3.3. Phạm Vi Ứng Dụng

1. Dưới **"Application Scopes"**, đảm bảo đã bật:
   - ✅ Read all files and folders stored in Box
   - ✅ Write all files and folders stored in Box
2. Nhấp **"Save Changes"**

## Bước 4: Cấu Hình Thông Tin Xác Thực Trong Marix

### Tùy Chọn A: Phát Triển Cục Bộ

1. Tạo file `box-credentials.json` trong `src/main/services/`:
```json
{
  "client_id": "YOUR_BOX_CLIENT_ID",
  "client_secret": "YOUR_BOX_CLIENT_SECRET"
}
```

2. **QUAN TRỌNG**: Thêm vào `.gitignore`:
```
src/main/services/box-credentials.json
```

### Tùy Chọn B: CI/CD với GitHub Secrets (Khuyến Nghị)

1. Vào kho GitHub của bạn → **Settings** → **Secrets and variables** → **Actions**
2. Thêm các secrets:
   - `BOX_CLIENT_ID`: Client ID của Box
   - `BOX_CLIENT_SECRET`: Client Secret của Box
3. Quy trình build sẽ tự động thêm thông tin xác thực khi build

## Bước 5: Kiểm Tra OAuth Flow

1. Mở ứng dụng Marix
2. Vào **Cài đặt** > **Sao lưu & Khôi phục** > **Tạo/Khôi phục Sao lưu**
3. Chọn tab **"Box"**
4. Nhấp **"Kết nối Box"**
5. Trình duyệt sẽ mở màn hình xác thực Box
6. Đăng nhập và cấp quyền
7. Ứng dụng sẽ nhận token và hiển thị "Đã kết nối"

## Lưu Ý Bảo Mật

- **KHÔNG** commit file `box-credentials.json` lên Git
- Sử dụng **GitHub Secrets** cho CI/CD builds để bảo vệ client_secret
- Token được lưu trữ an toàn bằng safeStorage của Electron
- PKCE được sử dụng để tăng cường bảo mật OAuth
- Cổng callback ngẫu nhiên được sử dụng để tránh xung đột

## Phê Duyệt Ứng Dụng (Tùy Chọn)

Với sử dụng cá nhân, ứng dụng hoạt động ngay. Để phân phối công khai:

1. Vào tab **"General Settings"**
2. Gửi ứng dụng để xem xét nếu cần
3. Box sẽ xem xét và phê duyệt ứng dụng của bạn

## Xử Lý Sự Cố

### Lỗi: "Invalid client_id or client_secret"
- Kiểm tra thông tin trong file box-credentials.json
- Sao chép lại Client ID và Client Secret từ Box Developer Console

### Lỗi: "Redirect URI mismatch"
- Đảm bảo `http://localhost` đã được thêm trong cài đặt ứng dụng Box
- Box hỗ trợ cổng động với localhost

### Lỗi: "Access denied"
- Người dùng từ chối cấp quyền
- Kiểm tra phạm vi ứng dụng trong Box Developer Console

### Lỗi: "Token refresh failed"
- Token có thể đã bị thu hồi
- Nhấp "Ngắt kết nối" và kết nối lại với Box

## So Sánh Box với Các Dịch Vụ Khác

| Tính năng | Box | Google Drive | GitLab |
|-----------|-----|--------------|--------|
| Dung lượng miễn phí | 10 GB | 15 GB | Không giới hạn (repos) |
| Loại OAuth | OAuth 2.0 + PKCE | OAuth 2.0 + PKCE | OAuth 2.0 + PKCE |
| Client Secret | Cần thiết | Cần thiết | Không cần |
| Độ phức tạp cài đặt | Trung bình | Trung bình | Dễ |

## Cấu Trúc File

Các bản sao lưu được lưu trong Box tại:
```
/Marix Backups/
  ├── backup_2024-01-15_10-30-00.marix
  ├── backup_2024-01-16_15-45-30.marix
  └── ...
```

Mỗi file sao lưu được mã hóa bằng Argon2id trước khi tải lên.
