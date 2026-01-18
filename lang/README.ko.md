<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>현대적인 제로 지식 SSH 애플리케이션</strong>
</p>

<p align="center">
  <em>귀하의 자격 증명은 절대 기기를 떠나지 않습니다. 클라우드 없음. 추적 없음. 타협 없음.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
  <img src="https://img.shields.io/badge/version-1.0.4-orange" alt="Version">
</p>

<p align="center">
  <a href="https://marix.dev">🌐 Website</a> •
  <a href="#-tải-xuống">📥 다운로드</a> •
  <a href="#-tính-năng">✨ 기능</a> •
  <a href="#-thông-số-bảo-mật">🛡️ Bảo mật</a> •
  <a href="#-ngôn-ngữ-khác">🌍 Ngôn ngữ</a>
</p>

---

## 🌍 다른 언어

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) |
| 🇪🇸 [Español](README.es.md) | 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) |
| 🇵🇭 [Filipino](README.fil.md) | 🇧🇷 [Português](README.pt.md) | | |

---

## 🎯 Marix는 누구를 위한 것인가요?

- **개발자 및 DevOps 엔지니어** 여러 서버 관리
- **시스템 관리자** 보안과 성능을 중시
- **프라이버시를 중요시하는 사용자** 클라우드 솔루션을 신뢰하지 않음
- **누구나** SSH 정보를 완전히 제어하고 싶은

---

## ⚠️ 중요 공지

> **귀하는 자신의 데이터에 대해 책임이 있습니다.**
>
> Marix는 강력한 암호화로 모든 데이터를 로컬에 저장합니다. 그러나:
> - **데이터를 복구할 수 없습니다** 백업 비밀번호를 잃어버리면
> - **서버가 없습니다** - "비밀번호 찾기" 옵션 없음
> - **정기적으로 백업** - 하드웨어가 고장날 수 있음
> - **귀하가 보안을 소유합니다** - 우리는 도구를 제공하고 귀하가 결정합니다
>
> Marix를 사용함으로써 귀하는 데이터 보안에 대한 전적인 책임을 수락합니다.

---

## 🔒 제로 지식 아키텍처

> **"귀하의 키. 귀하의 서버. 귀하의 프라이버시."**

### 핵심 원칙

| | Nguyên tắc | 설명 |
|---|-----------|-------|
| 🔐 | **100% 오프라인** | 모든 정보는 기기에 로컬 저장—절대 업로드 안 함 |
| ☁️ | **클라우드 없음** | 서버가 없습니다. 데이터는 절대 인터넷에 닿지 않음 |
| 📊 | **텔레메트리 없음** | 추적 없음, 분석 없음, 데이터 수집 없음 |
| 🔓 | **오픈 소스** | GPL-3.0 하에 완전히 감사 가능한 코드, 숨겨진 백도어 없음 |

### 암호화 기술

| | 구성요소 | 기술 | 설명 |
|---|-----------|-----------|-------|
| 🛡️ | **로컬 저장소** | Argon2id + AES-256 | 기기에 저장될 때 정보 암호화 |
| 📦 | **파일 백업** | Argon2id + AES-256-GCM | 인증된 암호화로 암호화된 `.marix` 파일 내보내기 |
| 🔄 | **GitHub 동기화** | Argon2id + AES-256-GCM | 제로 지식 클라우드 백업—GitHub는 암호화된 블롭만 저장 |

---

## ⚡ 성능 및 최적화

Marix는 낮은 사양 머신에서도 원활하게 실행되도록 최적화되었습니다:

### 적응형 메모리 관리

| 시스템 RAM | Argon2id 메모리 | 보안 수준 |
|--------------|-----------------|-------------|
| ≥ 8 GB | 64 MB | 높음 |
| ≥ 4 GB | 32 MB | 중간 |
| < 4 GB | 16 MB | 낮은 RAM 최적화 |

Ứng dụng tự động phát hiện 시스템 RAM và điều chỉnh tham số mã hóa để đạt hiệu suất tối ưu trong khi vẫn duy trì bảo mật.

### 런타임 최적화

