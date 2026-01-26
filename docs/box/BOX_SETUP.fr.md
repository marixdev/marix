# Guide de configuration de sauvegarde Box.net

> **Langues**: [🇺🇸 English](BOX_SETUP.en.md) | [🇻🇳 Tiếng Việt](BOX_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](BOX_SETUP.id.md) | [🇨🇳 中文](BOX_SETUP.zh.md) | [🇰🇷 한국어](BOX_SETUP.ko.md) | [🇯🇵 日本語](BOX_SETUP.ja.md) | [🇫🇷 Français](BOX_SETUP.fr.md) | [🇩🇪 Deutsch](BOX_SETUP.de.md) | [🇪🇸 Español](BOX_SETUP.es.md) | [🇹🇭 ภาษาไทย](BOX_SETUP.th.md) | [🇲🇾 Bahasa Melayu](BOX_SETUP.ms.md) | [🇷🇺 Русский](BOX_SETUP.ru.md) | [🇵🇭 Filipino](BOX_SETUP.fil.md) | [🇧🇷 Português](BOX_SETUP.pt.md)

---

## Étape 1 : Créer un compte développeur Box

1. Accédez à [Box Developer Console](https://app.box.com/developers/console)
2. Connectez-vous avec votre compte Box (ou créez-en un)
3. Cliquez sur **"Create New App"**

## Étape 2 : Créer une application OAuth 2.0

1. Sélectionnez **"Custom App"**
2. Choisissez **"User Authentication (OAuth 2.0)"**
3. Nommez votre application : `Marix SSH Client` ou le nom de votre choix
4. Cliquez sur **"Create App"**

## Étape 3 : Configurer les paramètres de l'application

### 3.1. Identifiants OAuth 2.0

1. Dans les paramètres de votre application, allez à l'onglet **"Configuration"**
2. Notez :
   - **Client ID**
   - **Client Secret** (cliquez sur "Fetch Client Secret" si nécessaire)

### 3.2. URI de redirection OAuth 2.0

1. Faites défiler jusqu'à **"OAuth 2.0 Redirect URI"**
2. Ajoutez : `http://localhost` (Box autorise n'importe quel port localhost)
3. Cliquez sur **"Save Changes"**

### 3.3. Portées de l'application

1. Sous **"Application Scopes"**, assurez-vous que ceux-ci sont activés :
   - ✅ Read all files and folders stored in Box
   - ✅ Write all files and folders stored in Box
2. Cliquez sur **"Save Changes"**

## Étape 4 : Configurer les identifiants dans Marix

### Option A : Développement local

1. Créez `box-credentials.json` dans `src/main/services/` :
```json
{
  "client_id": "YOUR_BOX_CLIENT_ID",
  "client_secret": "YOUR_BOX_CLIENT_SECRET"
}
```

2. **IMPORTANT** : Ajoutez à `.gitignore` :
```
src/main/services/box-credentials.json
```

### Option B : CI/CD avec GitHub Secrets (Recommandé)

1. Allez dans votre dépôt GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Ajoutez ces secrets :
   - `BOX_CLIENT_ID` : Votre Client ID Box
   - `BOX_CLIENT_SECRET` : Votre Client Secret Box
3. Le workflow de build injectera automatiquement les identifiants lors de la compilation

## Étape 5 : Tester le flux OAuth

1. Ouvrez l'application Marix
2. Allez dans **Paramètres** > **Sauvegarde et restauration** > **Créer/Restaurer une sauvegarde**
3. Sélectionnez l'onglet **"Box"**
4. Cliquez sur **"Se connecter à Box"**
5. Le navigateur ouvrira l'écran OAuth de Box
6. Connectez-vous et accordez les permissions
7. L'application recevra le jeton et affichera "Connecté"

## Notes de sécurité

- **NE PAS** commiter `box-credentials.json` dans Git
- Utilisez **GitHub Secrets** pour les builds CI/CD pour protéger le client_secret
- Les jetons sont stockés de manière sécurisée avec safeStorage d'Electron
- PKCE est utilisé pour une sécurité supplémentaire du flux OAuth
- Des ports de callback aléatoires sont utilisés pour éviter les conflits

## Approbation de l'application (Optionnel)

Pour un usage personnel, votre application fonctionne immédiatement. Pour une distribution publique :

1. Allez à l'onglet **"General Settings"**
2. Soumettez votre application pour examen si nécessaire
3. Box examinera et approuvera votre application

## Dépannage

### Erreur : "Invalid client_id or client_secret"
- Vérifiez les identifiants dans votre fichier box-credentials.json
- Recopiez le Client ID et le Client Secret depuis la Box Developer Console

### Erreur : "Redirect URI mismatch"
- Assurez-vous que `http://localhost` est ajouté dans les paramètres de l'application Box
- Box prend en charge les ports dynamiques avec localhost

### Erreur : "Access denied"
- L'utilisateur a refusé l'autorisation
- Vérifiez les portées de l'application dans la Box Developer Console
