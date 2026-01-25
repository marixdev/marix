<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>モダンなゼロナレッジ SSH クライアント</strong>
</p>

<p align="center">
  <em>あなたの認証情報はデバイスを離れません。クラウドなし。トラッキングなし。妥協なし。</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <a href="https://github.com/marixdev/marix/actions/workflows/test.yml">
    <img src="https://github.com/marixdev/marix/actions/workflows/test.yml/badge.svg?branch=main" alt="CI Status">
  </a>
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/client--side%20encryption-🔒-critical" alt="Client-Side Encryption">
 <a href="https://github.com/marixdev/marix/releases/latest">
  <img src="https://img.shields.io/github/v/release/marixdev/marix?color=orange&label=version" alt="Latest Version">
</a>
</p>

<p align="center">
  <a href="https://marix.dev">🌐 ウェブサイト</a> •
  <a href="https://discord.gg/KSenHkCtN6">💬 Discord</a> •
  <a href="#-ダウンロード">ダウンロード</a> •
  <a href="#-機能">機能</a> •
  <a href="#-セキュリティ">セキュリティ</a> •
  <a href="#-言語">言語</a>
</p>

---

## 🌍 他の言語

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) |
| 🇪🇸 [Español](README.es.md) | 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) |
| 🇵🇭 [Filipino](README.fil.md) | 🇧🇷 [Português](README.pt.md) | | |

---

## 🎯 Marix は誰のため？

- **開発者と DevOps エンジニア** - 複数のサーバーを管理
- **システム管理者** - セキュリティと効率を重視
- **セキュリティ意識の高いユーザー** - クラウドベースのソリューションを信頼しない
- **誰でも** - SSH 認証情報を完全に制御したい方

---

## ⚠️ 免責事項

> **あなたは自分のデータに責任があります。**
>
> Marix は強力な暗号化ですべてのデータをローカルに保存します。ただし：
> - バックアップパスワードを紛失した場合、**データを復元できません**
> - **サーバーがありません** - 「パスワードを忘れた」オプションはありません
> - **定期的にバックアップ** - ハードウェアは故障する可能性があります
> - **セキュリティはあなたのもの** - ツールを提供しますが、決定はあなたが行います
>
> Marix を使用することで、データセキュリティの全責任を受け入れます。

---

## 🔒 クライアントサイド暗号化アーキテクチャ

> **「あなたの鍵。あなたのサーバー。あなたのプライバシー。」**

### 脅威モデル

Marix は以下のセキュリティ前提で設計されています：

> ⚠️ **Marix はローカルの非侵害ホスト環境を前提としています。**  
> 悪意のある OS レベルの攻撃者や侵害されたランタイムに対する防御は試みません。

**保護対象：**
- パスワードなしでのバックアップファイルの盗難
- 暗号化バックアップに対するブルートフォースパスワード攻撃
- 転送または保存中のデータ改ざん（AEAD により検出）
- クラウドプロバイダーによるデータへのアクセス（クライアントサイド暗号化）

**保護対象外：**
- デバイス上で root/admin アクセスを持つマルウェア
- アプリ実行中のロック解除されたデバイスへの物理的アクセス
- キーロガーまたはスクリーンキャプチャマルウェア
- 侵害された OS または Electron ランタイム

### Marix がしないこと

| ❌ | 説明 |
|----|------|
| **リモート鍵保存なし** | 秘密鍵がデバイスを離れることはありません |
| **鍵エスクローなし** | いかなる状況でも鍵を回復できません |
| **パスワードなしの回復不可** | パスワード紛失 = バックアップ紛失（設計通り） |
| **暗号化中のネットワーク呼び出しなし** | 暗号化操作は 100% オフライン |
| **クラウドサーバーなし** | インフラストラクチャを運営していません |
| **テレメトリなし** | 分析ゼロ、トラッキングゼロ、データ収集ゼロ |

### 基本原則

