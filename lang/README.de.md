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
  <img src="https://img.shields.io/badge/version-1.0.4-orange" alt="Version">
</p>

<p align="center">
  <a href="https://marix.dev">🌐 Website</a> •
  <a href="#-download">Download</a> •
  <a href="#-funktionen">Funktionen</a> •
  <a href="#-sicherheit">Sicherheit</a> •
  <a href="#-sprachen">Sprachen</a>
</p>

---

## 🌍 Andere Sprachen

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) |
| 🇪🇸 [Español](README.es.md) | 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) |
| 🇵🇭 [Filipino](README.fil.md) | 🇧🇷 [Português](README.pt.md) | | |

---

## 🎯 Für wen ist Marix?

- **Entwickler und DevOps-Ingenieure** - Die mehrere Server verwalten
- **Systemadministratoren** - Die Sicherheit und Effizienz priorisieren
- **Sicherheitsbewusste Benutzer** - Die Cloud-Lösungen nicht vertrauen
- **Alle** - Die vollständige Kontrolle über ihre SSH-Anmeldedaten wollen

---

## ⚠️ Haftungsausschluss

> **Sie sind für Ihre Daten verantwortlich.**
>
> Marix speichert alle Daten lokal mit starker Verschlüsselung. Jedoch:
> - Wenn Sie Ihr Backup-Passwort verlieren, **sind Ihre Daten nicht wiederherstellbar**
> - **Kein Server** - keine "Passwort vergessen"-Option
> - **Regelmäßig sichern** - Hardware kann ausfallen
> - **Sicherheit liegt bei Ihnen** - wir stellen die Werkzeuge bereit, Sie treffen die Entscheidungen
>
> Durch die Nutzung von Marix akzeptieren Sie die volle Verantwortung für die Sicherheit Ihrer Daten.

---

## 🔒 Zero-Knowledge-Architektur

> **„Ihre Schlüssel. Ihre Server. Ihre Privatsphäre."**

### Grundprinzipien

| | Prinzip | Beschreibung |
|---|---------|--------------|
| 🔐 | **100% Offline** | Alle Anmeldedaten werden lokal auf Ihrem Gerät gespeichert—niemals hochgeladen |
| ☁️ | **Keine Cloud** | Keine Server. Ihre Daten berühren nie das Internet |
| 📊 | **Keine Telemetrie** | Kein Tracking, keine Analysen, keine Datensammlung |
| 🔓 | **Open Source** | Vollständig prüfbarer Code unter GPL-3.0, keine versteckten Hintertüren |

### Verschlüsselungstechnologien

| | Funktion | Technologie | Beschreibung |
|---|----------|-------------|--------------|
| 🛡️ | **Lokale Speicherung** | Argon2id + AES-256 | Verschlüsselt Anmeldedaten auf dem Gerät |
| 📦 | **Datei-Backup** | Argon2id + AES-256-GCM | Exportiert als `.marix`-Dateien mit authentifizierter Verschlüsselung |
| 🔄 | **GitHub-Sync** | Argon2id + AES-256-GCM | Zero-Knowledge Cloud-Backup—GitHub speichert nur verschlüsselte Blobs |

---

## ⚡ Leistung und Optimierung

Marix ist optimiert, um auch auf schwächeren Maschinen reibungslos zu laufen:

### Adaptive Speicherverwaltung

| System-RAM | Argon2id-Speicher | Sicherheitsstufe |
|------------|-------------------|------------------|
| ≥ 8 GB | 64 MB | Hoch |
| ≥ 4 GB | 32 MB | Mittel |
| < 4 GB | 16 MB | Niedrigspeicher-optimiert |

Die App erkennt automatisch den System-RAM und passt die Verschlüsselungsparameter für optimale Leistung bei gleichbleibender Sicherheit an.

### Laufzeit-Optimierungen

| Optimierung | Technik | Vorteil |
|-------------|---------|---------|
| **V8 Heap-Limit** | `--max-old-space-size=256MB` | Verhindert Speicheraufblähung |
| **Hintergrund-Drosselung** | `--disable-renderer-backgrounding` | Hält Verbindungen aufrecht |
| **Terminal-Puffer** | Scrollback: 3.000 Zeilen | 70% weniger Speicher als Standard |
| **Lazy Loading** | On-Demand Komponenten-Laden | Schnellerer Start |
| **GC-Hinweise** | Manuelle GC-Auslösung | Reduzierter Speicherbedarf |

### Tech-Stack

