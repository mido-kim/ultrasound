# Changelog

## 0.14.0 — 2026-11-09

- For firmware **v3** (`../firmware/us_control_v5_fw_v3`, not yet on a board):
  **pair lines**, to look at crosstalk. 펌웨어 콘솔 has a new row, **수신
  소자** (같은 소자 or any element, in 채널 맵 order), next to 송신 소자. A and
  M only; older firmware shows it off.
- The board has one BUS, so the firmware moves the MUX 10 µs after the burst
  end. The graph marks that time ("수신 소자로"), and the switches take up to
  4 µs more; what comes before is still the element that fired.
- The status shows 수신 소자; the line's readout shows `송신 → 수신`; file
  names say `…_EL1_to_EL2_…`. 이 줄 CSV of a pair line adds `rx_ch` (which
  channel each sample came from); a recording with pair lines adds `rx_ch`,
  `rx_element`, `rx_switch_us` before V0. Without pair lines both are as before.
- USC4 header bytes 46 and 47 (a reserved 0 until now) carry the receive
  element and the switch time. Normal lines are the same bytes as before.
- Stage 4 text and laptop setup point to `us_control_v5_fw_v3` and `host_v3`
  (kit `us_kit_2026-11-09.zip`). The dev simulator follows v3.

## 0.13.0 — 2026-11-05

- 펌웨어 콘솔: **보내기** (송신 · 주파수 · 소자 · PRF · 모드) moves to the top
  of the left column, next to the graph; 상태 and 채널 맵 follow it.
- 받은 줄 **보는 구간**: 최소 and 최대 of the time axis, in its unit (µs or
  mm). An empty box is the line's own start or end (shown faintly in it);
  전체 clears both. A and M · B (their vertical axis) show only that part, and
  the M · B picture's white is the brightest echo inside it. µs ↔ mm keeps the
  same part on screen. CSVs still hold the whole line.
- **음속** box (m/s, default 1540 = soft tissue average, for the tissue
  phantom; was water 1480, fixed): the mm axis, the peak readout and the
  depth_mm column of both CSVs use it, and the CSV file names carry it
  (`_c1540`). The unit, part shown and sound speed are kept per device.

## 0.12.0 — 2026-11-05

- 펌웨어 콘솔, B mode: the CSV button becomes **프레임 CSV** and saves the
  frame on screen as a table. Column 1 time (µs), 2 depth (mm), then one
  column per element in volts, in the 채널 맵's order (`E1_EL3_V` = element
  1 on board channel EL3; `EL0_V` … without a map). An element whose latest
  line is missing, older than the last frame, or taken at another frequency
  is left empty, and the log says how many were filled.

## 0.11.0 — 2026-11-05

- For firmware **v2** (`../firmware/us_control_v5_fw_v2`): the ADC starts
  about 5 µs before the burst, so a line shows the burst itself at 0 µs.
  The packet's ADC start is read as a signed number (v2's is negative; v1's
  lines read as before).
- 받은 줄: round axis values (0 · 50 · 100 … µs or mm), a dashed line at the
  burst, grey for the burst and the 25 µs after it (left out of the peak, as
  the firmware does: v2 also leaves out the 8 samples before the burst). The
  readout says "ADC 시작 = 버스트 5.3 µs 전" (v2) or "버스트 뒤 4.0 µs" (v1).
  CSV times and depths before the burst are negative.
- Stage 4: ⑥ 타이밍 and ⑦ 스코프 for v2 (check the burst tail on TP401
  again), upload from `us_control_v5_fw_v2`, the viewer from `host_v2`.
  Stage 5 recovery time (x5.blank): there's no blank_us[] in v2; record it.
- The dev simulator follows v2.

## 0.10.0 — 2026-11-04

- 펌웨어 콘솔 **녹화**: while it is on, every line that comes in is kept
  (any mode, up to 20,000 lines). Save as CSV (one row per line: the board's
  burst time, PC ms, seq, frame, channel, array element, mode, MHz, ADC start
  and sample step, SAT, then V0–V479 in volts) or as 원본 .usc4 (the packets
  byte for byte, for host/usc4.py).
