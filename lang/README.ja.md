<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>モダンなゼロナレッジSSHクライアント</strong>
</p>

<p align="center">
  <em>認証情報がデバイスから出ることはありません。クラウドなし。追跡なし。妥協なし。</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
</p>

---

## 🌍 他の言語

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) | 🇪🇸 [Español](README.es.md) |
| 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) | 🇵🇭 [Filipino](README.fil.md) |
| 🇧🇷 [Português](README.pt.md) | | | |

---

## ⚠️ Disclaimer

> **You are responsible for your own data.**
>
> Marixはすべてのデータをローカルに保存します。ただし：
> - パスワードを失うと**データは復元不可**
> - **サーバーなし** — "forgot password"オプションなし
> - **定期的にバックアップ** — ハードウェアは故障する可能性がある
> - セキュリティはあなたのもの

---

## 🔒 ゼロナレッジアーキテクチャ

### コア原則

| | 原則 | 説明 |
|---|------|------|
| 🔐 | **100%オフライン** | すべての認証情報はローカルに保存—アップロードなし |
| ☁️ | **クラウドなし** | サーバーがありません。データはインターネットに触れません |
| 📊 | **No telemetry** | 追跡なし、分析なし、データ収集なし |
| 🔓 | **オープンソース** | GPL-3.0の下で完全に監査可能なコード |

### 暗号化技術

| | 機能 | 技術 | 説明 |
|---|------|------|------|
| 🛡️ | **ローカルストレージ** | Argon2id + AES-256 | 認証情報がデバイスで暗号化 |
| 📦 | **ファイルバックアップ** | Argon2id + AES-256-GCM | 暗号化された`.marix`ファイルをエクスポート |
| 🔄 | **GitHub同期** | Argon2id + AES-256-GCM | ゼロナレッジクラウドバックアップ |

---

## ⚡ パフォーマンスと最適化

### アダプティブメモリ管理

| システムRAM | Argon2idメモリ | セキュリティレベル |
|------------|---------------|------------------|
| ≥ 8 GB | 64 MB | 高 |
| ≥ 4 GB | 32 MB | 中 |
| < 4 GB | 16 MB | 低メモリ最適化 |

### ランタイム最適化

| 最適化 | 技術 | 利点 |
|--------|------|------|
| **V8ヒープ制限** | `--max-old-space-size=256MB` | メモリ肥大化を防止 |
| **バックグラウンドスロットリング** | `--disable-renderer-backgrounding` | 接続を維持 |
| **ターミナルバッファ** | スクロールバック：3,000行 | メモリ70%削減 |
| **遅延ローディング** | オンデマンドでコンポーネントをロード | 高速起動 |

### 技術スタック

| コンポーネント | 技術 | 目的 |
|--------------|------|------|
| **フレームワーク** | Electron 39 + React 19 | クロスプラットフォームデスクトップアプリ |
| **ターミナル** | xterm.js 6 | 高性能ターミナルエミュレーション |
| **SSH/SFTP** | ssh2 + node-pty | ネイティブSSHプロトコル実装 |
| **コードエディタ** | CodeMirror 6 | 軽量構文ハイライト |
| **暗号化** | Argon2 + Node.js Crypto | 強力な client-side encryption |
| **スタイリング** | Tailwind CSS 4 | モダンでミニマルなCSS |
| **ビルド** | Webpack 5 + TypeScript 5 | 最適化された本番バンドル |

---

## 📥 ダウンロード

