<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>Client SSH Zero-Knowledge Moderne</strong>
</p>

<p align="center">
  <em>Vos identifiants ne quittent jamais votre appareil. Pas de cloud. Pas de suivi. Pas de compromis.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
</p>

---

## 🌍 Autres Langues

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇩🇪 [Deutsch](README.de.md) | 🇪🇸 [Español](README.es.md) |
| 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) | 🇵🇭 [Filipino](README.fil.md) |
| 🇧🇷 [Português](README.pt.md) | | | |

---

## ⚠️ Avertissement

> **VOUS ÊTES RESPONSABLE DE VOS PROPRES DONNÉES.**
>
> Marix stocke toutes les données localement sur votre appareil avec un chiffrement fort. Cependant :
> - **Nous ne pouvons pas récupérer vos données** si vous perdez votre mot de passe de sauvegarde
> - **Nous n'avons pas de serveurs** — pas d'option "mot de passe oublié"
> - **Sauvegardez régulièrement** — le matériel peut tomber en panne
> - **Vous possédez votre sécurité** — nous fournissons les outils, vous prenez les décisions

---

## 🔒 Architecture Zero-Knowledge

### Principes Fondamentaux

| | Principe | Description |
|---|----------|-------------|
| 🔐 | **100% Hors Ligne** | Tous les identifiants stockés localement—jamais téléversés |
| ☁️ | **Pas de Cloud** | Nous n'avons pas de serveurs. Vos données ne touchent jamais Internet |
| 📊 | **Pas de Télémétrie** | Pas de suivi, pas d'analyse, pas de collecte de données |
| 🔓 | **Open Source** | Code entièrement auditable sous GPL-3.0 |

### Technologie de Chiffrement

| | Fonctionnalité | Technologie | Description |
|---|----------------|-------------|-------------|
| 🛡️ | **Stockage Local** | Argon2id + AES-256 | Identifiants chiffrés au repos sur votre appareil |
| 📦 | **Sauvegarde Fichier** | Argon2id + AES-256-GCM | Export de fichiers `.marix` chiffrés |
| 🔄 | **Synchronisation GitHub** | Argon2id + AES-256-GCM | Sauvegarde cloud zero-knowledge |

---

## ⚡ Performance & Optimisation

### Gestion de Mémoire Adaptative

| RAM Système | Mémoire Argon2id | Niveau de Sécurité |
|-------------|------------------|-------------------|
| ≥ 8 Go | 64 Mo | Élevé |
| ≥ 4 Go | 32 Mo | Moyen |
| < 4 Go | 16 Mo | Optimisé pour faible mémoire |

### Optimisations Runtime

| Optimisation | Technologie | Avantage |
|--------------|-------------|----------|
| **Limite Heap V8** | `--max-old-space-size=256MB` | Empêche le gonflement de mémoire |
| **Throttling Arrière-plan** | `--disable-renderer-backgrounding` | Maintient les connexions actives |
| **Buffer Terminal** | Scrollback : 3 000 lignes | Réduction de 70% de la mémoire |
| **Chargement Différé** | Chargement des composants à la demande | Démarrage plus rapide |

### Stack Technique

| Composant | Technologie | Objectif |
|-----------|-------------|----------|
| **Framework** | Electron 39 + React 19 | Application desktop multiplateforme |
| **Terminal** | xterm.js 6 | Émulation de terminal haute performance |
| **SSH/SFTP** | ssh2 + node-pty | Implémentation native du protocole SSH |
| **Éditeur de Code** | CodeMirror 6 | Coloration syntaxique légère |
| **Chiffrement** | Argon2 + Node.js Crypto | Sécurité de niveau militaire |
| **Style** | Tailwind CSS 4 | CSS moderne et minimal |
| **Build** | Webpack 5 + TypeScript 5 | Bundles de production optimisés |

---

## 📥 Téléchargement

