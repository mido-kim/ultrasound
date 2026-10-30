# Changelog

## 0.7.5 — 2026-10-31

- 4단계: steps 4-1 and 4-6 match the new firmware (`firmware/us_control_v5_fw`).
  4-1 passes when the COM port "US Control v5" appears (the VND042 has no
  PC13 LED). 4-6 is `X` → `?`, since `R` fires continuously in this
  firmware. Step ids unchanged.
- The stage 4 "먼저" note and the guide's open list no longer say the
  firmware was never compiled: it builds, and hasn't run on a board yet.

## 0.7.4 — 2026-10-28

- 어레이 설계: a note at the top for JLC orders: gold finger thickness 0.30 mm,
  PI stiffener 0.25 mm (JLC's PI calculator for a 1-layer 0.11 mm FPC; the
  0.225 in the stiffener file names is the old value). The README copies the
  site still serves for v2-1 to v2-3 say the same.

## 0.7.3 — 2026-10-28

- 어레이 설계: version 2-5 (v2-4 with the traces bending right under the
  ACF row and then running straight down, and 1.5 mm round element pads)
  joins the 설정 → 자료 옮기기 list and 목차's starting list.

## 0.7.2 — 2026-10-28

- 어레이 설계: version 2-4 (v2-1 with the ACF row 50 mm from the
  elements) joins the 설정 → 자료 옮기기 list. 목차's starting list has
  v2-4 too.

## 0.7.1 — 2026-10-28

- 어레이 설계: version 3-4 (v3-3 with the traces left and right as mirror
  images; the two left columns are numbered from the far row) joins the
  설정 → 자료 옮기기 list. 목차's starting list has v3-4 too.

## 0.7.0 — 2026-10-28

- **홈 그림 여러 장**: 그림 편집 → + 그림 (5 MB까지), ← → 순서, 편집에서
  설명 · 누르면 갈 곳 · 크기 (넓게 = 한 줄 전체, 반쪽 = 옆에 하나 더).
  "홈에 표시" now adds a picture instead of replacing the one there. The first
  picture is still stored where 0.6 and older read it, so they show that one.
- **메모판** on the home screen: notes for everyone, with the writer's name and
  time. Anyone can remove a note (it asks first); only the writer can change it.
  Same records as the item notes (`notes`, target `home`).
- **목차**: the Google Drive folder tree, as a toggle list. "Drive 폴더 목록
  넣기" starts it with the Drive layout (미팅 자료, 어레이 설계/v1…v3-3, 회로
  보드, 측정 데이터, 논문 · 참고 자료). Each folder has a pencil (name,
  where it sits, a memo, its Drive link; delete) and a link button to its Drive
  folder. In the memo, drag over words and press a color; the default is dark
  gray. Which folders are open is kept per device.
- Home order: pictures, 메모판, 목차, then the five cards.

## 0.6.1 — 2026-10-28

- 어레이 설계: versions 3-1, 3-2 and 3-3 (4 × 4 elements) join the 설정 →
  자료 옮기기 list, with their preview pictures and Gerber renders. Their
  files (JLC zips, KiCad, README, generator) are in Drive, listed in each
  version's "Drive 폴더 안 파일".

## 0.6.0 — 2026-10-26

- **메모**: every meeting and design version has a notes thread at the bottom.
  Both people can add notes; each shows who wrote it and when, and can be
  deleted. Each note is its own record (`notes`), so two people writing at
  once never overwrite each other. Deleting a meeting or version deletes its notes.
- A half-typed note survives redraws (another person's change, going
  offline), and pressing 추가 right after typing is not lost (as in 0.5.2).

## 0.5.3 — 2026-10-26

- Fix: an account that signed in but isn't in the Firestore rules yet stayed on
  "불러오는 중…" forever. Only 4 of the 9 collections started empty, so the home
  screen broke before any data came. Now it shows "이 계정은 아직 공유 기록을
  볼 수 없어요", and 설정 shows the UID to put in the rules.

## 0.5.2 — 2026-10-26

- Fix: typing a value and pressing 통과 / 문제 / 건너뜀 right away (within about
  a second) lost the click. The value was saved but the status wasn't. The same
  happened in 단계 편집: "+ 단계" right after typing did nothing, and the next
  typing went nowhere. The field now keeps focus until the button's click lands.

