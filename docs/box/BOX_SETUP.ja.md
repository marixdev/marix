# Box.net バックアップ設定ガイド

> **言語**: [🇺🇸 English](BOX_SETUP.en.md) | [🇻🇳 Tiếng Việt](BOX_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](BOX_SETUP.id.md) | [🇨🇳 中文](BOX_SETUP.zh.md) | [🇰🇷 한국어](BOX_SETUP.ko.md) | [🇯🇵 日本語](BOX_SETUP.ja.md) | [🇫🇷 Français](BOX_SETUP.fr.md) | [🇩🇪 Deutsch](BOX_SETUP.de.md) | [🇪🇸 Español](BOX_SETUP.es.md) | [🇹🇭 ภาษาไทย](BOX_SETUP.th.md) | [🇲🇾 Bahasa Melayu](BOX_SETUP.ms.md) | [🇷🇺 Русский](BOX_SETUP.ru.md) | [🇵🇭 Filipino](BOX_SETUP.fil.md) | [🇧🇷 Português](BOX_SETUP.pt.md)

---

## ステップ 1: Box デベロッパーアカウントの作成

1. [Box Developer Console](https://app.box.com/developers/console) にアクセス
2. Box アカウントでログイン（または新規作成）
3. **"Create New App"** をクリック

## ステップ 2: OAuth 2.0 アプリケーションの作成

1. **"Custom App"** を選択
2. **"User Authentication (OAuth 2.0)"** を選択
3. アプリ名を入力: `Marix SSH Client` または任意の名前
4. **"Create App"** をクリック

## ステップ 3: アプリケーション設定の構成

### 3.1. OAuth 2.0 認証情報

1. アプリ設定で **"Configuration"** タブに移動
2. 以下を記録:
   - **Client ID**
   - **Client Secret**（必要に応じて "Fetch Client Secret" をクリック）

### 3.2. OAuth 2.0 リダイレクト URI

1. **"OAuth 2.0 Redirect URI"** までスクロール
2. 追加: `http://localhost`（Box は任意の localhost ポートを許可）
3. **"Save Changes"** をクリック

### 3.3. アプリケーションスコープ

1. **"Application Scopes"** で以下が有効になっていることを確認:
   - ✅ Read all files and folders stored in Box
   - ✅ Write all files and folders stored in Box
2. **"Save Changes"** をクリック

## ステップ 4: Marix での認証情報の設定

### オプション A: ローカル開発

1. `src/main/services/` に `box-credentials.json` を作成:
```json
{
  "client_id": "YOUR_BOX_CLIENT_ID",
  "client_secret": "YOUR_BOX_CLIENT_SECRET"
}
```

2. **重要**: `.gitignore` に追加:
```
src/main/services/box-credentials.json
```

### オプション B: GitHub Secrets を使用した CI/CD（推奨）

1. GitHub リポジトリ → **Settings** → **Secrets and variables** → **Actions**
2. 以下の secrets を追加:
   - `BOX_CLIENT_ID`: Box の Client ID
   - `BOX_CLIENT_SECRET`: Box の Client Secret
3. ビルドワークフローがビルド中に自動的に認証情報を注入

## ステップ 5: OAuth フローのテスト

1. Marix アプリを開く
2. **設定** > **バックアップと復元** > **バックアップの作成/復元**
3. **"Box"** タブを選択
4. **"Box に接続"** をクリック
5. ブラウザで Box OAuth 画面が開きます
6. ログインして権限を付与
7. アプリがトークンを受信し「接続済み」と表示

## セキュリティに関する注意

- `box-credentials.json` を Git にコミット**しないでください**
- CI/CD ビルドには **GitHub Secrets** を使用して client_secret を保護
- トークンは Electron の safeStorage を使用して安全に保存
- PKCE が追加の OAuth フローセキュリティに使用
- 競合を避けるためにランダムなコールバックポートを使用

## アプリの承認（オプション）

個人使用の場合、アプリはすぐに動作します。公開配布の場合:

1. **"General Settings"** タブに移動
2. 必要に応じてアプリをレビューに提出
3. Box がアプリをレビューして承認

## トラブルシューティング

### エラー: "Invalid client_id or client_secret"
- box-credentials.json ファイルの認証情報を確認
- Box Developer Console から Client ID と Client Secret を再コピー

### エラー: "Redirect URI mismatch"
- Box アプリ設定に `http://localhost` が追加されていることを確認
- Box は localhost で動的ポートをサポート

### エラー: "Access denied"
- ユーザーが権限付与を拒否
- Box Developer Console でアプリケーションスコープを確認
