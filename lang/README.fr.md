<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>Client SSH Zero-Knowledge Moderne</strong>
</p>

<p align="center">
  <em>Vos identifiants ne quittent jamais votre appareil. Pas de cloud. Pas de tracking. Pas de compromis.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
  <img src="https://img.shields.io/badge/version-1.0.4-orange" alt="Version">
</p>

<p align="center">
  <a href="https://marix.dev">🌐 Site Web</a> •
  <a href="#-téléchargement">Téléchargement</a> •
  <a href="#-fonctionnalités">Fonctionnalités</a> •
  <a href="#-sécurité">Sécurité</a> •
  <a href="#-langues">Langues</a>
</p>

---

## 🌍 Autres Langues

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) |
| 🇪🇸 [Español](README.es.md) | 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) |
| 🇵🇭 [Filipino](README.fil.md) | 🇧🇷 [Português](README.pt.md) | | |

---

## 🎯 À qui s'adresse Marix ?

- **Développeurs et ingénieurs DevOps** - Gérant plusieurs serveurs
- **Administrateurs système** - Qui priorisent la sécurité et l'efficacité
- **Utilisateurs soucieux de la sécurité** - Qui ne font pas confiance aux solutions cloud
- **Tous ceux** - Qui veulent un contrôle total sur leurs identifiants SSH

---

## ⚠️ Avertissement

> **Vous êtes responsable de vos données.**
>
> Marix stocke toutes les données localement avec un chiffrement fort. Cependant :
> - Si vous perdez votre mot de passe de sauvegarde, **vos données sont irrécupérables**
> - **Pas de serveur** - pas d'option "mot de passe oublié"
> - **Sauvegardez régulièrement** - le matériel peut tomber en panne
> - **La sécurité est la vôtre** - nous fournissons les outils, vous prenez les décisions
>
> En utilisant Marix, vous acceptez l'entière responsabilité de la sécurité de vos données.

---

## 🔒 Architecture Zero-Knowledge

> **« Vos clés. Vos serveurs. Votre vie privée. »**

### Principes Fondamentaux

| | Principe | Description |
|---|----------|-------------|
| 🔐 | **100% Hors ligne** | Tous les identifiants stockés localement sur votre appareil—jamais téléchargés |
| ☁️ | **Pas de Cloud** | Pas de serveurs. Vos données ne touchent jamais Internet |
| 📊 | **Pas de Télémétrie** | Pas de tracking, pas d'analytics, pas de collecte de données |
| 🔓 | **Open Source** | Code entièrement auditable sous GPL-3.0, pas de backdoors cachés |

### Technologies de Chiffrement

| | Fonctionnalité | Technologie | Description |
|---|----------------|-------------|-------------|
| 🛡️ | **Stockage Local** | Argon2id + AES-256 | Chiffre les identifiants sur l'appareil |
| 📦 | **Sauvegarde Fichier** | Argon2id + AES-256-GCM | Exporte en fichiers `.marix` avec chiffrement authentifié |
| 🔄 | **Sync GitHub** | Argon2id + AES-256-GCM | Sauvegarde cloud zero-knowledge—GitHub stocke uniquement des blobs chiffrés |

---

## ⚡ Performance et Optimisation

Marix est optimisé pour fonctionner de manière fluide même sur des machines peu puissantes :

### Gestion Adaptative de la Mémoire

| RAM Système | Mémoire Argon2id | Niveau de Sécurité |
|-------------|------------------|-------------------|
| ≥ 8 Go | 64 Mo | Élevé |
| ≥ 4 Go | 32 Mo | Moyen |
| < 4 Go | 16 Mo | Optimisé mémoire basse |

L'application détecte automatiquement la RAM système et ajuste les paramètres de chiffrement pour une performance optimale tout en maintenant la sécurité.

### Optimisations Runtime

| Optimisation | Technique | Avantage |
|--------------|-----------|----------|
| **Limite Heap V8** | `--max-old-space-size=256MB` | Empêche la surcharge mémoire |
| **Throttling Background** | `--disable-renderer-backgrounding` | Maintient les connexions |
| **Tampon Terminal** | Scrollback : 3 000 lignes | 70% moins de mémoire que défaut |
| **Chargement Différé** | Chargement à la demande | Démarrage plus rapide |
| **Indices GC** | Déclenchement manuel GC | Empreinte mémoire réduite |