| Komponente | Technologie | Zweck |
|------------|-------------|-------|
| **Framework** | Electron 39 + React 19 | Plattformübergreifende Desktop-App |
| **Terminal** | xterm.js 6 | Hochleistungs-Terminalemulation |
| **SSH/SFTP** | ssh2 + node-pty | Native SSH-Protokollimplementierung |
| **Code-Editor** | CodeMirror 6 | Leichtgewichtige Syntaxhervorhebung |
| **Verschlüsselung** | Argon2 + Node.js Crypto | Starke clientseitige Verschlüsselung |
| **Styling** | Tailwind CSS 4 | Modernes, minimales CSS |
| **Build** | Webpack 5 + TypeScript 5 | Optimiertes Produktionsbündel |

---

## 📥 Download

<table>
<tr>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/windows-10.png" width="64"><br>
<b>Windows</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-Setup.exe">Download .exe</a>
</td>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/mac-os.png" width="64"><br>
<b>macOS</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-Intel.zip">Intel .zip</a><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-arm64.zip">Apple Silicon</a>
</td>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/linux.png" width="64"><br>
<b>Linux</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix.AppImage">.AppImage</a> •
<a href="https://github.com/user/marix/releases/latest/download/marix.deb">.deb</a> •
<a href="https://github.com/user/marix/releases/latest/download/marix.rpm">.rpm</a>
</td>
</tr>
</table>

---

## ✨ Funktionen

### 🔌 Multi-Protokoll-Verbindungen

| Protokoll | Beschreibung |
|-----------|--------------|
| **SSH** | Secure Shell mit Passwort- und Private-Key-Authentifizierung |
| **SFTP** | Zweifenster-Dateimanager mit Drag-and-Drop |
| **FTP/FTPS** | Standard- und sicherer FTP-Support |
| **RDP** | Remote-Desktop (xfreerdp3 unter Linux, mstsc unter Windows) |

### 💻 Terminal

- **400+ Farbthemen** - Von Dracula bis Solarized, Catppuccin, Nord und mehr
- **Anpassbare Schriften** - Jede Systemschrift, jede Größe
- **Vollständiges xterm.js 6** - Komplette Terminalemulation mit Unicode-Unterstützung
- **Sitzungspersistenz** - Tabs bleiben nach Neuverbindung erhalten
- **OS-Erkennung** - Erkennt automatisch die Linux-Distribution & zeigt Systeminfos an

### 📁 SFTP-Dateimanager

- **Zweifenster-Interface** - Lokal ↔ Remote nebeneinander
- **Integrierter Editor** - CodeMirror 6 mit Syntaxhervorhebung für 15+ Sprachen
- **Drag-and-Drop** - Dateien einfach hoch-/herunterladen
- **Berechtigungsverwaltung** - chmod mit visueller Oberfläche
- **Stapeloperationen** - Mehrere Dateien für Übertragung auswählen

### 🛠️ Integrierte Werkzeuge

#### LAN-Dateiübertragung
*Sofortiger Dateiaustausch zwischen Geräten im lokalen Netzwerk.*

#### LAN-Server-Sharing
*Serverkonfigurationen sicher mit Geräten in der Nähe teilen.*

#### DNS- & Netzwerk-Tools
- DNS-Abfrage
- WHOIS-Abfragen
- Port-Scanner
- Traceroute

#### Cloudflare DNS-Manager
*Optionales integriertes Tool zur Verwaltung von Cloudflare DNS direkt aus Ihrem SSH-Arbeitsbereich.*

#### SSH-Schlüssel-Manager
- SSH-Schlüsselpaare generieren (Ed25519, RSA, ECDSA)
- Schlüssel importieren/exportieren
- Known Hosts verwalten

#### Known Hosts Manager
- Known Hosts anzeigen und verwalten
- Alte Fingerabdrücke entfernen
- Known Hosts exportieren/importieren

### 🎨 Benutzererlebnis

- **Dunkles & helles Theme** - System folgen oder manuell wechseln
- **14 Sprachen** unterstützt
- **Server-Tags** - Mit Farbtags organisieren
- **Schnellverbindung** - Cmd/Ctrl+K zum Suchen von Servern
- **Verbindungsverlauf** - Schnellzugriff auf kürzliche Verbindungen

---

## 💾 Backup und Wiederherstellung

### Wie die Verschlüsselung funktioniert

Alle Backups verwenden **Argon2id** (Gewinner der Password Hashing Competition) und **AES-256-GCM** (authentifizierte Verschlüsselung):

