# Changelog

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