### Stack Technique

| Composant | Technologie | Objectif |
|-----------|-------------|----------|
| **Framework** | Electron 39 + React 19 | Application desktop cross-platform |
| **Terminal** | xterm.js 6 | Émulation terminal haute performance |
| **SSH/SFTP** | ssh2 + node-pty | Implémentation protocole SSH native |
| **Éditeur Code** | CodeMirror 6 | Coloration syntaxique légère |
| **Chiffrement** | Argon2 + Node.js Crypto | Chiffrement côté client robuste |
| **Style** | Tailwind CSS 4 | CSS moderne et minimal |
| **Build** | Webpack 5 + TypeScript 5 | Bundle production optimisé |

---

## 📥 Téléchargement

<table>
<tr>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/windows-10.png" width="64"><br>
<b>Windows</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-Setup.exe">Télécharger .exe</a>
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

## ✨ Fonctionnalités

### 🔌 Connexions Multi-Protocoles

| Protocole | Description |
|-----------|-------------|
| **SSH** | Secure Shell avec authentification par mot de passe et clé privée |
| **SFTP** | Gestionnaire de fichiers double panneau avec glisser-déposer |
| **FTP/FTPS** | Support FTP standard et sécurisé |
| **RDP** | Bureau à distance (xfreerdp3 sur Linux, mstsc sur Windows) |

### 💻 Terminal

- **400+ thèmes de couleurs** - De Dracula à Solarized, Catppuccin, Nord, etc.
- **Polices personnalisables** - N'importe quelle police système, n'importe quelle taille
- **xterm.js 6 complet** - Émulation terminal complète avec support Unicode
- **Persistance des sessions** - Les onglets persistent après reconnexion
- **Détection d'OS** - Détecte automatiquement la distribution Linux & affiche les infos système

### 📁 Gestionnaire de Fichiers SFTP

- **Interface double panneau** - Local ↔ Distant côte à côte
- **Éditeur intégré** - CodeMirror 6 avec coloration syntaxique pour 15+ langages
- **Glisser-déposer** - Télécharger/Téléverser des fichiers facilement
- **Gestion des permissions** - chmod avec interface visuelle
- **Opérations par lot** - Sélectionner plusieurs fichiers pour le transfert

### 🛠️ Outils Intégrés

#### Transfert de Fichiers LAN
*Partage instantané de fichiers entre appareils sur réseau local.*

#### Partage de Serveurs LAN
*Partage sécurisé des configurations serveur avec les appareils proches.*

#### Outils DNS & Réseau
- Recherche DNS
- Requêtes WHOIS
- Scanner de ports
- Traceroute

#### Gestionnaire DNS Cloudflare
*Outil intégré optionnel pour gérer Cloudflare DNS directement depuis votre espace de travail SSH.*

#### Gestionnaire de Clés SSH
- Générer des paires de clés SSH (Ed25519, RSA, ECDSA)
- Importer/Exporter des clés
- Gérer les known hosts

#### Gestionnaire Known Hosts
- Voir et gérer les known hosts
- Supprimer les anciennes empreintes
- Exporter/Importer les known hosts

### 🎨 Expérience Utilisateur

- **Thèmes sombre & clair** - Suivre le système ou changer manuellement
- **14 langues** supportées
- **Tags de serveurs** - Organiser avec des tags colorés
- **Connexion rapide** - Cmd/Ctrl+K pour chercher des serveurs
- **Historique des connexions** - Accès rapide aux connexions récentes

---

## 💾 Sauvegarde et Restauration

### Comment Fonctionne le Chiffrement

Toutes les sauvegardes utilisent **Argon2id** (gagnant du Password Hashing Competition) et **AES-256-GCM** (chiffrement authentifié) :

```
Mot de passe → Argon2id(16-64Mo mémoire) → Clé 256-bit → AES-256-GCM → Sauvegarde Chiffrée
```

### Données Sauvegardées