| | 原則 | 説明 |
|---|------|------|
| 🔐 | **100% オフライン** | すべての認証情報はデバイスにローカル保存—アップロードされません |
| ☁️ | **クラウドなし** | サーバーがありません。データはインターネットに触れません |
| 📊 | **テレメトリなし** | トラッキングなし、分析なし、データ収集なし |
| 🔓 | **オープンソース** | GPL-3.0 の下で完全に監査可能なコード、隠れたバックドアなし |

### 暗号化技術

| | 機能 | 技術 | 説明 |
|---|------|------|------|
| 🛡️ | **ローカルストレージ** | Argon2id + AES-256 | デバイス上で認証情報を暗号化 |
| 📦 | **ファイルバックアップ** | Argon2id + AES-256-GCM | 認証付き暗号化で `.marix` ファイルをエクスポート |
| 🔄 | **クラウド同期** | Argon2id + AES-256-GCM | クライアントサイド暗号化—クラウドプロバイダーは暗号化されたブロブのみ保存 |

---

## ⚡ パフォーマンスと最適化

Marix はローエンドマシンでもスムーズに動作するよう最適化されています：

### 自動チューニング KDF（ベストプラクティス）

Marix は Argon2id パラメータに**自動キャリブレーション**を使用します—これは応用暗号学で広く採用されているベストプラクティスです：

| 機能 | 説明 |
|------|------|
| **目標時間** | ユーザーのマシンで約1秒（800-1200ms） |
| **自動キャリブレーション** | 初回実行時にメモリと反復回数を自動調整 |
| **適応型** | 低スペック・高スペックマシン両方で最適動作 |
| **バックグラウンドキャリブレーション** | アプリ起動時に実行、シームレスな UX を実現 |
| **パラメータ保存** | KDF パラメータは暗号化データと共に保存、異なるマシンで復号可能 |
| **セキュリティフロア** | 最低 64MB メモリ、2回反復（OWASP 47MB を超過） |

> **なぜ約1秒？** これは実践的暗号学の標準推奨です。ユーザー体験を損なわずに強力なブルートフォース耐性を提供します。パラメータは各マシンに自動適応—「標準」設定を推測する必要はありません。

### メモリベースライン（自動チューニングの開始点）

| システム RAM | ベースラインメモリ | その後自動調整 |
|--------------|-------------------|----------------|
| ≥ 16 GB | 512 MB | → 約1sにキャリブレーション |
| ≥ 8 GB | 256 MB | → 約1sにキャリブレーション |
| ≥ 4 GB | 128 MB | → 約1sにキャリブレーション |
| < 4 GB | 64 MB | → 約1sにキャリブレーション |

### ランタイム最適化

| 最適化 | 技術 | メリット |
|--------|------|----------|
| **V8 ヒープ制限** | `--max-old-space-size=256MB` | メモリ肥大化を防止 |
| **バックグラウンドスロットリング** | `--disable-renderer-backgrounding` | 接続を維持 |
| **ターミナルバッファ** | スクロールバック：3,000 行 | デフォルトより 70% メモリ削減 |
| **遅延読み込み** | オンデマンドコンポーネント読み込み | 起動が速い |
| **GC ヒント** | 手動ガベージコレクショントリガー | メモリフットプリント削減 |

### 技術スタック

| コンポーネント | 技術 | 目的 |
|----------------|------|------|
| **フレームワーク** | Electron 39 + React 19 | クロスプラットフォームデスクトップアプリ |
| **ターミナル** | xterm.js 6 | 高性能ターミナルエミュレーション |
| **SSH/SFTP** | ssh2 + node-pty | ネイティブ SSH プロトコル実装 |
| **コードエディタ** | CodeMirror 6 | 軽量シンタックスハイライト |
| **暗号化** | Argon2 + Node.js Crypto | 強力なクライアントサイド暗号化 |
| **スタイリング** | Tailwind CSS 4 | モダンでミニマルな CSS |
| **ビルド** | Webpack 5 + TypeScript 5 | 最適化された本番バンドル |

