# Wearable Ultrasound

웨어러블 초음파 작업을 체크리스트로 기록하는 웹앱. PC (Chrome)와 iPhone (Safari)에 앱처럼 설치되고, 오프라인에서도 되고, 로그인하면 정인과 같은 기록을 같이 봐요. Planner(캘린더) 앱과 같은 구조라 HTML · CSS · JavaScript만 쓰고 빌드 단계가 없어요.

앱 주소: https://mido-kim.github.io/ultrasound/

## 홈 화면

- **회로 보드 검증.** 납땜이 끝난 보드를 등록하면 보드마다 체크리스트가 생겨요.
  - 메인 보드: 1 눈으로 확인 → 2 저항 재기 → 3 메인 보드 켜기 → 4 펌웨어 올리기
  - HV 보드: 1 눈으로 확인 → 2 저항 재기 → 3 HV 보드 켜기
  - 연결 테스트 (메인 + HV): 1 고전압 경로 → 2 ±48 V 스택 → 3 어레이 연결 · 영상
  - 측정 항목은 값을 넣으면 "범위 안 / 범위 밖"이 떠요. 통과 · 문제는 사람이 눌러요.
  - 앞 단계가 안 끝났거나 HV가 50 V를 넘으면 경고가 떠요.
  - "보드 지도 · 표"에 테스트 포인트 위치, 커넥터 · 점퍼 표, 전원 순서가 있어요.
- **어레이 제작**, **팬텀 제작.** 프로토콜 단계는 앱에서 직접 적어요 (단계 편집). 배치 (B1, B2…)나 팬텀 (P1, P2…)을 만들 때마다 그 단계로 체크리스트가 생겨요.
  - 단계마다 완료 · 문제 · 건너뜀, 값 (켜 둔 단계만), 메모를 남겨요.
  - 단계를 고치면 모든 배치에 바로 보여요. 기록이 있는 단계를 지우면 그 배치에는 "프로토콜에서 뺀 단계"로 남아요.
- **설정.** 이름, 테마, 계정 · UID, 결과표 CSV, JSON 백업 · 복원.

보드 검증 절차의 출처는 `../us_control_v5.4_pcb_bringup_guide.html`. 절차를 바꾸면 `js/steps.js`와 `js/guide.js`를 고쳐요.

## 이 PC에서 실행

```
python -m http.server 5174
```

http://localhost:5174 를 열어요. "로그인 없이 이 기기에서만 쓰기"로 동기화 없이 써 볼 수 있어요. 로직 테스트는 http://localhost:5174/tests/ (탭 제목에 PASS/FAIL 개수).

## 정인과 같이 쓰기 (Firebase, 한 번만)

이 앱 전용 Firebase 프로젝트 `ultrasound-ebd93`을 써요. Planner와는 계정도 데이터도 따로예요.

콘솔에서 해 둘 것: Authentication의 이메일/비밀번호 로그인 켜기, Firestore 데이터베이스 만들기 (프로덕션 모드), Authentication → Settings → 승인된 도메인에 `mido-kim.github.io`.

1. 두 사람 모두 앱에서 **계정 만들기**. 새 계정 만들기가 막혀 있으면 콘솔 → Authentication → Users → **사용자 추가**.
2. 각자 **설정 → 동기화**에서 UID 확인. 규칙을 넣기 전에는 "공유 기록을 볼 수 없어요"가 떠요. 정상이에요.
3. Firebase 콘솔 → Firestore → **규칙**을 [firestore.rules](firestore.rules) 전체로 바꾸고 `MIDO_UID` · `JEONGIN_UID`를 두 UID로 고쳐 **게시**. 설정의 "규칙 복사"를 써도 돼요 ('상대방 UID'만 고치면 됨).
4. 앱을 새로고침하면 둘이 같은 기록을 봐요.

## 올리기 (GitHub Pages)

저장소는 https://github.com/mido-kim/ultrasound, 이 폴더가 저장소 루트예요. Pages는 `main` 브랜치 `/ (root)`에서 나가요. 고친 뒤 `git push`만 하면 되고, 기기는 다음에 온라인으로 열 때 새 버전을 받아요.

## 설치

- **iPhone:** Safari로 열고 공유 → **홈 화면에 추가**. 항상 그 아이콘으로 열어요.
- **PC (Chrome):** 주소창 오른쪽 설치 아이콘.

## 파일

| 파일 | 하는 일 |
|---|---|
| `index.html`, `css/app.css` | 페이지와 스타일 (밝게 · 어둡게) |
| `js/main.js` | 시작, 로그인, 화면 전환, 모든 화면, 입력 |
| `js/steps.js` | 보드 검증 단계와 항목 (문구, 기준, 측정 범위) |
| `js/judge.js` | 측정값 읽기와 범위 확인 |
| `js/records.js` | 보드 진행률, 앞 단계 경고, 50 V 경고, 기록 쓰기 |
| `js/protocols.js` | 어레이 · 팬텀 프로토콜과 배치 |
| `js/backup.js` | 결과표 CSV, JSON 백업 |
| `js/guide.js` | 보드 지도와 표 |
| `js/store.js`, `js/cloud.js` | 이 기기 저장 / Firebase 공유 저장 (같은 인터페이스) |
| `js/config.js` | Firebase 프로젝트 (`ultrasound-ebd93`) |
| `sw.js`, `manifest.webmanifest`, `icons/` | 오프라인과 설치 |
| `firestore.rules` | Firebase 규칙 전체 |