| OS | ダウンロード |
|----|------------|
| **Windows** | [.exeをダウンロード](https://github.com/user/marix/releases/latest/download/Marix-Setup.exe) |
| **macOS** | [Intel .dmg](https://github.com/user/marix/releases/latest/download/Marix.dmg) • [Apple Silicon](https://github.com/user/marix/releases/latest/download/Marix-arm64.dmg) |
| **Linux** | [.AppImage](https://github.com/user/marix/releases/latest/download/Marix.AppImage) • [.deb](https://github.com/user/marix/releases/latest/download/marix.deb) • [.rpm](https://github.com/user/marix/releases/latest/download/marix.rpm) |

---

## ✨ 機能

### 🔌 マルチプロトコル接続

| プロトコル | 技術 | 説明 |
|----------|------|------|
| **SSH** | ssh2 + node-pty | パスワードと秘密鍵認証をサポートするSecure Shell |
| **SFTP** | ssh2 | ドラッグアンドドロップ対応のデュアルペインファイルマネージャー |
| **FTP/FTPS** | basic-ftp | 標準およびセキュアFTPサポート |
| **RDP** | xfreerdp3 / mstsc | リモートデスクトップ（Linuxではxfreerdp3、Windowsではmstsc） |

### 💻 ターミナル

- **400以上のカラーテーマ** — Dracula、Solarized、Catppuccin、Nord...
- **カスタムフォント** — 任意のシステムフォント
- **完全なxterm.js 6** — Unicode対応の完全なターミナルエミュレーション
- **セッション保持** — 再接続時にタブを維持
- **OS検出** — Linuxディストリビューションの自動検出

### 📁 SFTPファイルマネージャー

- **デュアルペインインターフェース** — ローカル ↔ リモートを並べて表示
- **統合エディタ** — 15以上の言語の構文ハイライトをサポートするCodeMirror 6
- **ドラッグアンドドロップ** — 簡単にファイルをアップロード/ダウンロード
- **権限管理** — ビジュアルなchmodインターフェース

### 🛠️ 内蔵ツール

- **DNSとネットワーク**: A、AAAA、MX、TXT、SPF、CNAME、NS、SOA、PTR、Ping、Traceroute、TCPポート、HTTP/HTTPS、SMTP、ブラックリスト、WHOIS、ARIN
- **Cloudflare DNS管理**: ドメイン、DNSレコード、Cloudflareプロキシの管理
- **SSH鍵管理**: RSA-4096、Ed25519、ECDSA-521の生成、鍵のインポート/エクスポート
- **既知のホスト管理**: フィンガープリントの表示、ホストからインポート、信頼できないホストの削除

---

## 💾 バックアップと復元

### 暗号化の仕組み

すべてのバックアップは **Argon2id** と **AES-256-GCM** を使用：

<p align="center">
  <img src="flow.png" alt="暗号化フロー" width="800">
</p>

### バックアップ内容

| データ | 含む | 暗号化 |
|--------|------|--------|
| サーバーリスト | ✅ | ✅ AES-256-GCM |
| SSH秘密鍵 | ✅ | ✅ AES-256-GCM |
| Cloudflare APIトークン | ✅ | ✅ AES-256-GCM |
| アプリ設定 | ✅ | ✅ AES-256-GCM |
| 既知のホスト | ❌ | — |

### セキュリティ保証

- 🔐 **パスワードは保存されない** — ファイルにも、GitHubにもない
- 🔒 **ゼロナレッジ** — 開発者でも復号化できない
- 🛡️ **ブルートフォース耐性** — Argon2idは試行ごとに16-64MB RAMが必要
- ✅ **改ざん防止** — AES-GCMがすべての変更を検出

### GitHubバックアップ（ゼロナレッジ）

1. **GitHubでログイン** → デバイスコード表示 → ブラウザが開く → 承認 → `marix-backup`リポジトリが自動作成
2. **バックアップ**: 「GitHubにバックアップ」クリック → パスワード入力 → 暗号化データがプッシュされる
3. **復元**: GitHubログイン → 「GitHubから復元」 → パスワード入力して復号化

> ⚠️ **重要**: パスワードを紛失すると、バックアップは**永久に復旧不能**です。誰も復号化できません。

---

## 🛡️ セキュリティ仕様

| コンポーネント | アルゴリズム | パラメータ |
|--------------|------------|-----------|
| 鍵導出 | Argon2id | 16-64MBメモリ、3回反復、4レーン |
| 暗号化 | AES-256-GCM | 256ビット鍵、認証付き |
| ソルト | CSPRNG | バックアップごとに32バイト |
| IV/Nonce | CSPRNG | 操作ごとに16バイト |

### パスワード要件

- ✅ 最低10文字
- ✅ 少なくとも1つの大文字（A-Z）
- ✅ 少なくとも1つの小文字（a-z）
- ✅ 少なくとも1つの数字（0-9）
- ✅ 少なくとも1つの特殊文字（!@#$%^&*...）

---

## 🔧 ソースからビルド

```bash
git clone https://github.com/marixdev/marix.git
cd marix
npm install
npm run dev      # 開発
npm run build    # ビルド
npm run package:linux  # パッケージ
```

### Linux RDP依存関係

```bash
# Ubuntu/Debian
sudo apt install freerdp3-x11 xdotool

# Fedora
sudo dnf install freerdp xdotool

# Arch
sudo pacman -S freerdp xdotool
```

---

## 📄 ライセンス

**GNU General Public License v3.0**（GPL-3.0）

---

<p align="center">
  <strong>Marix</strong> — モダンなゼロナレッジSSHクライアント<br>
  <em>あなたのデータ。あなたの責任。あなたの自由。</em>
</p>
