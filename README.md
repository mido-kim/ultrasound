# US Control 브링업

US Control 메인 v5.4 · HV v5.1 PCB를 **보드마다** 단계별로 검증하고 결과를 기록하는 웹앱입니다. PC(Chrome)와 iPhone(Safari)에서 앱처럼 설치되고, 오프라인에서도 동작하며, 로그인하면 정인과 같은 기록을 함께 보고 고칩니다. 구조는 Planner(캘린더) 앱과 같습니다: HTML · CSS · JavaScript만 쓰고, 빌드 단계도 설치할 것도 없습니다.

- **보드 단위 기록.** 메인 #1 · #2, HV #1 · #2, 그리고 두 보드를 묶은 시스템 #1 · #2. 메인은 단계 0 · 1 · 3 · 4, HV는 단계 0 · 1 · 2, 시스템은 단계 5 · 6 · 7을 거칩니다. "2세트 기본 구성 만들기" 버튼으로 여섯 개를 한 번에 만듭니다.
- **단계마다 연결 상태 · 주의 사항 · 단계별 할 일과 합격 기준.** 각 항목에 측정값, 합격 / 불합격 / 건너뜀, 메모를 남기고, 누가 언제 기록했는지 함께 저장됩니다.
- **범위 자동 확인.** 측정 항목은 합격 범위가 있어서 값을 넣으면 "범위 안 / 범위 밖"이 바로 뜹니다. 한 칸에 여러 값을 넣을 수 있고(`9.98k, 10.02k`), 단위 접두사(k, M, m, µ)를 알아듣습니다. 결과(합격 · 불합격)는 사람이 정합니다.
- **앞 단계 경고.** 앞 단계가 다 합격하지 않았으면 경고가 뜹니다. 시스템은 묶인 메인 · HV 보드의 단계까지 봅니다(규칙 1: 전압은 직전 단계가 합격했을 때만 올린다).
- **50 V 경고.** HV 스택 실측값이 어레이 FFC 커넥터 정격 50 V를 넘으면 보드 목록과 보드 화면에 표시됩니다.
- **가이드.** 축척을 맞춘 두 보드의 지도(테스트 포인트 · 커넥터 · 점퍼 · 1번 핀), 커넥터 · 점퍼 · TP 표, 전원 순서, 증상별 점검, v5 가이드에서 바뀐 것.
- **내보내기.** 결과표 CSV(엑셀용), JSON 백업과 복원.

절차의 출처는 `../us_control_v5.4_pcb_bringup_guide.html`(그리고 그 바탕인 `../us_control_v5_build_guide.html` Rev 0.3)입니다. 절차를 바꾸면 `js/steps.js`와 `js/guide.js`를 고칩니다.

## 이 PC에서 실행

이 폴더에서:

```
python -m http.server 5174
```

http://localhost:5174 를 엽니다. 로그인 화면에서 "로그인 없이 이 기기에서만 쓰기"를 누르면 동기화 없이 써 볼 수 있습니다. 로직 테스트는 http://localhost:5174/tests/ (페이지 제목에 PASS/FAIL 개수).

## 정인과 공유하기 (Firebase, 한 번만)

이 앱 전용 Firebase 프로젝트(`ultrasound-ebd93`)를 씁니다. Planner의 Firebase 프로젝트와는 계정도 데이터도 따로입니다. Planner에 로그인해 있어도 이 앱에는 따로 로그인합니다. 기록은 `bringup/us-control-v5/…`에 저장됩니다.

콘솔에서 미리 해 둔 것: Authentication의 이메일/비밀번호 로그인 켜기, Firestore 데이터베이스 만들기(프로덕션 모드), Authentication → Settings → 승인된 도메인에 `mido-kim.github.io` 추가.

1. **각자 계정.** 두 사람 모두 앱의 로그인 화면에서 **계정 만들기**를 한 번 합니다. Planner와 같은 이메일을 써도 되지만, 별개의 계정입니다. 콘솔에서 새 계정 만들기를 꺼 두었다면 Firebase 콘솔 → Authentication → Users → **사용자 추가**로 만들어 주세요.
2. **UID 확인.** 두 사람이 각자 로그인해서 **설정 → 동기화**의 UID를 확인합니다(Firebase 콘솔 → Authentication → Users의 "사용자 UID"와 같은 값). 처음에는 "공유 기록에 접근할 수 없습니다"가 뜨는 것이 정상입니다.
3. **규칙 게시.** Firebase 콘솔 → Firestore Database → **규칙** 탭에서 내용을 [firestore.rules](firestore.rules) 전체로 바꾸고, `MIDO_UID` · `JEONGIN_UID`를 두 UID로 고친 뒤 **게시**합니다.
4. 앱을 새로고침하면 두 계정이 같은 보드와 기록을 봅니다. 한쪽이 기록하면 다른 쪽 화면에도 바로 나타납니다.

설정 → 동기화의 "규칙 복사" 버튼은 내 UID를 채운 규칙 전체를 복사합니다. 붙여 넣고 '상대방 UID'만 고치면 됩니다.

## 온라인에 올리기 (GitHub Pages)

저장소는 https://github.com/mido-kim/ultrasound 이고, 이 폴더가 저장소의 루트입니다.

1. GitHub → 저장소 Settings → Pages → Source: "Deploy from a branch" → `main`, `/ (root)` → Save. 1~2분 뒤 https://mido-kim.github.io/ultrasound/ 에 앱이 열립니다.
2. Firebase 콘솔 → Authentication → Settings → 승인된 도메인(Authorized domains)에 `mido-kim.github.io`가 있어야 합니다.

나중에 고치면 `git push`만 하면 되고, 기기는 다음에 온라인으로 열 때 새 버전을 받습니다.

## 설치

- **iPhone:** Safari로 열고 공유 → **홈 화면에 추가**. 항상 그 아이콘으로 엽니다.
- **PC (Chrome):** 주소창 오른쪽 설치 아이콘.

## 구성

| 파일 | 하는 일 |
|---|---|
| `index.html`, `css/app.css` | 페이지와 스타일 (밝게 · 어둡게) |
| `js/main.js` | 시작, 로그인, 화면 전환, 보드 · 단계 · 설정 화면, 입력 |
| `js/steps.js` | 단계와 항목 (문구, 합격 기준, 측정 범위) |
| `js/judge.js` | 측정값 읽기와 범위 확인 |
| `js/records.js` | 진행률, 앞 단계 경고, 50 V 경고, 쓰기, CSV · 백업 |
| `js/guide.js` | 가이드 화면 (보드 지도와 표) |
| `js/store.js`, `js/cloud.js` | 이 기기 저장 / Firebase 공유 저장 (같은 인터페이스) |
| `sw.js`, `manifest.webmanifest`, `icons/` | 오프라인과 설치 |
| `js/config.js` | 이 앱의 Firebase 프로젝트 (`ultrasound-ebd93`) |
| `firestore.rules` | Firebase 규칙 전체 |
