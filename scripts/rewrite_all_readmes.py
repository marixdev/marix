#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rewrite all language README files based on English template structure
"""

import os
import re

# Read English README as base template
with open('/home/datvu/ssh/README.md', 'r', encoding='utf-8') as f:
    en_template = f.read()

# Language translations for key sections
TRANSLATIONS = {
    'vi': {
        'title': 'Marix',
        'subtitle': 'Ứng dụng SSH Zero-Knowledge Hiện đại',
        'tagline': 'Thông tin đăng nhập của bạn không bao giờ rời khỏi thiết bị. Không có cloud. Không có tracking. Không có thỏa hiệp.',
        'other_languages': '🌍 Ngôn ngữ khác',
        'who_is_for': '🎯 Marix dành cho ai?',
        'who_bullets': [
            '**Developers & DevOps engineers** quản lý nhiều server',
            '**Quản trị viên hệ thống** coi trọng bảo mật và hiệu suất',
            '**Người dùng quan tâm bảo mật** không tin tưởng các giải pháp cloud',
            '**Bất kỳ ai** muốn kiểm soát hoàn toàn thông tin SSH của mình'
        ],
        'disclaimer': '⚠️ Lưu ý quan trọng',
        'disclaimer_text': '''> **BẠN CHỊU TRÁCH NHIỆM VỚI DỮ LIỆU CỦA MÌNH.**
>
> Marix lưu trữ tất cả dữ liệu cục bộ trên thiết bị của bạn với mã hóa mạnh. Tuy nhiên:
> - **Chúng tôi không thể khôi phục dữ liệu** nếu bạn mất mật khẩu backup
> - **Chúng tôi không có server** - không có tùy chọn "quên mật khẩu"
> - **Sao lưu thường xuyên** - phần cứng có thể hỏng
> - **Bạn sở hữu bảo mật của mình** - chúng tôi cung cấp công cụ, bạn đưa ra quyết định
>
> Bằng việc sử dụng Marix, bạn chấp nhận toàn bộ trách nhiệm về bảo mật dữ liệu của mình.''',
        'zero_knowledge': '🔒 Kiến trúc Zero-Knowledge',
        'quote': '"Khóa của bạn. Server của bạn. Quyền riêng tư của bạn."',
        'core_principles': 'Nguyên tắc cốt lõi',
        'principle_offline': '**100% Offline**',
        'principle_offline_desc': 'Tất cả thông tin lưu cục bộ trên thiết bị—không bao giờ upload',
        'principle_no_cloud': '**Không có Cloud**',
        'principle_no_cloud_desc': 'Chúng tôi không có server. Dữ liệu không bao giờ chạm internet',
        'principle_no_telemetry': '**Không có Telemetry**',
        'principle_no_telemetry_desc': 'Không tracking, không analytics, không thu thập dữ liệu',
        'principle_open_source': '**Mã nguồn mở**',
        'principle_open_source_desc': 'Code hoàn toàn có thể kiểm tra dưới GPL-3.0, không có backdoor ẩn',
        'encryption_tech': 'Công nghệ mã hóa',
        'local_storage': '**Lưu trữ cục bộ**',
        'local_storage_desc': 'Thông tin mã hóa khi lưu trên thiết bị',
        'file_backup': '**File Backup**',
        'file_backup_desc': 'Export file `.marix` được mã hóa với authenticated encryption',
        'github_sync': '**GitHub Sync**',
        'github_sync_desc': 'Sao lưu cloud zero-knowledge—GitHub chỉ lưu blob mã hóa',
        'performance': '⚡ Hiệu suất & Tối ưu hóa',
        'performance_intro': 'Marix được tối ưu để chạy mượt mà trên máy cấu hình thấp:',
        'adaptive_memory': 'Quản lý bộ nhớ thích ứng',
        'system_ram': 'RAM hệ thống',
        'argon2_memory': 'Bộ nhớ Argon2id',
        'security_level': 'Mức bảo mật',
        'high': 'Cao',
        'medium': 'Trung bình',
        'optimized': 'Tối ưu cho RAM thấp',
        'auto_detect': 'Ứng dụng tự động phát hiện RAM hệ thống và điều chỉnh tham số mã hóa để đạt hiệu suất tối ưu trong khi vẫn duy trì bảo mật.',
        'runtime_opt': 'Tối ưu runtime',
        'optimization': 'Tối ưu',
        'technology': 'Công nghệ',
        'benefit': 'Lợi ích',
        'v8_heap': '**V8 Heap Limit**',
        'v8_heap_desc': 'Ngăn chặn memory bloat',
        'background_throttle': '**Background Throttling**',
        'background_throttle_desc': 'Giữ kết nối luôn hoạt động',
        'terminal_buffer': '**Terminal Buffer**',
        'terminal_buffer_desc': 'Giảm 70% bộ nhớ so với mặc định',
        'lazy_loading': '**Lazy Loading**',
        'lazy_loading_desc': 'Khởi động nhanh hơn',
        'gc_hints': '**GC Hints**',
        'gc_hints_desc': 'Giảm memory footprint',
        'tech_stack': 'Tech Stack',
        'component': 'Thành phần',
        'purpose': 'Mục đích',
        'framework': '**Framework**',
        'framework_desc': 'Ứng dụng desktop đa nền tảng',
        'terminal': '**Terminal**',
        'terminal_desc': 'Mô phỏng terminal hiệu suất cao',
        'ssh_sftp': '**SSH/SFTP**',
        'ssh_sftp_desc': 'Triển khai SSH protocol gốc',
        'code_editor': '**Code Editor**',
        'code_editor_desc': 'Syntax highlighting nhẹ',
        'encryption': '**Mã hóa**',
        'encryption_desc': 'Mã hóa client-side mạnh mẽ',
        'styling': '**Styling**',
        'styling_desc': 'CSS hiện đại, tối giản',
        'build': '**Build**',
        'build_desc': 'Bundle sản phẩm tối ưu',
        'download': '📥 Tải xuống',
        'windows': 'Windows',
        'macos': 'macOS',
        'linux': 'Linux',
        'intel_zip': 'Intel .zip',
        'apple_silicon': 'Apple Silicon',
        'features': '✨ Tính năng',
        'multi_protocol': '🔌 Kết nối đa giao thức',
        'protocol': 'Giao thức',
        'description': 'Mô tả',
        'ssh_desc': 'Secure Shell với xác thực password & private key',
        'sftp_desc': 'Quản lý file dual-pane với drag-and-drop',
        'ftp_desc': 'Hỗ trợ FTP tiêu chuẩn và bảo mật',
        'rdp_desc': 'Remote Desktop (xfreerdp3 trên Linux, mstsc trên Windows)',
        'terminal_features': '💻 Terminal',
        'terminal_feature_1': '**400+ color themes** - Từ Dracula đến Solarized, Catppuccin, Nord, và hơn thế nữa',
        'terminal_feature_2': '**Phông chữ tùy chỉnh** - Bất kỳ phông hệ thống nào, bất kỳ kích thước nào',
        'terminal_feature_3': '**Full xterm.js 6** - Mô phỏng terminal hoàn chỉnh với hỗ trợ Unicode',
        'terminal_feature_4': '**Bảo toàn phiên** - Các tab tồn tại qua các lần kết nối lại',
        'terminal_feature_5': '**Phát hiện OS** - Tự động phát hiện distro Linux & hiển thị thông tin hệ thống',
        'sftp_manager': '📁 SFTP File Manager',
        'sftp_feature_1': '**Giao diện dual-pane** - Local ↔ Remote song song',
        'sftp_feature_2': '**Editor tích hợp** - CodeMirror 6 với 15+ ngôn ngữ syntax highlighting',
        'sftp_feature_3': '**Drag & drop** - Upload/download file dễ dàng',
        'sftp_feature_4': '**Quản lý permission** - chmod với giao diện trực quan',
        'sftp_feature_5': '**Thao tác batch** - Chọn nhiều file để transfer',
        'built_in_tools': '🛠️ Công cụ tích hợp',
        'lan_file_transfer': 'LAN File Transfer',
        'lan_file_desc': '*Chia sẻ file ngay lập tức giữa các thiết bị trên mạng cục bộ.*',
        'lan_server_sharing': 'LAN Server Sharing',
        'lan_server_desc': '*Chia sẻ cấu hình server với các thiết bị gần đó một cách an toàn.*',
        'dns_tools': 'DNS & Network Tools',
        'cloudflare_dns': 'Cloudflare DNS Manager',
        'cloudflare_desc': '*Công cụ tích hợp tùy chọn để quản lý Cloudflare DNS trực tiếp từ workspace SSH của bạn.*',
        'ssh_key_manager': 'SSH Key Manager',
        'known_hosts': 'Known Hosts Manager',
        'user_experience': '🎨 Trải nghiệm người dùng',
        'ux_feature_1': '**Themes Dark & Light** - Theo hệ thống hoặc chuyển đổi thủ công',
        'ux_feature_2': '**14 ngôn ngữ** được hỗ trợ',
        'ux_feature_3': '**Gắn thẻ server** - Tổ chức với các thẻ màu',
        'ux_feature_4': '**Kết nối nhanh** - Cmd/Ctrl+K để tìm server',
        'ux_feature_5': '**Lịch sử kết nối** - Truy cập nhanh các kết nối gần đây',
        'backup_restore': '💾 Backup & Restore',
        'how_encryption_works': 'Mã hóa hoạt động như thế nào',
        'encryption_intro': 'Tất cả backup sử dụng **Argon2id** (người chiến thắng Password Hashing Competition) và **AES-256-GCM** (authenticated encryption):',
        'what_backed_up': 'Dữ liệu nào được sao lưu',
        'data': 'Dữ liệu',
        'included': 'Có',
        'encrypted': 'Mã hóa',
        'server_list': 'Danh sách server (hosts, ports, credentials)',
        'ssh_keys': 'SSH private keys',
        'cloudflare_token': 'Cloudflare API token',
        'app_settings': 'Cài đặt & preferences ứng dụng',
        'known_hosts_data': 'Known hosts',
        'security_guarantees': 'Đảm bảo bảo mật',
        'guarantee_1': '🔐 **Password không bao giờ được lưu** — Không trong file, không trên GitHub, không ở đâu cả',
        'guarantee_2': '🔒 **Zero-knowledge** — Ngay cả nhà phát triển Marix cũng không thể giải mã backup của bạn',
        'guarantee_3': '🛡️ **Kháng brute-force** — Argon2id yêu cầu 16-64MB RAM mỗi lần thử',
        'guarantee_4': '✅ **Chống giả mạo** — AES-GCM phát hiện mọi sửa đổi đối với dữ liệu mã hóa',
        'guarantee_5': '🔄 **Tương thích đa máy** — Backup lưu memory cost để có tính di động',
        'local_backup': 'Backup mã hóa cục bộ',
        'local_backup_desc': 'Export tất cả dữ liệu của bạn dưới dạng file `.marix` được mã hóa:',
        'local_step_1': '**Vào Settings** → **Backup & Restore**',
        'local_step_2': '**Tạo password** đáp ứng yêu cầu:',
        'local_req_1': 'Tối thiểu 10 ký tự',
        'local_req_2': '1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt',
        'local_step_3': '**Export** - File được mã hóa trước khi lưu',
        'local_step_4': '**Lưu trữ an toàn** - Giữ file backup và nhớ mật khẩu',
        'gdrive_backup': 'Google Drive Backup (Zero-Knowledge)',
        'gdrive_intro': 'Đồng bộ an toàn backup được mã hóa của bạn lên Google Drive:',
        'setup': 'Cài đặt',
        'setup_guide': '📘 **Hướng dẫn cài đặt**',
        'prebuilt_notice': 'ℹ️ **Phiên bản đóng gói sẵn**: Nếu bạn dùng bản build có sẵn (AppImage, RPM, v.v.), Google credentials đã được tích hợp sẵn. Bạn có thể bỏ qua bước 1 và kết nối trực tiếp.',
        'gdrive_step_1': '**Cấu hình OAuth Credentials**:',
        'gdrive_step_1a': 'Tạo Google Cloud Project',
        'gdrive_step_1b': 'Bật Google Drive API',
        'gdrive_step_1c': 'Tạo OAuth 2.0 Client ID',
        'gdrive_step_1d': 'Download file credentials JSON',
        'gdrive_step_1e': 'Lưu thành `src/main/services/google-credentials.json`',
        'gdrive_step_2': '**Kết nối trong Marix**:',
        'gdrive_step_2a': 'Vào Settings → Backup & Restore → Google Drive',
        'gdrive_step_2b': 'Click "Kết nối Google Drive"',
        'gdrive_step_2c': 'Browser mở để OAuth với Google',
        'gdrive_step_2d': 'Cấp quyền truy cập',
        'gdrive_step_2e': 'App nhận token bảo mật',
        'gdrive_step_3': '**Tạo Backup**:',
        'gdrive_step_3a': 'Nhập mật khẩu mã hóa (10+ ký tự)',
        'gdrive_step_3b': 'Click "Tạo Backup"',
        'gdrive_step_3c': 'File được upload vào thư mục "Marix Backups" trên Drive',
        'gdrive_step_4': '**Khôi phục Backup**:',
        'gdrive_step_4a': 'Click "Khôi phục từ Google Drive"',
        'gdrive_step_4b': 'Nhập mật khẩu backup',
        'gdrive_step_4c': 'Tất cả server và settings được khôi phục',
        'how_it_works': 'Cách hoạt động',
        'gdrive_guarantee_1': '✅ **Mã hóa đầu cuối** - Dữ liệu được mã hóa trước khi rời thiết bị',
        'gdrive_guarantee_2': '✅ **Zero-knowledge** - Google chỉ thấy blob mã hóa',
        'gdrive_guarantee_3': '✅ **Chỉ bạn có key** - OAuth token lưu local',
        'gdrive_guarantee_4': '✅ **Thư mục riêng** - File chỉ app của bạn truy cập được',
        'github_backup': 'GitHub Backup (Zero-Knowledge)',
        'github_intro': 'Đồng bộ an toàn backup được mã hóa của bạn lên repository GitHub private:',
        'github_step_1': '**Login với GitHub**:',
        'github_step_1a': 'Vào Settings → Backup & Restore → GitHub Backup',
        'github_step_1b': 'Click "Login với GitHub"',
        'github_step_1c': 'Mã device code sẽ xuất hiện trong app',
        'github_step_1d': 'Browser tự động mở - nhập code và authorize',
        'github_step_1e': 'Xong! Repository private `marix-backup` tự động được tạo',
        'github_step_2': '**Backup**:',
        'github_step_2a': 'Click "Backup to GitHub"',
        'github_step_2b': 'Nhập mật khẩu backup',
        'github_step_2c': 'Dữ liệu mã hóa được push lên repository',
        'github_step_3': '**Restore trên thiết bị khác**:',
        'github_step_3a': 'Cài Marix',
        'github_step_3b': 'Login với GitHub (các bước tương tự)',
        'github_step_3c': 'Click "Restore from GitHub"',
        'github_step_3d': 'Nhập mật khẩu backup để giải mã',
        'why_github_safe': 'Tại sao GitHub an toàn',
        'layer': 'Lớp',
        'protection': 'Bảo vệ',
        'client_encryption': '**Mã hóa client-side**',
        'client_encryption_desc': 'Dữ liệu mã hóa trước khi rời thiết bị',
        'argon2_kdf': '**Argon2id KDF**',
        'argon2_desc': '16-64MB memory, 3 iterations, 4 parallel lanes',
        'aes_gcm': '**AES-256-GCM**',
        'aes_desc': 'Authenticated encryption với random IV',
        'github_storage': '**GitHub storage**',
        'github_storage_desc': 'Chỉ ciphertext mã hóa được lưu',
        'no_server': '**Không có Marix server**',
        'no_server_desc': 'Giao tiếp trực tiếp client ↔ GitHub',
        'important_warning': '⚠️ **Quan trọng**: Nếu bạn mất mật khẩu backup, backup của bạn **không thể khôi phục vĩnh viễn**. Chúng tôi không thể giải mã. Không ai có thể.',
        'security_specs': '🛡️ Thông số bảo mật',
        'encryption_details': 'Chi tiết mã hóa',
        'algorithm': 'Thuật toán',
        'parameters': 'Tham số',
        'key_derivation': 'Key Derivation',
        'salt': 'Salt',
        'iv_nonce': 'IV/Nonce',
        'auth_tag': 'Auth Tag',
        'ssh_key_algos': 'Thuật toán SSH Key',
        'key_size': 'Kích thước Key',
        'use_case': 'Trường hợp sử dụng',
        'ed25519_use': 'Được khuyến nghị (nhanh, bảo mật)',
        'rsa_use': 'Tương thích legacy',
        'ecdsa_use': 'Thay thế cho Ed25519',
        'password_requirements': 'Yêu cầu mật khẩu',
        'password_intro': 'Mật khẩu backup của bạn phải chứa:',
        'pass_req_1': '✅ Tối thiểu 10 ký tự',
        'pass_req_2': '✅ Ít nhất 1 chữ hoa (A-Z)',
        'pass_req_3': '✅ Ít nhất 1 chữ thường (a-z)',
        'pass_req_4': '✅ Ít nhất 1 số (0-9)',
        'pass_req_5': '✅ Ít nhất 1 ký tự đặc biệt (!@#$%^&*...)',
        'build_from_source': '🔧 Build từ Source',
        'clone_repo': '# Clone repository',
        'install_deps': '# Cài dependencies',
        'development': '# Development',
        'build_cmd': '# Build',
        'package_dist': '# Đóng gói để phân phối',
        'system_requirements': 'Yêu cầu hệ thống',
        'minimum': 'Tối thiểu',
        'recommended': 'Khuyến nghị',
        'os': 'OS',
        'ram': 'RAM',
        'storage': 'Lưu trữ',
        'latest': 'Mới nhất',
        'linux_rdp_deps': 'Dependencies RDP cho Linux',
        'license': '📄 Giấy phép',
        'license_intro': 'Dự án này được cấp phép theo **GNU General Public License v3.0** (GPL-3.0).',
        'license_means': 'Điều này có nghĩa:',
        'license_1': '✅ Bạn có thể sử dụng, sửa đổi và phân phối phần mềm này',
        'license_2': '✅ Bạn có thể sử dụng nó cho mục đích thương mại',
        'license_3': '⚠️ Mọi sửa đổi cũng phải được phát hành dưới GPL-3.0',
        'license_4': '⚠️ Bạn phải công khai source code khi phân phối',
        'license_5': '⚠️ Bạn phải nêu rõ các thay đổi được thực hiện đối với code',
        'see_license': 'Xem [LICENSE](LICENSE) để biết toàn bộ văn bản giấy phép.',
        'footer_title': 'Marix',
        'footer_subtitle': 'Ứng dụng SSH zero-knowledge hiện đại',
        'footer_tagline': 'Dữ liệu của bạn. Trách nhiệm của bạn. Tự do của bạn.',
        'footer_warning': 'Nếu bạn muốn sự tiện lợi với cái giá là quyền riêng tư, Marix không dành cho bạn.'
    }
}

# Add more languages... (I'll create the complete translations)
# For now, let me create the Vietnamese one first as template

def generate_readme(lang='vi'):
    """Generate README for a specific language"""
    t = TRANSLATIONS.get(lang, {})
    
    if not t:
        print(f"⚠️  No translations for {lang}")
        return None
    
    # Start building the README
    readme = f'''<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">{t['title']}</h1>

<p align="center">
  <strong>{t['subtitle']}</strong>
</p>

<p align="center">
  <em>{t['tagline']}</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
  <img src="https://img.shields.io/badge/version-1.0.4-orange" alt="Version">
</p>

<p align="center">
  <a href="https://marix.dev">🌐 Website</a> •
  <a href="#-download">{t['download']}</a> •
  <a href="#-features">{t['features']}</a> •
  <a href="#-security">{t['security_specs']}</a> •
  <a href="#-languages">{t['other_languages']}</a>
</p>

---

## {t['other_languages']}

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) |
| 🇪🇸 [Español](README.es.md) | 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) |
| 🇵🇭 [Filipino](README.fil.md) | 🇧🇷 [Português](README.pt.md) | | |

---

## {t['who_is_for']}

'''
    
    # Add who is for bullets
    for bullet in t['who_bullets']:
        readme += f"- {bullet}\n"
    
    readme += f'''
---

## {t['disclaimer']}

{t['disclaimer_text']}

---

## {t['zero_knowledge']}

> **{t['quote']}**

### {t['core_principles']}

| | {t['core_principles']} | {t['description']} |
|---|-----------|-------------|
| 🔐 | {t['principle_offline']} | {t['principle_offline_desc']} |
| ☁️ | {t['principle_no_cloud']} | {t['principle_no_cloud_desc']} |
| 📊 | {t['principle_no_telemetry']} | {t['principle_no_telemetry_desc']} |
| 🔓 | {t['principle_open_source']} | {t['principle_open_source_desc']} |

### {t['encryption_tech']}

| | {t['component']} | {t['technology']} | {t['description']} |
|---|---------|------------|-------------|
| 🛡️ | {t['local_storage']} | Argon2id + AES-256 | {t['local_storage_desc']} |
| 📦 | {t['file_backup']} | Argon2id + AES-256-GCM | {t['file_backup_desc']} |
| 🔄 | {t['github_sync']} | Argon2id + AES-256-GCM | {t['github_sync_desc']} |

---

## {t['performance']}

{t['performance_intro']}

### {t['adaptive_memory']}

| {t['system_ram']} | {t['argon2_memory']} | {t['security_level']} |
|------------|-----------------|----------------|
| ≥ 8 GB | 64 MB | {t['high']} |
| ≥ 4 GB | 32 MB | {t['medium']} |
| < 4 GB | 16 MB | {t['optimized']} |

{t['auto_detect']}

### {t['runtime_opt']}

| {t['optimization']} | {t['technology']} | {t['benefit']} |
|--------------|------------|---------|
| {t['v8_heap']} | `--max-old-space-size=256MB` | {t['v8_heap_desc']} |
| {t['background_throttle']} | `--disable-renderer-backgrounding` | {t['background_throttle_desc']} |
| {t['terminal_buffer']} | Scrollback: 3,000 lines | {t['terminal_buffer_desc']} |
| {t['lazy_loading']} | On-demand component loading | {t['lazy_loading_desc']} |
| {t['gc_hints']} | Manual garbage collection triggers | {t['gc_hints_desc']} |

### {t['tech_stack']}

| {t['component']} | {t['technology']} | {t['purpose']} |
|-----------|------------|---------|
| {t['framework']} | Electron 39 + React 19 | {t['framework_desc']} |
| {t['terminal']} | xterm.js 6 | {t['terminal_desc']} |
| {t['ssh_sftp']} | ssh2 + node-pty | {t['ssh_sftp_desc']} |
| {t['code_editor']} | CodeMirror 6 | {t['code_editor_desc']} |
| {t['encryption']} | Argon2 + Node.js Crypto | {t['encryption_desc']} |
| {t['styling']} | Tailwind CSS 4 | {t['styling_desc']} |
| {t['build']} | Webpack 5 + TypeScript 5 | {t['build_desc']} |

---

## {t['download']}

<table>
<tr>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/windows-10.png" width="64"><br>
<b>{t['windows']}</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-Setup.exe">Download .exe</a>
</td>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/mac-os.png" width="64"><br>
<b>{t['macos']}</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-Intel.zip">{t['intel_zip']}</a><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-arm64.zip">{t['apple_silicon']}</a>
</td>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/linux.png" width="64"><br>
<b>{t['linux']}</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix.AppImage">.AppImage</a> •
<a href="https://github.com/user/marix/releases/latest/download/marix.deb">.deb</a> •
<a href="https://github.com/user/marix/releases/latest/download/marix.rpm">.rpm</a>
</td>
</tr>
</table>

---
'''
    
    # Add features section (using English content structure but with translated headers)
    # This is getting very long... Let me save this file and continue
    
    return readme


if __name__ == '__main__':
    print("🚀 Rewriting language README files...")
    print("📝 Starting with Vietnamese as template...")
    
    vi_readme = generate_readme('vi')
    if vi_readme:
        print(f"✅ Vietnamese: {len(vi_readme)} bytes generated")
        print("⚠️  Template created - need to complete all sections and other languages")