```
Passwort → Argon2id(16-64MB Speicher) → 256-bit Schlüssel → AES-256-GCM → Verschlüsseltes Backup
```

### Gesicherte Daten

| Daten | Enthalten | Verschlüsselt |
|-------|-----------|---------------|
| Serverliste (Host, Port, Anmeldedaten) | ✅ | ✅ |
| SSH-Privatschlüssel | ✅ | ✅ |
| Cloudflare API-Tokens | ✅ | ✅ |
| App-Einstellungen & Präferenzen | ✅ | ✅ |
| Known Hosts | ✅ | ✅ |

### Sicherheitsgarantien

🔐 **Passwort wird nie gespeichert** — nicht in der Datei, nicht auf GitHub, nirgends  
🔒 **Zero-Knowledge** — selbst Marix-Entwickler können Ihre Backups nicht entschlüsseln  
🛡️ **Bruteforce-resistent** — Argon2id benötigt 16-64MB RAM pro Versuch  
✅ **Manipulationssicher** — AES-GCM erkennt jede Änderung an verschlüsselten Daten  
🔄 **Cross-Machine-kompatibel** — Backups speichern Speicherkosten für Portabilität

---

### Lokales verschlüsseltes Backup

Exportieren Sie alle Ihre Daten als verschlüsselte `.marix`-Datei:

1. **Gehe zu Einstellungen** → **Backup und Wiederherstellung**
2. **Passwort erstellen** (Anforderungen erfüllen):
   - Mindestens 10 Zeichen
   - 1 Großbuchstabe, 1 Kleinbuchstabe, 1 Ziffer, 1 Sonderzeichen
3. **Exportieren** - die Datei wird vor dem Speichern verschlüsselt
4. **Sicher aufbewahren** - Backup-Datei aufbewahren, Passwort merken

---

### Google Drive Backup (Zero-Knowledge)

Verschlüsselte Backups sicher mit Google Drive synchronisieren:

#### Einrichtung

📘 **Einrichtungsanleitung**: Siehe [docs/google/GOOGLE_DRIVE_SETUP.de.md](../docs/google/GOOGLE_DRIVE_SETUP.de.md)

ℹ️ **Vorgefertigte Versionen**: Wenn Sie vorgefertigte Releases verwenden (AppImage, RPM usw.), sind die Google-Anmeldedaten bereits enthalten. Sie können Schritt 1 überspringen und sich direkt verbinden.

1. **OAuth-Anmeldedaten einrichten**:
   - Google Cloud-Projekt erstellen
   - Google Drive API aktivieren
   - OAuth 2.0 Client-ID erstellen
   - Anmeldedaten-JSON herunterladen
   - Als `src/main/services/google-credentials.json` speichern

2. **In Marix verbinden**:
   - Gehe zu Einstellungen → Backup und Wiederherstellung → Google Drive
   - Klicke "Mit Google Drive verbinden"
   - Browser öffnet sich für Google OAuth
   - Berechtigungen erteilen
   - App erhält sicheren Token

3. **Backup erstellen**:
   - Verschlüsselungspasswort eingeben (10+ Zeichen)
   - "Backup erstellen" klicken
   - Datei wird in "Marix Backups"-Ordner auf Drive hochgeladen

4. **Backup wiederherstellen**:
   - "Von Google Drive wiederherstellen" klicken
   - Backup-Passwort eingeben
   - Alle Server und Einstellungen werden wiederhergestellt

#### Wie es funktioniert

✅ **Ende-zu-Ende-Verschlüsselung** - Daten werden vor dem Verlassen Ihres Geräts verschlüsselt  
✅ **Zero-Knowledge** - Google sieht nur verschlüsselte Blobs  
✅ **Nur Sie haben den Schlüssel** - OAuth-Token wird lokal gespeichert  
✅ **Privater Ordner** - Dateien sind nur von Ihrer App aus zugänglich

---

### GitHub Backup (Zero-Knowledge)

Verschlüsselte Backups sicher mit privatem GitHub-Repository synchronisieren:

#### Einrichtung

1. **Mit GitHub anmelden**:
   - Gehe zu Einstellungen → Backup und Wiederherstellung → GitHub Backup
   - Klicke "Mit GitHub anmelden"
   - Ein Gerätecode erscheint in der App
   - Browser öffnet sich automatisch - Code zur Authentifizierung eingeben
   - Fertig! Ein privates Repository `marix-backup` wird automatisch erstellt

2. **Backup**:
   - "Auf GitHub sichern" klicken
   - Backup-Passwort eingeben
   - Verschlüsselte Daten werden ins Repository gepusht

