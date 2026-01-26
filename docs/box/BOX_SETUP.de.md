# Box.net Backup-Einrichtungsanleitung

> **Sprachen**: [🇺🇸 English](BOX_SETUP.en.md) | [🇻🇳 Tiếng Việt](BOX_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](BOX_SETUP.id.md) | [🇨🇳 中文](BOX_SETUP.zh.md) | [🇰🇷 한국어](BOX_SETUP.ko.md) | [🇯🇵 日本語](BOX_SETUP.ja.md) | [🇫🇷 Français](BOX_SETUP.fr.md) | [🇩🇪 Deutsch](BOX_SETUP.de.md) | [🇪🇸 Español](BOX_SETUP.es.md) | [🇹🇭 ภาษาไทย](BOX_SETUP.th.md) | [🇲🇾 Bahasa Melayu](BOX_SETUP.ms.md) | [🇷🇺 Русский](BOX_SETUP.ru.md) | [🇵🇭 Filipino](BOX_SETUP.fil.md) | [🇧🇷 Português](BOX_SETUP.pt.md)

---

## Schritt 1: Box-Entwicklerkonto erstellen

1. Gehen Sie zur [Box Developer Console](https://app.box.com/developers/console)
2. Melden Sie sich mit Ihrem Box-Konto an (oder erstellen Sie eines)
3. Klicken Sie auf **"Create New App"**

## Schritt 2: OAuth 2.0-Anwendung erstellen

1. Wählen Sie **"Custom App"**
2. Wählen Sie **"User Authentication (OAuth 2.0)"**
3. Benennen Sie Ihre App: `Marix SSH Client` oder einen beliebigen Namen
4. Klicken Sie auf **"Create App"**

## Schritt 3: Anwendungseinstellungen konfigurieren

### 3.1. OAuth 2.0-Anmeldedaten

1. Gehen Sie in den App-Einstellungen zur Registerkarte **"Configuration"**
2. Notieren Sie:
   - **Client ID**
   - **Client Secret** (klicken Sie bei Bedarf auf "Fetch Client Secret")

### 3.2. OAuth 2.0 Redirect URI

1. Scrollen Sie zu **"OAuth 2.0 Redirect URI"**
2. Fügen Sie hinzu: `http://localhost` (Box erlaubt jeden localhost-Port)
3. Klicken Sie auf **"Save Changes"**

### 3.3. Anwendungsbereiche

1. Stellen Sie unter **"Application Scopes"** sicher, dass diese aktiviert sind:
   - ✅ Read all files and folders stored in Box
   - ✅ Write all files and folders stored in Box
2. Klicken Sie auf **"Save Changes"**

## Schritt 4: Anmeldedaten in Marix konfigurieren

### Option A: Lokale Entwicklung

1. Erstellen Sie `box-credentials.json` in `src/main/services/`:
```json
{
  "client_id": "YOUR_BOX_CLIENT_ID",
  "client_secret": "YOUR_BOX_CLIENT_SECRET"
}
```

2. **WICHTIG**: Zu `.gitignore` hinzufügen:
```
src/main/services/box-credentials.json
```

### Option B: CI/CD mit GitHub Secrets (Empfohlen)

1. Gehen Sie zu Ihrem GitHub-Repository → **Settings** → **Secrets and variables** → **Actions**
2. Fügen Sie diese Secrets hinzu:
   - `BOX_CLIENT_ID`: Ihre Box Client ID
   - `BOX_CLIENT_SECRET`: Ihr Box Client Secret
3. Der Build-Workflow wird die Anmeldedaten automatisch während des Builds einfügen

## Schritt 5: OAuth-Flow testen

1. Öffnen Sie die Marix-App
2. Gehen Sie zu **Einstellungen** > **Backup & Wiederherstellung** > **Backup erstellen/wiederherstellen**
3. Wählen Sie die Registerkarte **"Box"**
4. Klicken Sie auf **"Mit Box verbinden"**
5. Der Browser öffnet den Box OAuth-Bildschirm
6. Melden Sie sich an und erteilen Sie Berechtigungen
7. Die App erhält das Token und zeigt "Verbunden" an

## Sicherheitshinweise

- `box-credentials.json` **NICHT** in Git committen
- Verwenden Sie **GitHub Secrets** für CI/CD-Builds zum Schutz des client_secret
- Token werden sicher mit Electrons safeStorage gespeichert
- PKCE wird für zusätzliche OAuth-Flow-Sicherheit verwendet
- Zufällige Callback-Ports werden verwendet, um Konflikte zu vermeiden

## App-Genehmigung (Optional)

Für den persönlichen Gebrauch funktioniert Ihre App sofort. Für öffentliche Verteilung:

1. Gehen Sie zur Registerkarte **"General Settings"**
2. Reichen Sie Ihre App bei Bedarf zur Überprüfung ein
3. Box wird Ihre App überprüfen und genehmigen

## Fehlerbehebung

### Fehler: "Invalid client_id or client_secret"
- Überprüfen Sie die Anmeldedaten in Ihrer box-credentials.json-Datei
- Kopieren Sie Client ID und Client Secret erneut aus der Box Developer Console

### Fehler: "Redirect URI mismatch"
- Stellen Sie sicher, dass `http://localhost` in den Box-App-Einstellungen hinzugefügt wurde
- Box unterstützt dynamische Ports mit localhost

### Fehler: "Access denied"
- Benutzer hat die Berechtigung verweigert
- Überprüfen Sie die Anwendungsbereiche in der Box Developer Console
