# Google ドライブバックアップ設定ガイド

> **言語**: [🇺🇸 English](GOOGLE_DRIVE_SETUP.en.md) | [🇻🇳 Tiếng Việt](GOOGLE_DRIVE_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](GOOGLE_DRIVE_SETUP.id.md) | [🇨🇳 中文](GOOGLE_DRIVE_SETUP.zh.md) | [🇰🇷 한국어](GOOGLE_DRIVE_SETUP.ko.md) | [🇯🇵 日本語](GOOGLE_DRIVE_SETUP.ja.md) | [🇫🇷 Français](GOOGLE_DRIVE_SETUP.fr.md) | [🇩🇪 Deutsch](GOOGLE_DRIVE_SETUP.de.md) | [🇪🇸 Español](GOOGLE_DRIVE_SETUP.es.md) | [🇹🇭 ภาษาไทย](GOOGLE_DRIVE_SETUP.th.md) | [🇲🇾 Bahasa Melayu](GOOGLE_DRIVE_SETUP.ms.md) | [🇷🇺 Русский](GOOGLE_DRIVE_SETUP.ru.md) | [🇵🇭 Filipino](GOOGLE_DRIVE_SETUP.fil.md) | [🇧🇷 Português](GOOGLE_DRIVE_SETUP.pt.md)

---

## ステップ1: Google Cloudプロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 右上の**「新しいプロジェクト」**をクリック
3. プロジェクト名を入力: `Marix SSH Client` または任意の名前
4. **「作成」**をクリック

## ステップ2: Google Drive APIの有効化

1. 新しく作成したプロジェクトで、**「APIとサービス」** > **「ライブラリ」**に移動
2. **「Google Drive API」**を検索
3. 結果をクリックして**「有効にする」**を押す

## ステップ3: OAuth 2.0認証情報の作成

### 3.1. OAuth同意画面の構成

1. **「APIとサービス」** > **「OAuth同意画面」**に移動
2. **「外部」**を選択（すべてのGoogleアカウントユーザーを許可）
3. **「作成」**をクリック

**アプリ情報:**
- アプリ名: `Marix SSH Client`
- ユーザーサポートメール: `your-email@gmail.com`
- アプリのロゴ: （オプション）ロゴをアップロード
- アプリケーションのホームページ: `https://github.com/marixdev/marix`
- アプリケーションのプライバシーポリシーリンク: （オプション）
- アプリケーションの利用規約リンク: （オプション）

**デベロッパーの連絡先情報:**
- メールアドレス: `your-email@gmail.com`

4. **「保存して次へ」**をクリック

**スコープ:**
5. **「スコープを追加または削除」**をクリック
6. 次のスコープを選択:
   - `https://www.googleapis.com/auth/drive.file`（このアプリが作成したファイルのみ）
7. **「更新」**および**「保存して次へ」**をクリック

**テストユーザー:** (公開ステータス = テスト中の場合のみ必要)
8. **「ユーザーを追加」**をクリック
9. テスト用のGoogleアカウントメールを入力
10. **「保存して次へ」**をクリック

11. 確認して**「ダッシュボードに戻る」**をクリック

### 3.2. OAuth クライアントIDの作成

1. **「APIとサービス」** > **「認証情報」**に移動
2. **「認証情報を作成」** > **「OAuth クライアント ID」**をクリック
3. **「デスクトップアプリ」**を選択（Electronアプリ用）
4. 名前を入力: `Marix Desktop Client`
5. **「作成」**をクリック

6. **クライアントIDをコピー**：コピーアイコンをクリックしてClient IDをコピー
   - `client_id` のみ必要です - client secretは不要（PKCE使用）
   - `src/main/services/` に `google-credentials.json` ファイルを作成

7. **クライアントIDを保存**（PKCEでclient_secretは不要）：
```json
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com"
  }
}
```

## ステップ4: Marixでの構成

1. `google-credentials.json` ファイルを `src/main/services/` フォルダにコピー
2. **重要**: `.gitignore`に追加:
```
src/main/services/google-credentials.json
```

3. アプリは起動時に自動的に認証情報を読み込みます

## ステップ5: OAuth フローのテスト

1. Marixアプリを開く
2. **設定** > **バックアップと復元** > **バックアップを作成/復元**に移動
3. **「Google ドライブ」**タブを選択
4. **「Google ドライブに接続」**をクリック
5. ブラウザでGoogle OAuth画面が開きます
6. Googleアカウントを選択して権限を付与
7. アプリがトークンを受け取り「接続済み」と表示

## セキュリティに関する注意事項

- `google-credentials.json` を Git に**コミットしないでください**
- リフレッシュトークンは Electron store に保存されます（暗号化）
- 必要最小限の権限のみをリクエスト
- 安全なOAuthフローのためにPKCEを使用（クライアントシークレット不要）

## アプリの公開（必須）

すべてのユーザーがアプリを使用できるようにするには:

1. **OAuth同意画面**に移動
2. **「アプリを公開」**をクリック
3. アプリはすぐに承認されます
4. 「未確認のアプリ」警告なしで誰でも使用可能

## トラブルシューティング

### エラー: "Access blocked: This app's request is invalid"
- OAuth同意画面が完全に構成されているか確認
- redirect_uriが設定と一致しているか確認

### エラー: "The OAuth client was not found"
- 認証情報ファイルのクライアントIDを確認
- Google Cloud ConsoleからJSONファイルを再ダウンロード

### エラー: "Access denied"
- ユーザーが権限付与を拒否
- OAuth同意画面に適切なスコープを追加