---

## 📥 ダウンロード

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
<img src="https://img.icons8.com/external-tal-revivo-color-tal-revivo/64/external-linux-a-family-of-open-source-unix-like-operating-systems-based-on-the-linux-kernel-logo-color-tal-revivo.png" width="64"><br>
<b>Linux</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix.AppImage">.AppImage</a> •
<a href="https://github.com/user/marix/releases/latest/download/marix.deb">.deb</a> •
<a href="https://github.com/user/marix/releases/latest/download/marix.rpm">.rpm</a>
</td>
</tr>
</table>

---

## ✨ 機能

### 🔌 マルチプロトコル接続

| プロトコル | 説明 |
|------------|------|
| **SSH** | パスワードと秘密鍵認証による Secure Shell |
| **SFTP** | ドラッグ＆ドロップ対応のデュアルペインファイルマネージャー |
| **FTP/FTPS** | 標準および安全な FTP サポート |
| **RDP** | リモートデスクトップ（Linux では xfreerdp3、Windows では mstsc） |
| **データベース** | mysql2, pg, mongodb, redis, better-sqlite3 | MySQL、PostgreSQL、MongoDB、Redis、SQLiteに接続 |

### 💻 ターミナル

- **400 以上のカラーテーマ** - Dracula から Solarized、Catppuccin、Nord など
- **カスタマイズ可能なフォント** - 任意のシステムフォント、任意のサイズ
- **完全な xterm.js 6** - Unicode サポート付きの完全なターミナルエミュレーション
- **セッション保持** - 再接続後もタブが維持
- **OS 検出** - Linux ディストリビューションを自動検出＆システム情報を表示

### 📁 SFTP ファイルマネージャー

- **デュアルペインインターフェース** - ローカル ↔ リモートを並べて表示
- **統合エディタ** - 15 以上の言語シンタックスハイライト付き CodeMirror 6
- **ドラッグ＆ドロップ** - ファイルを簡単にアップロード/ダウンロード
- **権限管理** - ビジュアルインターフェース付き chmod
- **バッチ操作** - 転送用に複数ファイルを選択

### 🛠️ 内蔵ツール

#### LAN ファイル転送
*ローカルネットワーク上のデバイス間でファイルを即座に共有。*

#### LAN サーバー共有
*近くのデバイスとサーバー設定を安全に共有。*

#### DNS＆ネットワークツール
- DNS ルックアップ
- WHOIS クエリ
- ポートスキャナー
- Traceroute

#### Cloudflare DNS マネージャー
*SSH ワークスペースから直接 Cloudflare DNS を管理するオプションの内蔵ツール。*

#### SSH キーマネージャー
- SSH キーペアを生成（Ed25519、RSA、ECDSA）
- キーのインポート/エクスポート
- Known hosts を管理

#### Known Hosts マネージャー
- Known hosts の表示と管理
- 古いフィンガープリントを削除
- Known hosts のエクスポート/インポート

### 🎨 ユーザーエクスペリエンス

- **ダーク＆ライトテーマ** - システムに従うか手動で切り替え
- **14 言語**サポート
- **サーバータグ付け** - カラータグで整理
- **クイック接続** - Cmd/Ctrl+K でサーバーを検索
- **接続履歴** - 最近の接続にすばやくアクセス

---

## �� バックアップと復元

### 暗号化の仕組み

すべてのバックアップは **Argon2id**（Password Hashing Competition 優勝者）と **AES-256-GCM**（認証付き暗号化）を使用：

```
パスワード → Argon2id(64-512MB メモリ) → 256 ビットキー → AES-256-GCM → 暗号化されたバックアップ
```

### バックアップされるデータ