| 최적화 | 기술 | 이점 |
|---------|-----------|---------|
| **V8 Heap Limit** | `--max-old-space-size=256MB` | 메모리 부풀림 방지 |
| **Background Throttling** | `--disable-renderer-backgrounding` | 연결 유지 |
| **Terminal Buffer** | Scrollback: 3,000 lines | 기본값보다 70% 메모리 감소 |
| **Lazy Loading** | On-demand component loading | 더 빠른 시작 |
| **GC Hints** | Manual garbage collection triggers | 메모리 사용량 감소 |

### 기술 스택

| 구성요소 | 기술 | 목적 |
|------------|-----------|---------|
| **Framework** | Electron 39 + React 19 | 크로스 플랫폼 데스크톱 앱 |
| **Terminal** | xterm.js 6 | 고성능 터미널 에뮬레이션 |
| **SSH/SFTP** | ssh2 + node-pty | 네이티브 SSH 프로토콜 구현 |
| **Code Editor** | CodeMirror 6 | 가벼운 구문 강조 |
| **암호화** | Argon2 + Node.js Crypto | 강력한 클라이언트 측 암호화 |
| **Styling** | Tailwind CSS 4 | 현대적이고 미니멀한 CSS |
| **Build** | Webpack 5 + TypeScript 5 | 최적화된 프로덕션 번들 |

---

## 📥 다운로드

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

## ✨ 기능

### 🔌 다중 프로토콜 연결

| 프로토콜 | 설명 |
|-----------|-------|
| **SSH** | 비밀번호 및 개인 키 인증을 사용한 Secure Shell |
| **SFTP** | 드래그 앤 드롭이 있는 듀얼 패널 파일 관리자 |
| **FTP/FTPS** | 표준 및 보안 FTP 지원 |
| **RDP** | 원격 데스크톱 (Linux에서는 xfreerdp3, Windows에서는 mstsc) |

### 💻 터미널

- **400개 이상의 색상 테마** - Dracula에서 Solarized, Catppuccin, Nord 등
- **사용자 정의 글꼴** - 모든 시스템 글꼴, 모든 크기
- **전체 xterm.js 6** - Unicode 지원이 있는 완전한 터미널 에뮬레이션
- **세션 보존** - 재연결을 통해 탭 유지
- **OS 감지** - Linux 배포판 자동 감지 및 시스템 정보 표시

### 📁 SFTP 파일 관리자

- **듀얼 패널 인터페이스** - 로컬 ↔ 원격 나란히
- **통합 에디터** - 15개 이상의 언어 구문 강조가 있는 CodeMirror 6
- **드래그 앤 드롭** - 쉬운 파일 업로드/다운로드
- **권한 관리** - 직관적인 인터페이스가 있는 chmod
- **일괄 작업** - 전송을 위해 여러 파일 선택

### 🛠️ 내장 도구

#### LAN 파일 전송
*로컬 네트워크의 장치 간 즉시 파일 공유.*

#### LAN 서버 공유
*근처 장치와 안전하게 서버 구성 공유.*

#### DNS 및 네트워크 도구
- DNS lookup
- WHOIS query
- Port scanner
- Traceroute

#### Cloudflare DNS 관리자
*SSH 작업 공간에서 직접 Cloudflare DNS를 관리하는 선택적 통합 도구.*

#### SSH 키 관리자
- Tạo cặp SSH key (Ed25519, RSA, ECDSA)
- Import/export keys
- Quản lý known hosts

#### Known Hosts 관리자
- Xem và quản lý known hosts
- Xóa fingerprints cũ
- Export/import known hosts

### 🎨 사용자 경험

- **다크 및 라이트 테마** - 시스템 따르기 또는 수동 전환
- **14개 언어** 지원
- **서버 태그** - 색상 태그로 정리
- **빠른 연결** - Cmd/Ctrl+K로 서버 검색
- **연결 기록** - 최근 연결에 빠르게 액세스

---

## 💾 백업 및 복원

### 암호화 작동 방식

모든 백업은 **Argon2id**(Password Hashing Competition 우승자) 및 **AES-256-GCM**(인증된 암호화)을 사용합니다:

