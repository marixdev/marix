# Changelog

All notable changes to Marix SSH Client will be documented in this file.

## [1.0.2] - 2026-01-14

### Added
- **Box.net Cloud Backup**: New cloud backup option with OAuth authentication
  - OAuth PKCE flow for secure authentication
  - Encrypted backup storage on Box.net
  - Upload/download backup files
  - Integration with existing backup modal (4th tab)
  - Password-protected with Argon2id encryption

- **Port Knocking Security**: Advanced SSH security feature
  - TCP SYN packet sequence for pre-authentication
  - Configurable knock sequence (3+ ports)
  - Random sequence generator (7000-9999 range)
  - Auto-knock before SSH connection
  - Server-side setup guide modal
  - Comprehensive documentation included

- **Port Knocking Setup Guide Modal**: Interactive in-app guide
  - Security benefits explanation
  - Step-by-step server configuration
  - iptables/firewalld setup instructions
  - Best practices and warnings
  - Supports all 13 languages

### Changed
- Improved Port Knocking translations for better clarity
  - Vietnamese: Changed "Gõ cửa Port" to "Port Knocking" (technical term)
  - Chinese: Changed "端口敲门" to "端口敲击" (more standard)
  - Russian: Changed "Стук в порт" to "Port Knocking" (international term)
  - Thai: Improved technical accuracy
  - Portuguese, Spanish, French, German: Enhanced descriptions

- Enhanced "Learn More" button behavior
  - Opens modal directly without validation alerts
  - Added type="button" to prevent form submission
  - Improved user experience

### Fixed
- Fixed "Learn More" button triggering port validation before opening guide
- Fixed Chinese translation JSON syntax error (quote escaping)

### Translations
- Added 60+ translation keys for Port Knocking Guide in all 13 languages:
  - English, Vietnamese, Chinese, Japanese, Korean
  - Thai, Indonesian, Malay, Filipino
  - Portuguese, Spanish, French, German, Russian

### Security
- Port Knocking provides additional security layer before SSH authentication
- Zero-knowledge encryption for Box.net backups (Argon2id)
- Stealth mode: SSH port hidden from port scanners

---

## [1.0.1] - 2026-01-13

### Added
- **2FA/TOTP Generator**: New built-in two-factor authentication code generator
  - Add/edit/delete TOTP entries with custom icons
  - Bulk import support (one secret per line)
  - Auto-generate 6-digit codes with 30-second refresh
  - Visual countdown timer
  - One-click copy to clipboard
  - Persistent storage in localStorage

- **Port Forwarding**: SSH tunnel port forwarding feature
  - Local Forward (-L): Access remote services through local port
  - Remote Forward (-R): Expose local service to remote server
  - Dynamic SOCKS (-D): Create SOCKS5 proxy through SSH tunnel
  - Real-time stats (bytes transferred, connections)
  - Start/Stop individual forwards
  - Auto-save configurations

- **Enhanced Backup System**: Now includes 2FA and Port Forward data
  - Local backup supports TOTP entries and port forward configs
  - GitHub backup supports TOTP entries and port forward configs
  - Restore automatically imports all data

### Changed
- Updated backup data version to 2.1.0
- Improved button text visibility in Light mode
  - Tools menu buttons (SMTP Test, Proxy Check, Port Listener)
  - SMTP quick port buttons
  - Proxy quick port buttons (HTTP, 8080, Squid, SOCKS)
  - Port Listener protocol buttons (ALL, TCP, UDP)
  - Port Forward add button
  - Known Hosts import button

### Fixed
- Fixed button text color not being white in Light mode for selected/active states

### Translations
- Added translations for 2FA and Port Forwarding features in all 13 languages:
  - English, Vietnamese, German, Spanish, French, Japanese, Korean
  - Chinese, Russian, Portuguese, Thai, Indonesian, Malay, Filipino

---

## [1.0.0] - 2026-01-10

### Added
- Initial release of Marix SSH Client
- Multi-server management with color-coded tags
- SSH terminal with xterm.js
- SFTP file explorer with drag & drop
- Windows RDP (Remote Desktop) support
- Cloudflare DNS management
- WHOIS lookup tool
- Network tools (DNS, Ping, Traceroute, Port Check, etc.)
- SSH Key Manager (generate, import, export)
- Known Hosts management with fingerprint verification
- Encrypted backup/restore with Argon2id
- GitHub backup sync
- Dark/Light theme support
- Multi-language support (13 languages)
- IP-based automatic language detection