| OS | Téléchargement |
|----|---------------|
| **Windows** | [Télécharger .exe](https://github.com/user/marix/releases/latest/download/Marix-Setup.exe) |
| **macOS** | [Intel .dmg](https://github.com/user/marix/releases/latest/download/Marix.dmg) • [Apple Silicon](https://github.com/user/marix/releases/latest/download/Marix-arm64.dmg) |
| **Linux** | [.AppImage](https://github.com/user/marix/releases/latest/download/Marix.AppImage) • [.deb](https://github.com/user/marix/releases/latest/download/marix.deb) • [.rpm](https://github.com/user/marix/releases/latest/download/marix.rpm) |

---

## ✨ Fonctionnalités

### 🔌 Connexions Multi-Protocoles

| Protocole | Technologie | Description |
|-----------|-------------|-------------|
| **SSH** | ssh2 + node-pty | Secure Shell avec authentification par mot de passe et clé privée |
| **SFTP** | ssh2 | Gestionnaire de fichiers à double panneau avec glisser-déposer |
| **FTP/FTPS** | basic-ftp | Support FTP standard et sécurisé |
| **RDP** | xfreerdp3 / mstsc | Bureau à distance (xfreerdp3 sur Linux, mstsc sur Windows) |

### 💻 Terminal

- **400+ thèmes de couleurs** — Dracula, Solarized, Catppuccin, Nord...
- **Polices personnalisées** — N'importe quelle police système
- **xterm.js 6 complet** — Émulation de terminal complète avec support Unicode
- **Préservation de session** — Les onglets persistent lors des reconnexions
- **Détection d'OS** — Détection automatique de la distribution Linux

### 📁 Gestionnaire de Fichiers SFTP

- **Interface à double panneau** — Local ↔ Distant côte à côte
- **Éditeur intégré** — CodeMirror 6 avec coloration syntaxique pour 15+ langages
- **Glisser-déposer** — Upload/download de fichiers facile
- **Gestion des permissions** — Interface visuelle chmod

### 🛠️ Outils Intégrés

- **DNS & Réseau** : A, AAAA, MX, TXT, SPF, CNAME, NS, SOA, PTR, Ping, Traceroute, port TCP, HTTP/HTTPS, SMTP, Blacklist, WHOIS, ARIN
- **Gestionnaire DNS Cloudflare** : Gestion des domaines, enregistrements DNS, proxy Cloudflare
- **Gestionnaire de Clés SSH** : Génération RSA-4096, Ed25519, ECDSA-521, import/export de clés
- **Gestionnaire Known Hosts** : Affichage des empreintes, import depuis hôte, suppression des hôtes non fiables

---

## 💾 Sauvegarde & Restauration

### Comment Fonctionne le Chiffrement

Toutes les sauvegardes utilisent un chiffrement de niveau militaire avec **Argon2id** et **AES-256-GCM** :

<p align="center">
  <img src="flow.png" alt="Flux de Chiffrement" width="800">
</p>

### Ce Qui Est Sauvegardé

| Données | Inclus | Chiffré |
|---------|--------|---------|
| Liste des serveurs | ✅ | ✅ AES-256-GCM |
| Clés privées SSH | ✅ | ✅ AES-256-GCM |
| Token API Cloudflare | ✅ | ✅ AES-256-GCM |
| Paramètres de l'app | ✅ | ✅ AES-256-GCM |
| Known hosts | ❌ | — |

### Garanties de Sécurité

- 🔐 **Mot de passe jamais stocké** — Ni dans le fichier, ni sur GitHub
- 🔒 **Zero-knowledge** — Même les développeurs ne peuvent pas déchiffrer
- 🛡️ **Résistant au brute-force** — Argon2id nécessite 16-64 Mo de RAM par tentative
- ✅ **Anti-falsification** — AES-GCM détecte toute modification

### Sauvegarde GitHub (Zero-Knowledge)

1. **Connexion avec GitHub** → Code d'appareil affiché → Navigateur s'ouvre → Autoriser → Dépôt `marix-backup` créé automatiquement
2. **Sauvegarde** : Cliquez "Sauvegarder sur GitHub" → Entrez le mot de passe → Données chiffrées poussées
3. **Restauration** : Connexion GitHub → "Restaurer depuis GitHub" → Entrez le mot de passe pour déchiffrer

> ⚠️ **Important** : Si vous perdez votre mot de passe de sauvegarde, votre sauvegarde est **définitivement irrécupérable**. Personne ne peut la déchiffrer.

---

## 🛡️ Spécifications de Sécurité

| Composant | Algorithme | Paramètres |
|-----------|------------|------------|
| Dérivation de Clé | Argon2id | 16-64 Mo de mémoire, 3 itérations, 4 voies |
| Chiffrement | AES-256-GCM | Clé 256 bits, authentifié |
| Sel | CSPRNG | 32 octets par sauvegarde |
| IV/Nonce | CSPRNG | 16 octets par opération |

### Exigences de Mot de Passe

- ✅ Minimum 10 caractères
- ✅ Au moins 1 majuscule (A-Z)
- ✅ Au moins 1 minuscule (a-z)
- ✅ Au moins 1 chiffre (0-9)
- ✅ Au moins 1 caractère spécial (!@#$%^&*...)

---

## 🔧 Compilation depuis les Sources

```bash
git clone https://github.com/marixdev/marix.git
cd marix
npm install
npm run dev      # Développement
npm run build    # Compilation
npm run package:linux  # Empaquetage
```

### Dépendances RDP pour Linux

```bash
# Ubuntu/Debian
sudo apt install freerdp3-x11 xdotool

# Fedora
sudo dnf install freerdp xdotool

# Arch
sudo pacman -S freerdp xdotool
```

---

## 📄 Licence

**GNU General Public License v3.0** (GPL-3.0)

---

<p align="center">
  <strong>Marix</strong> — Client SSH zero-knowledge moderne<br>
  <em>Vos données. Votre responsabilité. Votre liberté.</em>
</p>