| データ | 含まれる | 暗号化 |
|--------|----------|--------|
| サーバーリスト（ホスト、ポート、認証情報） | ✅ | ✅ |
| SSH 秘密鍵 | ✅ | ✅ |
| Cloudflare API トークン | ✅ | ✅ |
| アプリ設定＆環境設定 | ✅ | ✅ |
| コマンドスニペット | ✅ | ✅ |
| 2FA TOTPエントリ | ✅ | ✅ |
| ポートフォワーディング設定 | ✅ | ✅ |
| Known hosts | ✅ | ✅ |

### セキュリティ保証

🔐 **パスワードは保存されない** — ファイルにも、GitHub にも、どこにもない  
🔒 **ゼロナレッジ** — Marix 開発者でさえバックアップを復号化できない  
🛡️ **ブルートフォース耐性** — Argon2id は試行ごとに 64-512MB の RAM を必要とする（自動調整）  
✅ **改ざん防止** — AES-GCM は暗号化データへのあらゆる変更を検出  
🔄 **クロスマシン互換** — バックアップは移植性のためにメモリコストを保存

---

### ローカル暗号化バックアップ

すべてのデータを暗号化された `.marix` ファイルとしてエクスポート：

1. **設定に移動** → **バックアップと復元**
2. **パスワードを作成**（要件を満たすもの）：
   - 最小 10 文字
   - 大文字 1 つ、小文字 1 つ、数字 1 つ、特殊文字 1 つ
3. **エクスポート** - 保存前にファイルが暗号化される
4. **安全に保管** - バックアップファイルを保管し、パスワードを覚えておく

---

### Google Drive バックアップ（ゼロナレッジ）

暗号化されたバックアップを Google Drive に安全に同期：

#### セットアップ

📘 **セットアップガイド**: [docs/google/GOOGLE_DRIVE_SETUP.ja.md](../docs/google/GOOGLE_DRIVE_SETUP.ja.md) を参照

ℹ️ **ビルド済みバージョン**: ビルド済みリリース（AppImage、RPM など）を使用している場合、Google 認証情報はすでに含まれています。ステップ 1 をスキップして直接接続できます。

1. **OAuth 認証情報を設定**：
   - Google Cloud プロジェクトを作成
   - Google Drive API を有効化
   - OAuth 2.0 クライアント ID を作成
   - 認証情報 JSON ファイルをダウンロード
   - `src/main/services/google-credentials.json` として保存

2. **Marix で接続**：
   - 設定 → バックアップと復元 → Google Drive に移動
   - 「Google Drive に接続」をクリック
   - ブラウザが開いて Google OAuth
   - 権限を付与
   - アプリがセキュアトークンを受信

3. **バックアップを作成**：
   - 暗号化パスワードを入力（10 文字以上）
   - 「バックアップを作成」をクリック
   - ファイルが Drive の「Marix Backups」フォルダにアップロード

4. **バックアップを復元**：
   - 「Google Drive から復元」をクリック
   - バックアップパスワードを入力
   - すべてのサーバーと設定が復元

#### 仕組み

✅ **エンドツーエンド暗号化** - データはデバイスを離れる前に暗号化  
✅ **ゼロナレッジ** - Google は暗号化されたブロブのみを見る  
✅ **あなただけがキーを持つ** - OAuth トークンはローカルに保存  
✅ **プライベートフォルダ** - ファイルはあなたのアプリからのみアクセス可能

---

### GitHub バックアップ（ゼロナレッジ）

暗号化されたバックアップをプライベート GitHub リポジトリに安全に同期：

#### セットアップ

1. **GitHub でログイン**：
   - 設定 → バックアップと復元 → GitHub バックアップに移動
   - 「GitHub でログイン」をクリック
   - デバイスコードがアプリに表示される
   - ブラウザが自動で開く - コードを入力して認証
   - 完了！プライベートリポジトリ `marix-backup` が自動作成

2. **バックアップ**：
   - 「GitHub にバックアップ」をクリック
   - バックアップパスワードを入力
   - 暗号化されたデータがリポジトリにプッシュ

