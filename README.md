# 월드컵 가상 포인트 예측 게임

Vite + React로 만든 월드컵 승무패 예측 게임입니다. 실제 돈, 현금성 포인트, 상품권, 암호화폐, 환전, 출금 기능을 제공하지 않는 가상 포인트 예측 게임으로만 동작합니다.

## 주요 기능

- 경기 목록과 승 / 무 / 패 예측 제출
- 경기 시작 시간 이후 예측 차단
- 동일 사용자, 동일 경기 중복 예측 차단
- 누적 포인트 풀 기반 예상 배당률 표시
- 사용자별 예측 내역과 현재 포인트 조회
- 관리자 경기 생성, 상태 변경, 결과 입력, 정산
- Google Apps Script Web App을 통한 Google Sheets 저장

## Google Sheets 구조

다음 시트는 `google-apps-script/Code.js`의 `setupSheets()`가 자동으로 생성하거나 헤더를 맞춥니다.

### matches

`id`, `home_team`, `away_team`, `starts_at`, `status`, `result`, `settled`, `created_at`

### predictions

`id`, `match_id`, `user_name`, `choice`, `points`, `created_at`, `payout`, `settled`

### users

`user_name`, `points`, `updated_at`

### audit_logs

`id`, `action`, `payload_json`, `created_at`

## Google Apps Script 설정

1. Google Sheets에서 Apps Script 프로젝트를 생성합니다.
2. [google-apps-script/Code.js](google-apps-script/Code.js)의 코드를 붙여 넣습니다.
3. Apps Script 프로젝트 설정의 Script properties에 값을 추가합니다.
   - `ADMIN_PASSWORD`: 관리자 페이지에서 사용할 비밀번호
   - `SHEET_ID`: 선택 사항입니다. 스프레드시트에 바인딩된 Apps Script라면 생략할 수 있습니다.
4. Web App으로 배포합니다.
   - Execute as: Me
   - Who has access: 앱 운영 정책에 맞게 선택
5. 배포 URL을 `.env`에 설정합니다.

```bash
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

## 로컬 실행

```bash
npm install
npm run dev
```

## GitHub Pages 배포

`.github/workflows/deploy-pages.yml`가 `main` 브랜치에 push될 때 자동으로 `dist`를 빌드해 GitHub Pages에 배포합니다.

1. GitHub 저장소의 `Settings > Pages`에서 Source를 `GitHub Actions`로 설정합니다.
2. `Settings > Secrets and variables > Actions`에 Repository secret을 추가합니다.
   - `VITE_APPS_SCRIPT_URL`: Apps Script Web App 배포 URL
   - URL은 `https://script.google.com/macros/s/.../exec` 형식이어야 합니다. 브라우저에서 복사한 `https://script.google.com/macros/u/1/s/.../exec` 형식은 사용하지 않습니다.
3. `main` 브랜치에 push하거나 Actions 탭에서 `Deploy to GitHub Pages` 워크플로를 수동 실행합니다.

이 저장소가 기본 GitHub Pages 주소로 배포되면 URL은 보통 다음 형식입니다.

```text
https://summer0701.github.io/worldCupBetting/
```

GitHub Pages에서 `/my`, `/admin` 같은 SPA 경로를 직접 열어도 동작하도록 빌드 시 `dist/404.html`을 자동 생성합니다.

## 테스트

렌더링, 브라우저, E2E, 스냅샷 테스트는 실행하지 않습니다. 계산 유틸만 대상으로 한 순수 단위 테스트를 실행합니다.

```bash
npx vitest run src/lib/payout.test.js
```

## 배포 주의사항

- Google Sheets API 키를 프론트엔드에 노출하지 않습니다.
- 프론트엔드는 Apps Script Web App URL만 호출합니다.
- 관리자 액션은 Apps Script에서 `ADMIN_PASSWORD`로 다시 검증합니다.
- 포인트 부족, 경기 시작 이후 제출, 중복 예측, 중복 정산은 서버 쪽에서 검증합니다.
- 이 앱은 현금 환전 불가, 오락/예측 게임용 가상 포인트만 사용하는 서비스입니다.
