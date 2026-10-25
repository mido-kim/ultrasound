# Changelog

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
