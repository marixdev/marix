# Security Architecture

> **Marix SSH Client** - Security Documentation  
> Version: 1.0.10 | Last Updated: January 2026

This document describes the security architecture, cryptographic implementations, and data protection mechanisms used in Marix SSH Client.

---

## Table of Contents

1. [Overview](#overview)
2. [Credential Storage](#credential-storage)
3. [Backup Encryption](#backup-encryption)
4. [SSH/SFTP Security](#sshsftp-security)
5. [Known Hosts Verification](#known-hosts-verification)
6. [SSH Key Management](#ssh-key-management)
7. [OAuth & Cloud Integrations](#oauth--cloud-integrations)
8. [LAN Sharing Security](#lan-sharing-security)
9. [Electron Security Model](#electron-security-model)
10. [Cryptographic Summary](#cryptographic-summary)
11. [Security Recommendations](#security-recommendations)

---

## Overview & Threat Model

Marix is designed to provide high usability while minimizing the attack surface.

**Marix PROTECTS against:**
- Accidental credential disclosure (via shoulder surfing or plain text files).
- Local credential theft from casual malware (via OS Keychain binding).
- Backup leakage (encrypted at rest before upload).
- Offline brute-force attacks against stolen backups.
- MITM attacks via SSH host key verification.

**Marix does NOT claim protection against:**
- A malicious or fully compromised SSH server.
- Kernel-level malware (Rootkits/Keyloggers) on the local machine.
- Physical access to an unlocked device while the app is running.
- Supply-chain attacks at the OS level.

> **Disclaimer:** This is not a formal security audit. If your threat model includes nation-state adversaries, you should use OpenSSH CLI directly in a hardened environment.
---
## Credential Storage

### SecureStorage Service

All sensitive data (passwords, private keys, passphrases) are encrypted using **Electron's safeStorage API**, which leverages the operating system's native keychain:

| Platform | Backend |
|----------|---------|
| **macOS** | Keychain |
| **Windows** | DPAPI (Data Protection API) |
| **Linux** | libsecret (GNOME Keyring / KWallet) |

```
┌────────────────────────────────────────────────────────────┐
│                    SecureStorage Flow                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   Plain Password ─────────────────────────────────────►    │
│         │                                                  │
│         ▼                                                  │
│   ┌─────────────────┐                                      │
│   │ safeStorage API │                                      │
│   │   (OS Keychain) │                                      │
│   └────────┬────────┘                                      │
│            │                                               │
│            ▼                                               │
│   enc:XXXXXXXXXXXXXX (Base64 encrypted string)             │
│         │                                                  │
│         ▼                                                  │
│   Stored in electron-store (config.json)                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Key Security Properties:**

- ✅ Data encrypted on one machine **cannot** be decrypted on another
- ✅ Credentials are tied to the device and user account
- ✅ Automatic migration from plaintext on first run
- ✅ Protected fields: `password`, `privateKey`, `passphrase`

### ServerStore Implementation

```typescript
// Fields automatically encrypted/decrypted
const SENSITIVE_FIELDS = ['password', 'privateKey', 'passphrase'];

// Storage format example
{
  "id": "server-001",
  "host": "example.com",
  "username": "admin",
  "password": "enc:AQAAANCMnd8BFdERjHoAwE...",  // ← Encrypted
  "privateKey": "enc:AQAAANCMnd8BFdERjHoAwE..." // ← Encrypted
}
```

---

## Backup Encryption

### Cryptographic Specifications

| Component | Algorithm | Parameters |
|-----------|-----------|------------|
| **KDF** | Argon2id | Auto-tuned (~1s target) |
| **Encryption** | AES-256-GCM | Authenticated encryption |
| **Salt** | CSPRNG | 32 bytes per backup |
| **IV/Nonce** | CSPRNG | 16 bytes per operation |
| **Auth Tag** | GCM | 16 bytes |

### Argon2id Auto-Tuning

Marix dynamically calibrates Argon2id parameters based on the user's hardware to achieve approximately **1 second** of key derivation time. This provides consistent security regardless of machine performance.

```
┌────────────────────────────────────────────────────────────┐
│              Argon2id Auto-Tuning Algorithm                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   1. Detect System RAM                                     │
│      ├── ≥16 GB → Start at 512 MB memory                   │
│      ├── ≥8 GB  → Start at 256 MB memory                   │
│      ├── ≥4 GB  → Start at 128 MB memory                   │
│      └── <4 GB  → Start at 64 MB memory (minimum)          │
│                                                            │
│   2. Benchmark with timeCost=1                             │
│                                                            │
│   3. Adjust memory if baseline is off                      │
│      ├── Too slow (>600ms) → Reduce memory                 │
│      └── Too fast (<100ms) → Increase memory               │
│                                                            │
│   4. Scale timeCost to hit ~1000ms target                  │
│                                                            │
│   5. Fine-tune ±200ms tolerance                            │
│                                                            │
│   6. Store parameters with backup for decryption           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Security Floors (Minimum Values):**

- Memory Cost: 64 MB minimum
- Time Cost: 2 iterations minimum  
- Parallelism: min(4, CPU cores)

### Password Requirements

Backup passwords must meet strict requirements:

| Requirement | Minimum |
|-------------|---------|
| Length | 10 characters |
| Uppercase | At least 1 |
| Lowercase | At least 1 |
| Number | At least 1 |
| Special Character | At least 1 (`!@#$%^&*()_+-=[]{}...`) |

```typescript
// Password validation regex
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{10,}$/
```

### Encrypted Backup Format

```json
{
  "version": "2.2",
  "encrypted": "Base64(AES-256-GCM ciphertext)",
  "salt": "Base64(32 random bytes)",
  "iv": "Base64(16 random bytes)",
  "authTag": "Base64(16 bytes GCM tag)",
  "kdf": "argon2id",
  "memoryCost": 262144,
  "parallelism": 4,
  "timeCost": 3
}
```

**Cross-Machine Compatibility:**
- KDF parameters are stored with the backup
- Decryption uses stored parameters, not current machine's calibration
- Legacy backups (v2.0) use fixed parameters for compatibility

### Backup Data Contents

| Data Type | Encrypted in Backup |
|-----------|---------------------|
| Server credentials | ✅ Yes |
| SSH Keys (public + private) | ✅ Yes |
| 2FA TOTP secrets | ✅ Yes |
| Cloudflare API tokens | ✅ Yes |
| Port forward configs | ✅ Yes |
| Command snippets | ✅ Yes |
| Tag colors | ✅ Yes |
| Theme settings | ✅ Yes |

---

## SSH/SFTP Security

### SSH2 Library Configuration

```typescript
const connectConfig: ConnectConfig = {
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  privateKey: config.privateKey,
  passphrase: config.passphrase,
  readyTimeout: 30000,
  keepaliveInterval: 10000,
  keepaliveCountMax: 3,
};
```

### Supported Authentication Methods

| Method | Security Level | Recommendation |
|--------|---------------|----------------|
| SSH Key (Ed25519) | 🟢 Highest | **Recommended** |
| SSH Key (ECDSA) | 🟢 High | Good |
| SSH Key (RSA 4096-bit) | 🟢 High | Good |
| Password | 🟡 Medium | Use with strong passwords |

### Native SSH (PTY) Security

For terminal sessions, Marix uses the system's native SSH client via `node-pty`:

```typescript
const sshArgs = [
  '-o', 'StrictHostKeyChecking=no',
  '-o', 'UserKnownHostsFile=/dev/null',
  '-o', 'LogLevel=ERROR',
  '-p', port.toString(),
  '-i', privateKeyPath,  // If using key auth
  `${username}@${host}`
];
```

**Temporary Key Handling:**
- Private keys are written to temp files with `mode: 0o600`
- Keys are normalized (LF line endings, trailing newline)
- Temp files are cleaned up after session ends

---

## Known Hosts Verification

### Host Key Fingerprinting

Marix implements SSH host key verification to prevent MITM attacks:

```
┌────────────────────────────────────────────────────────────┐
│              Host Key Verification Flow                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   1. Connect to server                                     │
│                                                            │
│   2. Fetch host key via ssh-keyscan                        │
│      └── Preference: ed25519 > ecdsa > rsa                 │
│                                                            │
│   3. Calculate SHA256 fingerprint                          │
│                                                            │
│   4. Compare with stored fingerprint                       │
│      ├── NEW: Prompt user to trust                         │
│      ├── MATCH: Allow connection                           │
│      └── CHANGED: ⚠️ Security warning!                     │
│                                                            │
│   5. Store in ~/.marix/known_hosts.json                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Fingerprint Storage Format

```json
{
  "example.com:22": {
    "host": "example.com",
    "port": 22,
    "keyType": "ssh-ed25519",
    "fingerprint": "SHA256:AAAA...",
    "fullKey": "ssh-ed25519 AAAA...",
    "addedAt": "2026-01-21T10:00:00Z"
  }
}
```

---

## SSH Key Management

### Key Generation

Marix supports generating SSH keys via `ssh-keygen`:

| Type | Bits | Use Case |
|------|------|----------|
| **Ed25519** | 256 | Modern, recommended |
| **ECDSA** | 521 | Strong, wide support |
| **RSA** | 4096 | Legacy compatibility |

### Key Storage

- Location: `~/.marix/ssh_keys/`
- Private keys: `mode: 0o600` (owner read/write only)
- Public keys: stored alongside private
- Metadata: `ssh_keys_meta.json`

### Backup Strategy

Both public and private keys are backed up:

```typescript
exportAllKeysForBackup(): {
  id: string;
  name: string;
  type: string;
  publicKey: string;    // Full public key
  privateKey: string;   // Full private key (encrypted in backup)
  fingerprint: string;
  createdAt: string;
}[]
```

**Import Deduplication:**
- Keys are matched by fingerprint
- Duplicate keys are skipped during restore
- Preserves original key IDs and metadata

---

## OAuth & Cloud Integrations

### Supported Providers

| Provider | Auth Method | Scopes |
|----------|-------------|--------|
| **Google Drive** | OAuth 2.0 (PKCE) | `drive.file` |
| **GitHub** | Device Flow | `repo` |
| **GitLab** | OAuth 2.0 | `api` |
| **Box** | OAuth 2.0 | `root_readwrite` |

### Token Storage

OAuth tokens are stored securely:

```typescript
// GitHub tokens
class SecureStore {
  async setPassword(service, account, password) {
    const encrypted = safeStorage.encryptString(password);
    fs.writeFileSync(filePath, encrypted);
  }
}

// Google Drive tokens
// Stored in user data directory, encrypted
TOKEN_PATH = path.join(app.getPath('userData'), 'google-drive-token.json');
```

### OAuth Callback Security

Local callback server for OAuth:
- Runs on `localhost:3000` only
- Stops immediately after receiving callback
- Uses PKCE flow where supported

---

## LAN Sharing Security

### Server Discovery

- Protocol: UDP Multicast
- Address: `224.0.0.88:45678`
- Peer timeout: 30 seconds

### Device Identification

```typescript
// Stable device ID from hostname + MAC address
const deviceId = crypto.createHash('sha256')
  .update(`${hostname}-${macAddress}`)
  .digest('hex')
  .substring(0, 32);
```

### Pairing Code

- 6-digit random code for each transfer
- Must match to initiate file transfer
- Prevents unauthorized connections

### File Transfer

- Protocol: TCP (port 45679)
- Chunk size: 64 KB
- No encryption (relies on LAN trust)

⚠️ **Warning:** LAN transfers are not encrypted. Only use on trusted networks.

---

## Electron Security Model

### Current Configuration

```typescript
webPreferences: {
  nodeIntegration: true,
  contextIsolation: false,
  backgroundThrottling: false,
  spellcheck: false,
}
```

### Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
      content="script-src 'self' 'unsafe-inline';">
```

### IPC Communication

Preload script exposes minimal IPC surface:

```typescript
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, func) => ipcRenderer.on(channel, ...args),
  },
});
```

### Memory Management

- V8 memory limit: 256 MB
- Periodic cache clearing (5 minutes)
- Manual GC triggers

---

## Cryptographic Summary

| Operation | Algorithm | Key Size | Notes |
|-----------|-----------|----------|-------|
| Credential encryption | OS Keychain | Platform-dependent | safeStorage API |
| Backup KDF | Argon2id | 256-bit output | Auto-tuned |
| Backup encryption | AES-256-GCM | 256-bit | Authenticated |
| SSH key generation | Ed25519/ECDSA/RSA | 256/521/4096-bit | Via ssh-keygen |
| Host fingerprint | SHA256 | 256-bit | Via ssh-keyscan |
| Device ID | SHA256 | 256-bit | From hostname+MAC |
| Random generation | CSPRNG | N/A | crypto.randomBytes |

---

## Security Recommendations

### For Users

1. **Use SSH Keys** instead of passwords whenever possible
2. **Use strong backup passwords** (10+ chars, mixed case, numbers, symbols)
3. **Verify host fingerprints** on first connection
4. **Use Port Knocking** for additional stealth
5. **Backup regularly** to multiple cloud providers

### For Network Administrators

1. **Disable password authentication** on SSH servers
2. **Use Ed25519 keys** for best security/performance
3. **Configure fail2ban** for brute-force protection
4. **Keep OpenSSH updated** on all servers
5. **Use VPN** for sensitive LAN transfers

### Port Knocking Benefits

```
┌────────────────────────────────────────────────────────────┐
│                   Port Knocking Flow                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   1. SSH port (22) is CLOSED by default                    │
│                                                            │
│   2. Client sends TCP SYN to sequence: 7000 → 8000 → 9000  │
│                                                            │
│   3. Server daemon (knockd) detects sequence               │
│                                                            │
│   4. Firewall opens port 22 for client IP                  │
│                                                            │
│   5. Client connects via SSH                               │
│                                                            │
│   Benefits:                                                │
│   ├── Port scanners see port 22 as closed                  │
│   ├── Prevents brute-force attacks                         │
│   └── Adds stealth layer before authentication             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Reporting Security Issues

If you discover a security vulnerability in Marix, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Contact the maintainer directly
3. Provide detailed reproduction steps
4. Allow reasonable time for a fix before disclosure

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026 | Initial security implementation |
| 1.0.5 | 2026 | Added Argon2id auto-tuning |
| 1.0.10 | 2026 | Added Snippets to backup |

---



*This document is maintained as part of the Marix SSH Client project.*

