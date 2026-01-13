# Changelog

All notable changes to Marix SSH Client will be documented in this file.

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