3. **Auf anderem Gerät wiederherstellen**:
   - Marix installieren
   - Mit GitHub anmelden (gleiche Schritte)
   - "Von GitHub wiederherstellen" klicken
   - Backup-Passwort zur Entschlüsselung eingeben

#### Warum GitHub sicher ist

| Schicht | Schutz |
|---------|--------|
| **Clientseitige Verschlüsselung** | Daten werden vor dem Verlassen des Geräts verschlüsselt |
| **Argon2id KDF** | 16-64MB Speicher, 3 Iterationen, 4 parallele Bahnen |
| **AES-256-GCM** | Authentifizierte Verschlüsselung mit zufälligem IV |
| **GitHub-Speicher** | Speichert nur verschlüsselten Chiffretext |
| **Kein Marix-Server** | Client ↔ GitHub direkter Austausch |

⚠️ **Wichtig**: Wenn Sie Ihr Backup-Passwort verlieren, sind Ihre Backups **dauerhaft unwiederbringlich**. Wir können sie nicht entschlüsseln. Niemand kann das.

---

## 🛡️ Sicherheitsspezifikationen

### Verschlüsselungsdetails

| Algorithmus | Parameter |
|-------------|-----------|
| **Schlüsselableitung** | Argon2id (Speicher: 16-64MB, Iterationen: 3, Parallelismus: 4) |
| **Symmetrische Verschlüsselung** | AES-256-GCM |
| **Salt** | 32 Bytes (kryptographisch zufällig) |
| **IV/Nonce** | 16 Bytes (einzigartig pro Verschlüsselung) |
| **Authentifizierungs-Tag** | 16 Bytes (GCM auth tag) |

### SSH-Schlüssel-Algorithmen

| Algorithmus | Schlüsselgröße | Verwendung |
|-------------|----------------|------------|
| **Ed25519** | 256-bit | Empfohlen (schnell, sicher) |
| **RSA** | 2048-4096-bit | Legacy-Kompatibilität |
| **ECDSA** | 256-521-bit | Alternative zu Ed25519 |

### Passwortanforderungen

Backup-Passwörter müssen haben:

✅ Mindestens 10 Zeichen  
✅ Mindestens 1 Großbuchstabe (A-Z)  
✅ Mindestens 1 Kleinbuchstabe (a-z)  
✅ Mindestens 1 Ziffer (0-9)  
✅ Mindestens 1 Sonderzeichen (!@#$%^&*...)

---

## 🔧 Aus Quellcode bauen

```bash
# Repository klonen
git clone https://github.com/user/marix.git
cd marix

# Abhängigkeiten installieren
npm install

# Entwicklung
npm run dev

# Bauen
npm run build

# Für Distribution verpacken
npm run package:win    # Windows (.exe)
npm run package:mac    # macOS (.zip)
npm run package:linux  # Linux (.AppImage, .deb, .rpm)
```

### Systemanforderungen

|  | Minimum | Empfohlen |
|--|---------|-----------|
| **OS** | Windows 10, macOS 10.13, Ubuntu 18.04 | Neueste Version |
| **RAM** | 2 GB | 4 GB+ |
| **Speicher** | 200 MB | 500 MB |

### RDP-Abhängigkeiten für Linux

```bash
# xfreerdp3 für RDP-Support installieren
sudo apt install freerdp3-x11  # Debian/Ubuntu
sudo dnf install freerdp       # Fedora
sudo pacman -S freerdp         # Arch
```

---

## 📄 Lizenz

Dieses Projekt ist unter der **GNU General Public License v3.0** (GPL-3.0) lizenziert.

Das bedeutet:

✅ Sie können diese Software verwenden, modifizieren und verteilen  
✅ Sie können sie für kommerzielle Zwecke nutzen  
⚠️ Alle Änderungen müssen ebenfalls unter GPL-3.0 veröffentlicht werden  
⚠️ Sie müssen den Quellcode bei der Verteilung verfügbar machen  
⚠️ Sie müssen am Code vorgenommene Änderungen angeben

Siehe [LICENSE](../LICENSE) für den vollständigen Lizenztext.

---

<p align="center">
  <strong>Marix</strong><br>
  Moderner Zero-Knowledge SSH-Client<br><br>
  <em>Ihre Daten. Ihre Verantwortung. Ihre Freiheit.</em><br><br>
  Wenn Sie Bequemlichkeit auf Kosten Ihrer Privatsphäre wollen, ist Marix nichts für Sie.
</p>
