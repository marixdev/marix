<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>Moderner Zero-Knowledge SSH-Client</strong>
</p>

<p align="center">
  <em>Ihre Anmeldedaten verlassen niemals Ihr Gerät. Keine Cloud. Kein Tracking. Keine Kompromisse.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
</p>

---

## 🌍 Andere Sprachen

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇪🇸 [Español](README.es.md) |
| 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) | 🇵🇭 [Filipino](README.fil.md) |
| 🇧🇷 [Português](README.pt.md) | | | |

---

## ⚠️ Disclaimer

> **Sie sind für Ihre Daten verantwortlich.**
>
> Marix speichert alle Daten lokal mit starker Verschlüsselung. Jedoch:
> - Passwort verloren = **Daten nicht wiederherstellbar**
> - **Keine Server** — keine "Passwort vergessen"-Option
> - **Regelmäßig sichern** — Hardware kann ausfallen
> - Sie kontrollieren Ihre Sicherheit

---

## 🔒 Zero-Knowledge-Architektur

### Kernprinzipien

| | Prinzip | Beschreibung |
|---|---------|--------------|
| 🔐 | **100% Offline** | Alle Anmeldedaten lokal gespeichert—nie hochgeladen |
| ☁️ | **Keine Cloud** | Wir haben keine Server. Ihre Daten berühren nie das Internet |
| 📊 | **No Telemetry** | Kein Tracking, keine Analyse, keine Datenerfassung |
| 🔓 | **Open Source** | Vollständig auditierbarer Code unter GPL-3.0 |

### Verschlüsselungstechnologie

| | Funktion | Technologie | Beschreibung |
|---|----------|-------------|--------------|
| 🛡️ | **Lokaler Speicher** | Argon2id + AES-256 | Anmeldedaten auf Ihrem Gerät verschlüsselt |
| 📦 | **Datei-Backup** | Argon2id + AES-256-GCM | Export verschlüsselter `.marix`-Dateien |
| 🔄 | **GitHub-Synchronisation** | Argon2id + AES-256-GCM | Zero-Knowledge Cloud-Backup |

---

## ⚡ Leistung & Optimierung

### Adaptives Speichermanagement

| System-RAM | Argon2id-Speicher | Sicherheitsstufe |
|------------|-------------------|------------------|
| ≥ 8 GB | 64 MB | Hoch |
| ≥ 4 GB | 32 MB | Mittel |
| < 4 GB | 16 MB | Für wenig Speicher optimiert |

### Laufzeit-Optimierungen

| Optimierung | Technologie | Vorteil |
|-------------|-------------|---------|
| **V8-Heap-Limit** | `--max-old-space-size=256MB` | Verhindert Speicheraufblähung |
| **Hintergrund-Throttling** | `--disable-renderer-backgrounding` | Hält Verbindungen aktiv |
| **Terminal-Puffer** | Scrollback: 3.000 Zeilen | 70% Speicherreduzierung |
| **Lazy Loading** | Komponenten bei Bedarf laden | Schnellerer Start |

### Tech-Stack

| Komponente | Technologie | Zweck |
|------------|-------------|-------|
| **Framework** | Electron 39 + React 19 | Plattformübergreifende Desktop-App |
| **Terminal** | xterm.js 6 | Hochleistungs-Terminal-Emulation |
| **SSH/SFTP** | ssh2 + node-pty | Native SSH-Protokoll-Implementierung |
| **Code-Editor** | CodeMirror 6 | Leichtes Syntax-Highlighting |
| **Verschlüsselung** | Argon2 + Node.js Crypto | Starke client-side encryption |
| **Styling** | Tailwind CSS 4 | Modernes, minimales CSS |
| **Build** | Webpack 5 + TypeScript 5 | Optimierte Produktions-Bundles |

---

## 📥 Download