- 이 줄 CSV adds adc_V next to the code. The A graph's vertical axis can show
  volts (0–3.3 V, the ADC input) or codes; the readouts show both.
- Mode legend and stage 4 ④: A and M fire the same way; only the console's
  picture differs. 보드 지도 · 표: a row for D201 (PGOOD) going dark.
- The console's bar (with 정지) is redrawn only when the link changes, so a
  click on it never lands on a button that was just replaced.

## 0.9.0 — 2026-11-04

- **채널 맵** in the 펌웨어 콘솔, between 상태 and 보내기: the array's element
  numbers in order (from 1 or from 0), each with the board channel (J1001
  EL0–EL15) it is wired to, picked from a list; blank = no element. Maps have
  names and save as they change (shared, config/channels); each laptop
  remembers the one it picked. With a map, the element buttons show the
  array numbers in order (the channel under each), labels read "소자 5 (EL3)",
  and B mode scans and draws in array order (sent as the firmware's Q list,
  so empty places are skipped). A channel picked for two elements is flagged.
- 연결 테스트 stages have a 펌웨어 콘솔 button; 어레이 연결 · 영상's first step
  (채널 맵) has a 방법 list for finding the map by tapping elements in B mode.

## 0.8.1 — 2026-11-03

- 펌웨어 콘솔: one-line legends under 송신 (단발 · 연속 · MUX 스윕), 주파수
  (96 MHz ÷ an integer, so only these 8; 3.840 is enough for the 3.8 MHz
  elements) and 모드 (A · M · B).
- Stage 4 ③ says buttons are what to do and modes are which element and how
  it's shown; ④ explains the 8 frequencies, that T doesn't fire, and that a
  B picture takes 32 PRF ticks.
- 노트북 준비 starts by saying the app and the console need no install (sign
  in with Chrome or Edge); the installs are only for the laptop that uploads
  firmware.
- 펌웨어 콘솔 opens only for a signed-in account, like the shared records. In
  이 기기에서만 mode the page asks to sign in (로그인해서 같이 쓰기).
- The console's numbers and log stay current while its window draws no
  frames (minimised or hidden).

## 0.8.0 — 2026-11-02

- **펌웨어 콘솔** (`#/console`, button on 회로 보드 검증 and in stage 4): one
  window for the board instead of a terminal plus viewer_v5.py, which can't
  share the COM port. Web Serial in Chrome or Edge on a computer. Buttons
  for 단발 X, 연속 R (second press within 3 s starts it), 정지 S (also Esc,
  from any page), MUX 스윕 T, frequency, element, PRF and mode; the status
  line read every second and shown as tiles (fault bits named, settings not
  applied yet marked "다음 송신 때 적용"); the received line drawn (A: ADC
  code over µs or mm, the firmware's peak after the first 40 samples, SAT;
  M and B as grey pictures), saved as CSV; a log of what was sent and
  answered. Connecting sends S first. `js/usc4.js` reads the firmware's
  stream (checked byte for byte against host/usc4.py); on localhost `?dev`
  a pretend board (`js/sim-device.js`) stands in.
- Stage 4 (펌웨어 올리기) explained on the page: seven folding parts (wiring,
  laptop and upload, the console, commands and status fields, SW201, the
  timing of one line, what to check on the scope) and a 방법 list under
  every step. Step texts use the console. 4-22 (소자 빠르게 바꾸기) passes
  when lines never change element mid-line and no fault shows: the firmware
  changes the MUX only between lines and pauses one tick per change, so
  skip barely moves. Step ids unchanged.
- 노트북 준비 adds Chrome or Edge and the console; the terminal and viewer
  are listed as the other ways.

## 0.7.6 — 2026-10-31

- 보드 지도 · 표: new section 노트북 준비 (Windows). What to install
  (Python, PlatformIO and the viewer's packages, Zadig, a data USB-C cable)
  and the build → upload → terminal → viewer commands for the us_kit zip,
  with the Korean-path warning (PlatformIO doesn't support non-ASCII paths).
- 4-1 passes on a new COM port in Device Manager → Ports: Windows lists the
  board as a generic serial device, not as "US Control v5". The stage 4 note
  points to 노트북 준비.

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
