<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>현대적인 제로-놀리지 SSH 클라이언트</strong>
</p>

<p align="center">
  <em>자격 증명이 기기를 떠나지 않습니다. 클라우드 없음. 추적 없음. 타협 없음.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
</p>

---

## 🌍 다른 언어

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) | 🇪🇸 [Español](README.es.md) |
| 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) | 🇵🇭 [Filipino](README.fil.md) |
| 🇧🇷 [Português](README.pt.md) | | | |

---

## ⚠️ 면책 조항

> **귀하는 자신의 데이터에 대한 책임이 있습니다.**
>
> Marix는 강력한 암호화로 모든 데이터를 기기에 로컬로 저장합니다. 그러나:
> - 백업 비밀번호를 분실하면 **데이터를 복구할 수 없습니다**
> - **서버가 없습니다** — "비밀번호 찾기" 옵션 없음
> - **정기적으로 백업하세요** — 하드웨어가 고장날 수 있습니다
> - **보안은 귀하의 것입니다** — 도구를 제공하고, 결정은 귀하가 합니다

---

## 🔒 제로-놀리지 아키텍처

### 핵심 원칙

| | 원칙 | 설명 |
|---|------|------|
| 🔐 | **100% 오프라인** | 모든 자격 증명은 로컬에 저장—업로드 없음 |
| ☁️ | **클라우드 없음** | 서버가 없습니다. 데이터가 인터넷에 닿지 않음 |
| 📊 | **Telemetry 없음** | 추적 없음, 분석 없음, 데이터 수집 없음 |
| 🔓 | **오픈 소스** | GPL-3.0에 따라 완전히 감사 가능한 코드 |

### 암호화 기술

| | 기능 | 기술 | 설명 |
|---|------|------|------|
| 🛡️ | **로컬 저장소** | Argon2id + AES-256 | 자격 증명이 기기에서 암호화됨 |
| 📦 | **파일 백업** | Argon2id + AES-256-GCM | 암호화된 `.marix` 파일 내보내기 |
| 🔄 | **GitHub 동기화** | Argon2id + AES-256-GCM | 제로-놀리지 클라우드 백업 |

---

## ⚡ 성능 및 최적화

### 적응형 메모리 관리

| 시스템 RAM | Argon2id 메모리 | 보안 수준 |
|-----------|-----------------|----------|
| ≥ 8 GB | 64 MB | 높음 |
| ≥ 4 GB | 32 MB | 중간 |
| < 4 GB | 16 MB | 저메모리 최적화 |

### 런타임 최적화

| 최적화 | 기술 | 이점 |
|--------|------|------|
| **V8 힙 제한** | `--max-old-space-size=256MB` | 메모리 비대 방지 |
| **백그라운드 스로틀링** | `--disable-renderer-backgrounding` | 연결 유지 |
| **터미널 버퍼** | 스크롤백: 3,000줄 | 메모리 70% 감소 |
| **지연 로딩** | 필요 시 컴포넌트 로드 | 빠른 시작 |

### 기술 스택

| 구성 요소 | 기술 | 목적 |
|----------|------|------|
| **프레임워크** | Electron 39 + React 19 | 크로스 플랫폼 데스크톱 앱 |
| **터미널** | xterm.js 6 | 고성능 터미널 에뮬레이션 |
| **SSH/SFTP** | ssh2 + node-pty | 네이티브 SSH 프로토콜 구현 |
| **코드 편집기** | CodeMirror 6 | 경량 구문 강조 |
| **암호화** | Argon2 + Node.js Crypto | 강력한 client-side encryption |
| **스타일링** | Tailwind CSS 4 | 현대적이고 미니멀한 CSS |
| **빌드** | Webpack 5 + TypeScript 5 | 최적화된 프로덕션 번들 |

---

## 📥 다운로드