```
Password → Argon2id(16-64MB memory) → 256비트 key → AES-256-GCM → Encrypted backup
```

### 백업되는 데이터

| 데이터 | 예 | 암호화 |
|---------|:--:|:------:|
| 서버 목록 (호스트, 포트, 자격 증명) | ✅ | ✅ |
| SSH 개인 키 | ✅ | ✅ |
| Cloudflare API 토큰 | ✅ | ✅ |
| 앱 설정 및 기본 설정 | ✅ | ✅ |
| Known hosts | ✅ | ✅ |

### 보안 보장

🔐 **비밀번호는 절대 저장되지 않음** — 파일, GitHub, 그 어디에도 없음  
🔒 **제로 지식** — Marix 개발자조차 귀하의 백업을 해독할 수 없음  
🛡️ **무차별 대입 방지** — Argon2id는 시도당 16-64MB RAM 필요  
✅ **변조 방지** — AES-GCM은 암호화된 데이터의 모든 수정을 감지  
🔄 **다중 머신 호환** — 백업은 이식성을 위해 메모리 비용 저장

---

### 로컬 암호화 백업

모든 데이터를 암호화된 `.marix` 파일로 내보내기:

1. **설정으로 이동** → **백업 및 복원**
2. **비밀번호 생성** 요구 사항 충족:
   - 최소 10자
   - 대문자 1개, 소문자 1개, 숫자 1개, 특수 문자 1개
3. **내보내기** - 저장 전 파일 암호화
4. **안전하게 저장** - 백업 파일 보관 및 비밀번호 기억

---

### Google Drive 백업 (제로 지식)

암호화된 백업을 Google Drive에 안전하게 동기화:

#### 설정

📘 **설정 가이드**: Xem [docs/google/GOOGLE_DRIVE_SETUP.vi.md](../docs/google/GOOGLE_DRIVE_SETUP.vi.md) để được hướng dẫn chi tiết.

ℹ️ **사전 빌드 버전**: 사전 빌드 버전(AppImage, RPM 등)을 사용하는 경우 Google 자격 증명이 사전 통합되어 있습니다. 1단계를 건너뛰고 직접 연결할 수 있습니다.

1. **OAuth 자격 증명 구성**:
   - Google Cloud 프로젝트 생성
   - Google Drive API 활성화
   - OAuth 2.0 클라이언트 ID 생성
   - 자격 증명 JSON 파일 다운로드
   - `src/main/services/google-credentials.json`으로 저장

2. **Marix에서 연결**:
   - 설정 → 백업 및 복원 → Google Drive로 이동
   - "Google Drive 연결" 클릭
   - Google OAuth를 위한 브라우저 열기
   - 액세스 권한 부여
   - 앱이 보안 토큰 수신

3. **백업 생성**:
   - 암호화 비밀번호 입력 (10자 이상)
   - "백업 생성" 클릭
   - 파일이 Drive의 "Marix Backups" 폴더에 업로드됨

4. **백업 복원**:
   - "Google Drive에서 복원" 클릭
   - 백업 비밀번호 입력
   - 모든 서버 및 설정 복원됨

#### 작동 방식

✅ **암호화 đầu cuối** - 데이터 được mã hóa trước khi rời thiết bị  
✅ **제로 지식** - Google은 암호화된 블롭만 확인  
✅ **귀하만 키 보유** - OAuth 토큰은 로컬에 저장  
✅ **비공개 폴더** - 귀하의 앱만 파일에 액세스 가능

---

### GitHub 백업 (제로 지식)

암호화된 백업을 비공개 GitHub 저장소에 안전하게 동기화:

#### 설정

1. **GitHub로 로그인**:
   - 설정 → 백업 및 복원 → GitHub 백업으로 이동
   - "GitHub로 로그인" 클릭
   - 앱에 기기 코드가 표시됨
   - 브라우저 자동 열림 - 코드 입력 및 승인
   - 완료! 비공개 저장소 `marix-backup` 자동 생성됨

2. **백업**:
   - "GitHub에 백업" 클릭
   - 백업 비밀번호 입력
   - 데이터 mã hóa được push lên repository

