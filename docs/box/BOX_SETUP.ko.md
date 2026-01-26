# Box.net 백업 설정 가이드

> **언어**: [🇺🇸 English](BOX_SETUP.en.md) | [🇻🇳 Tiếng Việt](BOX_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](BOX_SETUP.id.md) | [🇨🇳 中文](BOX_SETUP.zh.md) | [🇰🇷 한국어](BOX_SETUP.ko.md) | [🇯🇵 日本語](BOX_SETUP.ja.md) | [🇫🇷 Français](BOX_SETUP.fr.md) | [🇩🇪 Deutsch](BOX_SETUP.de.md) | [🇪🇸 Español](BOX_SETUP.es.md) | [🇹🇭 ภาษาไทย](BOX_SETUP.th.md) | [🇲🇾 Bahasa Melayu](BOX_SETUP.ms.md) | [🇷🇺 Русский](BOX_SETUP.ru.md) | [🇵🇭 Filipino](BOX_SETUP.fil.md) | [🇧🇷 Português](BOX_SETUP.pt.md)

---

## 1단계: Box 개발자 계정 생성

1. [Box Developer Console](https://app.box.com/developers/console) 접속
2. Box 계정으로 로그인 (또는 새로 생성)
3. **"Create New App"** 클릭

## 2단계: OAuth 2.0 애플리케이션 생성

1. **"Custom App"** 선택
2. **"User Authentication (OAuth 2.0)"** 선택
3. 앱 이름 지정: `Marix SSH Client` 또는 원하는 이름
4. **"Create App"** 클릭

## 3단계: 애플리케이션 설정 구성

### 3.1. OAuth 2.0 자격 증명

1. 앱 설정에서 **"Configuration"** 탭으로 이동
2. 다음을 기록:
   - **Client ID**
   - **Client Secret** (필요한 경우 "Fetch Client Secret" 클릭)

### 3.2. OAuth 2.0 Redirect URI

1. **"OAuth 2.0 Redirect URI"**로 스크롤
2. 추가: `http://localhost` (Box는 모든 localhost 포트 허용)
3. **"Save Changes"** 클릭

### 3.3. 애플리케이션 범위

1. **"Application Scopes"**에서 다음이 활성화되어 있는지 확인:
   - ✅ Read all files and folders stored in Box
   - ✅ Write all files and folders stored in Box
2. **"Save Changes"** 클릭

## 4단계: Marix에서 자격 증명 구성

### 옵션 A: 로컬 개발

1. `src/main/services/`에 `box-credentials.json` 생성:
```json
{
  "client_id": "YOUR_BOX_CLIENT_ID",
  "client_secret": "YOUR_BOX_CLIENT_SECRET"
}
```

2. **중요**: `.gitignore`에 추가:
```
src/main/services/box-credentials.json
```

### 옵션 B: GitHub Secrets를 사용한 CI/CD (권장)

1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. 다음 secrets 추가:
   - `BOX_CLIENT_ID`: Box Client ID
   - `BOX_CLIENT_SECRET`: Box Client Secret
3. 빌드 워크플로가 빌드 중 자동으로 자격 증명을 주입

## 5단계: OAuth 흐름 테스트

1. Marix 앱 열기
2. **설정** > **백업 및 복원** > **백업 생성/복원**
3. **"Box"** 탭 선택
4. **"Box에 연결"** 클릭
5. 브라우저가 Box OAuth 화면을 엽니다
6. 로그인하고 권한 부여
7. 앱이 토큰을 받고 "연결됨" 표시

## 보안 참고 사항

- `box-credentials.json`을 Git에 커밋하지 **마세요**
- CI/CD 빌드에 **GitHub Secrets** 사용하여 client_secret 보호
- 토큰은 Electron의 safeStorage를 사용하여 안전하게 저장
- PKCE가 추가 OAuth 흐름 보안에 사용됨
- 충돌 방지를 위해 무작위 콜백 포트 사용

## 앱 승인 (선택 사항)

개인 사용의 경우 앱이 즉시 작동합니다. 공개 배포의 경우:

1. **"General Settings"** 탭으로 이동
2. 필요한 경우 앱을 검토에 제출
3. Box가 앱을 검토하고 승인

## 문제 해결

### 오류: "Invalid client_id or client_secret"
- box-credentials.json 파일의 자격 증명 확인
- Box Developer Console에서 Client ID와 Client Secret 다시 복사

### 오류: "Redirect URI mismatch"
- Box 앱 설정에 `http://localhost`가 추가되어 있는지 확인
- Box는 localhost와 함께 동적 포트 지원

### 오류: "Access denied"
- 사용자가 권한 부여 거부
- Box Developer Console에서 애플리케이션 범위 확인