| OS | 다운로드 |
|----|---------|
| **Windows** | [.exe 다운로드](https://github.com/user/marix/releases/latest/download/Marix-Setup.exe) |
| **macOS** | [Intel .dmg](https://github.com/user/marix/releases/latest/download/Marix.dmg) • [Apple Silicon](https://github.com/user/marix/releases/latest/download/Marix-arm64.dmg) |
| **Linux** | [.AppImage](https://github.com/user/marix/releases/latest/download/Marix.AppImage) • [.deb](https://github.com/user/marix/releases/latest/download/marix.deb) • [.rpm](https://github.com/user/marix/releases/latest/download/marix.rpm) |

---

## ✨ 기능

### 🔌 멀티 프로토콜 연결

| 프로토콜 | 기술 | 설명 |
|----------|------|------|
| **SSH** | ssh2 + node-pty | 비밀번호 및 개인 키 인증을 지원하는 Secure Shell |
| **SFTP** | ssh2 | 드래그 앤 드롭이 가능한 듀얼 패널 파일 관리자 |
| **FTP/FTPS** | basic-ftp | 표준 및 보안 FTP 지원 |
| **RDP** | xfreerdp3 / mstsc | 원격 데스크톱 (Linux에서 xfreerdp3, Windows에서 mstsc) |

### 💻 터미널

- **400+ 컬러 테마** — Dracula, Solarized, Catppuccin, Nord...
- **사용자 지정 글꼴** — 모든 시스템 글꼴
- **전체 xterm.js 6** — 유니코드를 지원하는 완전한 터미널 에뮬레이션
- **세션 보존** — 재연결 시 탭 유지
- **OS 감지** — Linux 배포판 자동 감지

### 📁 SFTP 파일 관리자

- **듀얼 패널 인터페이스** — 로컬 ↔ 원격 나란히
- **통합 편집기** — 15개 이상 언어 구문 강조를 지원하는 CodeMirror 6
- **드래그 앤 드롭** — 파일을 쉽게 업로드/다운로드
- **권한 관리** — 시각적 chmod 인터페이스

### 🛠️ 내장 도구

- **DNS 및 네트워크**: A, AAAA, MX, TXT, SPF, CNAME, NS, SOA, PTR, Ping, Traceroute, TCP 포트, HTTP/HTTPS, SMTP, 블랙리스트, WHOIS, ARIN
- **Cloudflare DNS 관리자**: 도메인, DNS 레코드, Cloudflare 프록시 관리
- **SSH 키 관리자**: RSA-4096, Ed25519, ECDSA-521 생성, 키 가져오기/내보내기
- **알려진 호스트 관리자**: 지문 보기, 호스트에서 가져오기, 신뢰할 수 없는 호스트 삭제

---

## 💾 백업 및 복원

### 암호화 작동 방식

모든 백업은 **Argon2id**와 **AES-256-GCM**을 사용합니다:

<p align="center">
  <img src="flow.png" alt="암호화 흐름" width="800">
</p>

### 백업 내용

| 데이터 | 포함 | 암호화 |
|--------|------|--------|
| 서버 목록 | ✅ | ✅ AES-256-GCM |
| SSH 개인 키 | ✅ | ✅ AES-256-GCM |
| Cloudflare API 토큰 | ✅ | ✅ AES-256-GCM |
| 앱 설정 | ✅ | ✅ AES-256-GCM |
| 알려진 호스트 | ❌ | — |

### 보안 보장

- 🔐 **비밀번호 저장 안 함** — 파일에도, GitHub에도 없음
- 🔒 **제로-놀리지** — 개발자도 복호화 불가능
- 🛡️ **브루트 포스 저항** — Argon2id는 시도당 16-64MB RAM 필요
- ✅ **변조 방지** — AES-GCM이 모든 수정 감지

### GitHub 백업 (제로-놀리지)

1. **GitHub으로 로그인** → 기기 코드 표시 → 브라우저 열림 → 승인 → `marix-backup` 저장소 자동 생성
2. **백업**: "GitHub에 백업" 클릭 → 비밀번호 입력 → 암호화된 데이터 푸시
3. **복원**: GitHub 로그인 → "GitHub에서 복원" → 복호화를 위한 비밀번호 입력

> ⚠️ **중요**: 비밀번호를 분실하면 백업은 **영구적으로 복구 불가능**합니다. 아무도 복호화할 수 없습니다.

---

## 🛡️ 보안 사양

| 구성 요소 | 알고리즘 | 매개변수 |
|----------|----------|----------|
| 키 파생 | Argon2id | 16-64MB 메모리, 3회 반복, 4개 레인 |
| 암호화 | AES-256-GCM | 256비트 키, 인증됨 |
| 솔트 | CSPRNG | 백업당 32바이트 |
| IV/Nonce | CSPRNG | 작업당 16바이트 |

### 비밀번호 요구 사항

- ✅ 최소 10자
- ✅ 최소 1개의 대문자 (A-Z)
- ✅ 최소 1개의 소문자 (a-z)
- ✅ 최소 1개의 숫자 (0-9)
- ✅ 최소 1개의 특수 문자 (!@#$%^&*...)

---

## 🔧 소스에서 빌드

```bash
git clone https://github.com/marixdev/marix.git
cd marix
npm install
npm run dev      # 개발
npm run build    # 빌드
npm run package:linux  # 패키지
```

### Linux RDP 종속성

```bash
# Ubuntu/Debian
sudo apt install freerdp3-x11 xdotool

# Fedora
sudo dnf install freerdp xdotool

# Arch
sudo pacman -S freerdp xdotool
```

---

## 📄 라이선스

**GNU 일반 공중 사용 허가서 v3.0** (GPL-3.0)

---

<p align="center">
  <strong>Marix</strong> — 현대적인 제로-놀리지 SSH 클라이언트<br>
  <em>당신의 데이터. 당신의 책임. 당신의 자유.</em>
</p>