3. **다른 기기에서 복원**:
   - Marix 설치
   - GitHub로 로그인 (동일한 단계)
   - "GitHub에서 복원" 클릭
   - 백업 비밀번호 입력 để giải mã

#### GitHub가 안전한 이유

| 계층 | 보호 |
|-----|--------|
| **암호화 client-side** | 데이터 mã hóa trước khi rời thiết bị |
| **Argon2id KDF** | 16-64MB 메모리, 3회 반복, 4개 병렬 레인 |
| **AES-256-GCM** | 무작위 IV를 사용한 인증된 암호화 |
| **GitHub 저장소** | 암호화된 암호문만 저장됨 |
| **Marix 서버 없음** | 클라이언트 ↔ GitHub 직접 통신 |

⚠️ **중요**: 백업 비밀번호를 잃어버리면 백업은 **영구적으로 복구할 수 없습니다**. 우리는 해독할 수 없습니다. 아무도 할 수 없습니다.

---

## 🛡️ 보안 사양

### 암호화 세부 정보

| 알고리즘 | 매개변수 |
|------------|----------|
| **키 파생** | Argon2id (memory: 16-64MB, iterations: 3, parallelism: 4) |
| **대칭 암호화** | AES-256-GCM |
| **솔트** | 32바이트 (암호학적 무작위) |
| **IV/Nonce** | 16바이트 (암호화당 고유) |
| **인증 태그** | 16바이트 (GCM 인증 태그) |

### 알고리즘 SSH Key

| 알고리즘 | 키 크기 | 사용 사례 |
|------------|----------------|---------------------|
| **Ed25519** | 256비트 | 권장 (빠르고 안전함) |
| **RSA** | 2048-4096비트 | 레거시 호환성 |
| **ECDSA** | 256-521비트 | Ed25519 대안 |

### 비밀번호 요구 사항

백업 비밀번호에 포함되어야 할 사항:

✅ 최소 10자  
✅ 최소 1개의 대문자 (A-Z)  
✅ 최소 1개의 소문자 (a-z)  
✅ 최소 1개의 숫자 (0-9)  
✅ 최소 1개의 특수 문자 (!@#$%^&*...)

---

## �� Build từ Source

```bash
# 저장소 복제
git clone https://github.com/user/marix.git
cd marix

# 종속성 설치
npm install

# 개발
npm run dev

# 빌드
npm run build

# 배포용 패키징
npm run package:win    # Windows (.exe)
npm run package:mac    # macOS (.zip)
npm run package:linux  # Linux (.AppImage, .deb, .rpm)
```

### 시스템 요구 사항

|  | 최소 | 권장 |
|--|-----------|-------------|
| **OS** | Windows 10, macOS 10.13, Ubuntu 18.04 | 최신 |
| **RAM** | 2 GB | 4 GB+ |
| **Lưu trữ** | 200 MB | 500 MB |

### Linux용 RDP 종속성

```bash
# RDP 지원을 위한 xfreerdp3 설치
sudo apt install freerdp3-x11  # Debian/Ubuntu
sudo dnf install freerdp       # Fedora
sudo pacman -S freerdp         # Arch
```

---

## 📄 라이선스

이 프로젝트는 **GNU General Public License v3.0** (GPL-3.0) 하에 라이선스가 부여됩니다.

이것은 다음을 의미합니다:

✅ 이 소프트웨어를 사용, 수정 및 배포할 수 있습니다  
✅ 상업적 목적으로 사용할 수 있습니다  
⚠️ 모든 수정 사항도 GPL-3.0 하에 릴리스되어야 합니다  
⚠️ 배포 시 소스 코드를 공개해야 합니다  
⚠️ 코드에 대한 변경 사항을 명시해야 합니다

전체 라이선스 텍스트는 [LICENSE](../LICENSE)를 참조하십시오.

---

<p align="center">
  <strong>Marix</strong><br>
  현대적인 제로 지식 SSH 애플리케이션<br><br>
  <em>데이터 của bạn. Trách nhiệm của bạn. Tự do của bạn.</em><br><br>
  프라이버시를 희생하는 편의성을 원한다면 Marix는 귀하를 위한 것이 아닙니다.
</p>