## 0.5.1 — 2026-10-26

- Tests: the file-size check skips files the server sends compressed
  (GitHub Pages gzips .md and .svg), which showed a false failure on the live site.

## 0.5.0 — 2026-10-26

- Files live in **Google Drive**; the app is the map. 미팅 자료 and 어레이 설계
  are now records you add and edit in the app: title, date, notes, a **Drive
  folder link**, other links (Google Slides, Notion, …), the list of files in
  that folder, and **preview pictures** (up to 5 MB each, kept in Firestore,
  cut into chunks under its 1 MiB document limit).
- **자료 지도** (home card): where everything lives — Drive, Notion, PC
  folders, GitHub, Firebase — with a starting list and editing.
- Any preview picture can be put on the home screen ("홈에 표시").
- 설정 → **자료 옮기기**: a one-time move of what the site used to serve into
  these records (pictures to Firestore, other files listed for Drive).
- Meetings, designs and pictures need sign-in; only the two allowed accounts see them.
- `?dev` on localhost runs the app on an in-memory store, for trying the file screens.

## 0.4.0 — 2026-10-25

- **미팅 자료**: a meeting slides archive (home card and page). Each meeting has
  a link to the original Google Slides and the PPTX to download, under its
  original file name. First entry: 2026-09-11 진행 사항.
- The home screen shows the 진행 사항 overview slide at the top.
- Slide decks download straight from the server; the offline cache skips them.

## 0.3.0 — 2026-10-25

- 어레이 제작 → **설계 파일**: array versions 1, 2-1, 2-2 and 2-3 with
  preview pictures (Gerber renders and the stack diagrams) and their files to
  download: JLC Gerber zips, KiCad boards, order notes, the v2 generator, and
  for version 1 the EasyEDA Gerbers, AutoCAD drawing and DXFs.
- A test checks that every listed picture and file is on the server at the
  listed size.

## 0.2.0 — 2026-10-25

- Renamed to **Wearable Ultrasound**. A home screen leads to three parts:
  회로 보드 검증, 어레이 제작, 팬텀 제작.
- 어레이 제작 · 팬텀 제작: write the protocol steps in the app (headings,
  steps, an optional value field with a unit; move and delete). Each batch
  (B1, B2…) or phantom (P1, P2…) gets a checklist with 완료 / 문제 / 건너뜀,
  value and note. Editing a step shows everywhere; a deleted step that has a
  record stays in that batch, marked.
- Board checks: "+ 메인 보드" / "+ HV 보드" add a board in one tap;
  "+ 연결 테스트" pairs a main and an HV board. The 2-set starter is gone.
  Stages are numbered from 1 per board, buttons read 통과 / 문제 / 건너뜀.
- Shorter, plainer wording across the app; Korean text no longer in the mono
  font.
- CSV and JSON backup cover batches and protocols too; 0.1 backups still load.
- The offline cache fetches fresh copies when it updates.

## 0.1.1 — 2026-10-25

- Own Firebase project (`ultrasound-ebd93`), apart from Planner's: separate
  accounts, and `firestore.rules` holds only this app's rule. "규칙 복사" in
  설정 now copies the whole rule set.

## 0.1.0 — 2026-10-23

First version, made from `us_control_v5.4_pcb_bringup_guide.html`.

- Boards: 메인 v5.4, HV v5.1, and 시스템 (a main + HV pair); "2세트 기본 구성"
  makes 메인 #1 · #2, HV #1 · #2 and 시스템 #1 · #2 at once.
- Per board: stages with connection setup, notes, steps, pass criteria; each
  step takes a measured value, pass / fail / skip, a note, and keeps who and when.
- Measured steps check their range as you type ("범위 안 / 범위 밖"); several
  values per field and SI prefixes are understood.
- Warnings when an earlier stage hasn't passed (a system also checks its pair)
  and when an HV reading is above the FFC connector's 50 V rating.
- Guide screen: to-scale board maps, connector / jumper / test point tables,
  power order, symptoms, what changed from the perfboard guide.
- Shared records through Firebase (same project as Planner, UID allowlist in
  `firestore.rules`), or this device only. Works offline; installs on PC and
  iPhone.
- CSV results table and JSON backup / restore.