| Données | Incluses | Chiffrées |
|---------|----------|-----------|
| Liste des serveurs (hôte, port, identifiants) | ✅ | ✅ |
| Clés privées SSH | ✅ | ✅ |
| Tokens API Cloudflare | ✅ | ✅ |
| Paramètres & préférences de l'app | ✅ | ✅ |
| Known hosts | ✅ | ✅ |

### Garanties de Sécurité

🔐 **Mot de passe jamais stocké** — ni dans le fichier, ni sur GitHub, nulle part  
🔒 **Zero-Knowledge** — même les développeurs Marix ne peuvent pas déchiffrer vos sauvegardes  
🛡️ **Résistant au bruteforce** — Argon2id nécessite 16-64Mo de RAM par tentative  
✅ **Anti-falsification** — AES-GCM détecte toute modification des données chiffrées  
🔄 **Compatibilité cross-machine** — les sauvegardes stockent le coût mémoire pour la portabilité

---

### Sauvegarde Locale Chiffrée

Exporter toutes vos données en fichier `.marix` chiffré :

1. **Aller dans Paramètres** → **Sauvegarde et Restauration**
2. **Créer un mot de passe** (répondant aux exigences) :
   - Minimum 10 caractères
   - 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
3. **Exporter** - le fichier est chiffré avant sauvegarde
4. **Garder en sécurité** - conserver le fichier de sauvegarde, mémoriser le mot de passe

---

### Sauvegarde Google Drive (Zero-Knowledge)

Synchroniser de manière sécurisée les sauvegardes chiffrées vers Google Drive :

#### Configuration

📘 **Guide de Configuration** : Voir [docs/google/GOOGLE_DRIVE_SETUP.fr.md](../docs/google/GOOGLE_DRIVE_SETUP.fr.md)

ℹ️ **Versions pré-construites** : Si vous utilisez les releases pré-construites (AppImage, RPM, etc.), les identifiants Google sont déjà inclus. Vous pouvez sauter l'étape 1 et vous connecter directement.

1. **Configurer les identifiants OAuth** :
   - Créer un projet Google Cloud
   - Activer l'API Google Drive
   - Créer un ID client OAuth 2.0
   - Télécharger le fichier JSON des identifiants
   - Sauvegarder comme `src/main/services/google-credentials.json`

2. **Se connecter dans Marix** :
   - Aller dans Paramètres → Sauvegarde et Restauration → Google Drive
   - Cliquer "Se connecter à Google Drive"
   - Le navigateur s'ouvre pour OAuth Google
   - Accorder les permissions
   - L'app reçoit le token sécurisé

3. **Créer une sauvegarde** :
   - Entrer le mot de passe de chiffrement (10+ caractères)
   - Cliquer "Créer une sauvegarde"
   - Le fichier est téléversé dans le dossier "Marix Backups" sur Drive

4. **Restaurer une sauvegarde** :
   - Cliquer "Restaurer depuis Google Drive"
   - Entrer le mot de passe de sauvegarde
   - Tous les serveurs et paramètres sont restaurés

#### Comment ça Fonctionne

✅ **Chiffrement bout-en-bout** - les données sont chiffrées avant de quitter votre appareil  
✅ **Zero-Knowledge** - Google ne voit que des blobs chiffrés  
✅ **Vous seul avez la clé** - le token OAuth est stocké localement  
✅ **Dossier privé** - les fichiers ne sont accessibles qu'à votre app

---

### Sauvegarde GitHub (Zero-Knowledge)

Synchroniser de manière sécurisée les sauvegardes chiffrées vers un repo GitHub privé :

#### Configuration

1. **Se connecter avec GitHub** :
   - Aller dans Paramètres → Sauvegarde et Restauration → Sauvegarde GitHub
   - Cliquer "Se connecter avec GitHub"
   - Un code d'appareil apparaît dans l'app
   - Le navigateur s'ouvre automatiquement - entrer le code pour authentifier
   - C'est fait ! Un repo privé `marix-backup` est créé automatiquement

2. **Sauvegarder** :
   - Cliquer "Sauvegarder sur GitHub"
   - Entrer le mot de passe de sauvegarde
   - Les données chiffrées sont poussées vers le repo