| OS | Download |
|----|----------|
| **Windows** | [.exe herunterladen](https://github.com/user/marix/releases/latest/download/Marix-Setup.exe) |
| **macOS** | [Intel .dmg](https://github.com/user/marix/releases/latest/download/Marix.dmg) • [Apple Silicon](https://github.com/user/marix/releases/latest/download/Marix-arm64.dmg) |
| **Linux** | [.AppImage](https://github.com/user/marix/releases/latest/download/Marix.AppImage) • [.deb](https://github.com/user/marix/releases/latest/download/marix.deb) • [.rpm](https://github.com/user/marix/releases/latest/download/marix.rpm) |

---

## ✨ Funktionen

### 🔌 Multi-Protokoll-Verbindungen

| Protokoll | Technologie | Beschreibung |
|-----------|-------------|--------------|
| **SSH** | ssh2 + node-pty | Secure Shell mit Passwort- & Private-Key-Authentifizierung |
| **SFTP** | ssh2 | Dual-Panel-Dateimanager mit Drag-and-Drop |
| **FTP/FTPS** | basic-ftp | Standard- und sichere FTP-Unterstützung |
| **RDP** | xfreerdp3 / mstsc | Remote Desktop (xfreerdp3 auf Linux, mstsc auf Windows) |

### 💻 Terminal

- **400+ Farbthemen** — Dracula, Solarized, Catppuccin, Nord...
- **Benutzerdefinierte Schriften** — Jede Systemschrift
- **Vollständiges xterm.js 6** — Komplette Terminal-Emulation mit Unicode-Unterstützung
- **Sitzungserhaltung** — Tabs bleiben bei Reconnect erhalten
- **OS-Erkennung** — Automatische Erkennung der Linux-Distribution

### 📁 SFTP-Dateimanager

- **Dual-Panel-Oberfläche** — Lokal ↔ Remote nebeneinander
- **Integrierter Editor** — CodeMirror 6 mit Syntax-Highlighting für 15+ Sprachen
- **Drag & Drop** — Einfaches Upload/Download von Dateien
- **Berechtigungsverwaltung** — Visuelle chmod-Oberfläche

### 🛠️ Integrierte Werkzeuge

- **DNS & Netzwerk**: A, AAAA, MX, TXT, SPF, CNAME, NS, SOA, PTR, Ping, Traceroute, TCP-Port, HTTP/HTTPS, SMTP, Blacklist, WHOIS, ARIN
- **Cloudflare DNS-Manager**: Verwaltung von Domains, DNS-Einträgen, Cloudflare-Proxy
- **SSH-Schlüsselmanager**: RSA-4096, Ed25519, ECDSA-521 generieren, Schlüssel importieren/exportieren
- **Known Hosts Manager**: Fingerabdrücke anzeigen, von Host importieren, nicht vertrauenswürdige Hosts entfernen

---

## 💾 Backup & Wiederherstellung

### Wie Verschlüsselung funktioniert

Alle Backups verwenden **Argon2id** und **AES-256-GCM**:

<p align="center">
  <img src="flow.png" alt="Verschlüsselungsfluss" width="800">
</p>

### Was gesichert wird

| Daten | Enthalten | Verschlüsselt |
|-------|-----------|---------------|
| Serverliste | ✅ | ✅ AES-256-GCM |
| SSH Private Keys | ✅ | ✅ AES-256-GCM |
| Cloudflare API Token | ✅ | ✅ AES-256-GCM |
| App-Einstellungen | ✅ | ✅ AES-256-GCM |
| Known Hosts | ❌ | — |

### Sicherheitsgarantien

- 🔐 **Passwort nie gespeichert** — Nicht in der Datei, nicht auf GitHub
- 🔒 **Zero-Knowledge** — Selbst Entwickler können nicht entschlüsseln
- 🛡️ **Brute-Force-resistent** — Argon2id benötigt 16-64 MB RAM pro Versuch
- ✅ **Manipulationssicher** — AES-GCM erkennt jede Änderung

### GitHub-Backup (Zero-Knowledge)

1. **Mit GitHub anmelden** → Gerätecode erscheint → Browser öffnet → Autorisieren → `marix-backup` Repository wird automatisch erstellt
2. **Backup**: Klicken Sie "Auf GitHub sichern" → Passwort eingeben → Verschlüsselte Daten werden gepusht
3. **Wiederherstellung**: GitHub-Anmeldung → "Von GitHub wiederherstellen" → Passwort zur Entschlüsselung eingeben

> ⚠️ **Wichtig**: Wenn Sie Ihr Backup-Passwort verlieren, ist Ihr Backup **dauerhaft unwiederbringlich**. Niemand kann es entschlüsseln.

---

## 🛡️ Sicherheitsspezifikationen

| Komponente | Algorithmus | Parameter |
|------------|-------------|-----------|
| Schlüsselableitung | Argon2id | 16-64 MB Speicher, 3 Iterationen, 4 Bahnen |
| Verschlüsselung | AES-256-GCM | 256-Bit-Schlüssel, authentifiziert |
| Salt | CSPRNG | 32 Bytes pro Backup |
| IV/Nonce | CSPRNG | 16 Bytes pro Operation |

### Passwortanforderungen

- ✅ Mindestens 10 Zeichen
- ✅ Mindestens 1 Großbuchstabe (A-Z)
- ✅ Mindestens 1 Kleinbuchstabe (a-z)
- ✅ Mindestens 1 Ziffer (0-9)
- ✅ Mindestens 1 Sonderzeichen (!@#$%^&*...)

---

## 🔧 Aus Quellcode bauen

```bash
git clone https://github.com/marixdev/marix.git
cd marix
npm install
npm run dev      # Entwicklung
npm run build    # Bauen
npm run package:linux  # Paketieren
```

### Linux RDP-Abhängigkeiten

```bash
# Ubuntu/Debian
sudo apt install freerdp3-x11 xdotool

# Fedora
sudo dnf install freerdp xdotool

# Arch
sudo pacman -S freerdp xdotool
```

---

## 📄 Lizenz

**GNU General Public License v3.0** (GPL-3.0)

---

<p align="center">
  <strong>Marix</strong> — Moderner Zero-Knowledge SSH-Client<br>
  <em>Ihre Daten. Ihre Verantwortung. Ihre Freiheit.</em>
</p>