3. **別のデバイスで復元**：
   - Marix をインストール
   - GitHub でログイン（同じ手順）
   - 「GitHub から復元」をクリック
   - バックアップパスワードを入力して復号化

#### GitHub が安全な理由

| レイヤー | 保護 |
|----------|------|
| **クライアントサイド暗号化** | デバイスを離れる前にデータを暗号化 |
| **Argon2id KDF** | 64-512MB メモリ（自動）、4 イテレーション、1-4 並列レーン |
| **AES-256-GCM** | ランダム IV 付き認証暗号化 |
| **GitHub ストレージ** | 暗号化された暗号文のみ保存 |
| **Marix サーバーなし** | クライアント ↔ GitHub 直接通信 |

⚠️ **重要**: バックアップパスワードを紛失した場合、バックアップは**永久に復元不可能**です。私たちは復号化できません。誰もできません。

---

## 🛡️ セキュリティ仕様

### 暗号化の詳細

| アルゴリズム | パラメータ |
|--------------|------------|
| **キー導出** | Argon2id（メモリ：64-512MB自動、イテレーション：4、並列性：1-4） |
| **対称暗号化** | AES-256-GCM |
| **ソルト** | 32 バイト（暗号学的ランダム） |
| **IV/Nonce** | 16 バイト（暗号化ごとに一意） |
| **認証タグ** | 16 バイト（GCM 認証タグ） |

### SSH キーアルゴリズム

| アルゴリズム | キーサイズ | 用途 |
|--------------|------------|------|
| **Ed25519** | 256 ビット | 推奨（高速、安全） |
| **RSA** | 2048-4096 ビット | レガシー互換性 |
| **ECDSA** | 256-521 ビット | Ed25519 の代替 |

### パスワード要件

バックアップパスワードには以下が必要：

✅ 最小 10 文字  
✅ 大文字 1 文字以上（A-Z）  
✅ 小文字 1 文字以上（a-z）  
✅ 数字 1 文字以上（0-9）  
✅ 特殊文字 1 文字以上（!@#$%^&*...）

---

## 🔧 ソースからビルド

```bash
# リポジトリをクローン
git clone https://github.com/user/marix.git
cd marix

# 依存関係をインストール
npm install

# 開発
npm run dev

# ビルド
npm run build

# 配布用にパッケージ化
npm run package:win    # Windows (.exe)
npm run package:mac    # macOS (.zip)
npm run package:linux  # Linux (.AppImage, .deb, .rpm)
```

### システム要件

|  | 最小 | 推奨 |
|--|------|------|
| **OS** | Windows 10, macOS 10.13, Ubuntu 18.04 | 最新 |
| **RAM** | 2 GB | 4 GB+ |
| **ストレージ** | 200 MB | 500 MB |

### Linux 用 RDP 依存関係

```bash
# RDP サポート用に xfreerdp3 をインストール
sudo apt install freerdp3-x11  # Debian/Ubuntu
sudo dnf install freerdp       # Fedora
sudo pacman -S freerdp         # Arch
```

---

## 📄 ライセンス

このプロジェクトは **GNU General Public License v3.0**（GPL-3.0）の下でライセンスされています。

これは以下を意味します：

✅ このソフトウェアを使用、変更、配布できます  
✅ 商用目的で使用できます  
⚠️ すべての変更も GPL-3.0 の下でリリースする必要があります  
⚠️ 配布時にソースコードを公開する必要があります  
⚠️ コードに加えた変更を明記する必要があります

完全なライセンステキストは [LICENSE](../LICENSE) を参照してください。

---

<p align="center">
  <strong>Marix</strong><br>
  モダンなゼロナレッジ SSH クライアント<br><br>
  <em>あなたのデータ。あなたの責任。あなたの自由。</em><br><br>
  プライバシーを犠牲にした便利さを求めるなら、Marix はあなた向けではありません。
</p>