3. **Restaurer sur un autre appareil** :
   - Installer Marix
   - Se connecter avec GitHub (même procédure)
   - Cliquer "Restaurer depuis GitHub"
   - Entrer le mot de passe de sauvegarde pour déchiffrer

#### Pourquoi GitHub est Sécurisé

| Couche | Protection |
|--------|------------|
| **Chiffrement côté client** | Les données sont chiffrées avant de quitter l'appareil |
| **Argon2id KDF** | 16-64Mo mémoire, 3 itérations, 4 voies parallèles |
| **AES-256-GCM** | Chiffrement authentifié avec IV aléatoire |
| **Stockage GitHub** | Ne stocke que du texte chiffré |
| **Pas de serveur Marix** | Client ↔ GitHub directement |

⚠️ **Important** : Si vous perdez votre mot de passe de sauvegarde, vos sauvegardes sont **définitivement irrécupérables**. Nous ne pouvons pas les déchiffrer. Personne ne le peut.

---

## 🛡️ Spécifications de Sécurité

### Détails du Chiffrement

| Algorithme | Paramètres |
|------------|------------|
| **Dérivation de clé** | Argon2id (Mémoire : 16-64Mo, Itérations : 3, Parallélisme : 4) |
| **Chiffrement symétrique** | AES-256-GCM |
| **Sel** | 32 octets (aléatoire cryptographique) |
| **IV/Nonce** | 16 octets (unique par chiffrement) |
| **Tag d'authentification** | 16 octets (tag auth GCM) |

### Algorithmes de Clés SSH

| Algorithme | Taille de Clé | Utilisation |
|------------|---------------|-------------|
| **Ed25519** | 256-bit | Recommandé (rapide, sécurisé) |
| **RSA** | 2048-4096-bit | Compatibilité legacy |
| **ECDSA** | 256-521-bit | Alternative à Ed25519 |

### Exigences de Mot de Passe

Les mots de passe de sauvegarde doivent avoir :

✅ Minimum 10 caractères  
✅ Au moins 1 majuscule (A-Z)  
✅ Au moins 1 minuscule (a-z)  
✅ Au moins 1 chiffre (0-9)  
✅ Au moins 1 caractère spécial (!@#$%^&*...)

---

## 🔧 Compiler depuis les Sources

```bash
# Cloner le repo
git clone https://github.com/user/marix.git
cd marix

# Installer les dépendances
npm install

# Développement
npm run dev

# Compiler
npm run build

# Empaqueter pour distribution
npm run package:win    # Windows (.exe)
npm run package:mac    # macOS (.zip)
npm run package:linux  # Linux (.AppImage, .deb, .rpm)
```

### Configuration Système Requise

|  | Minimum | Recommandé |
|--|---------|------------|
| **OS** | Windows 10, macOS 10.13, Ubuntu 18.04 | Dernière version |
| **RAM** | 2 Go | 4 Go+ |
| **Stockage** | 200 Mo | 500 Mo |

### Dépendances RDP pour Linux

```bash
# Installer xfreerdp3 pour le support RDP
sudo apt install freerdp3-x11  # Debian/Ubuntu
sudo dnf install freerdp       # Fedora
sudo pacman -S freerdp         # Arch
```

---

## 📄 Licence

Ce projet est sous licence **GNU General Public License v3.0** (GPL-3.0).

Cela signifie :

✅ Vous pouvez utiliser, modifier et distribuer ce logiciel  
✅ Vous pouvez l'utiliser à des fins commerciales  
⚠️ Toute modification doit également être publiée sous GPL-3.0  
⚠️ Vous devez rendre le code source disponible lors de la distribution  
⚠️ Vous devez indiquer les changements apportés au code

Voir [LICENSE](../LICENSE) pour le texte complet de la licence.

---

<p align="center">
  <strong>Marix</strong><br>
  Client SSH Zero-Knowledge Moderne<br><br>
  <em>Vos données. Votre responsabilité. Votre liberté.</em><br><br>
  Si vous voulez de la commodité au prix de votre vie privée, Marix n'est pas pour vous.
</p>
