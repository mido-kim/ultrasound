# US Control bring-up: notes for working on this app

A PWA for verifying the US Control main v5.4 and HV v5.1 PCBs board by board,
shared by two people (미도, 정인). Plain HTML/CSS/JavaScript ES modules, **no
build step, no npm, no framework**, the same shape as the user's Planner app
(`C:\Users\midok\Projects\personal-calendar web app`). Keep it that way. UI
text is Korean. README.md has setup and features, CHANGELOG.md the history.

## Map

- `js/steps.js`: the procedure. `STAGES` (n, title, meta, kinds, intro,
  setup chips, notes) and `STEPS` (id, stage, kind, group, do, pass, spec or
  rec). **Step ids are stored with every result: never change or reuse one.**
  Shown numbers ("3-7") come from order (`stagesFor`). Main: stages 0 1 3 4,
  HV: 0 1 2, system (a main + HV pair): 5 6 7.
- `js/judge.js`: `parseValues` (several numbers per field, SI prefixes,
  units), `judge(spec, text)` → 'none' | 'ok' | 'out', `describeSpec`.
  Judging is advisory; people set pass / fail.
- `js/records.js`: progress, `earlierUnfinished` (rule 1 warning; a system
  also checks its pair), `over50` (FFC connector rating), `resultOps`,
  `starterBoards`, `deleteBoardOps`, CSV (BOM for Excel), JSON backup.
- `js/main.js`: boot (Firebase unless `settings.mode === 'local'`), sign-in,
  hash routes `#/`, `#/b/<id>[/<stage>]`, `#/guide`, `#/settings`, render
  (whole page as a string; keeps focus, caret and scroll), delegated input.
  Typing goes into `drafts` and is saved after `SAVE_MS` or on blur; a draft
  is dropped once the store holds the same text, so remote snapshots don't
  overwrite what is being typed.
- `js/guide.js`: reference HTML taken from
  `../us_control_v5.4_pcb_bringup_guide.html` (rules, board maps, tables, power
  order, symptoms, changes). Keep the two in step. Step numbers were removed
  from it because the app numbers steps per board kind.
- `js/store.js` (localStorage) and `js/cloud.js` (Firebase, SDK 12.6.0 from
  gstatic) share `subscribe(fn)` / `apply(ops)`.
- `css/app.css`: tokens on `:root` (light) and `:root[data-theme="dark"]`;
  `js/theme-boot.js` sets the attribute before first paint. No
  `prefers-color-scheme` in CSS. Fonts: IBM Plex Sans KR + IBM Plex Mono from
  Google Fonts (cached by `sw.js` for offline).
- `sw.js`: offline cache. **Add any new file to `SHELL`.**

## Data

Board: `{ id, kind: 'main' | 'hv' | 'system', name, notes, mainId, hvId,
createdAt, createdBy, updatedAt }` (mainId / hvId for a system only).
Result: `{ id: boardId__stepId, boardId, stepId, status: '' | 'pass' | 'fail'
| 'skip', value, note, by, byUid, at }`.

Firestore: `bringup/us-control-v5/boards/{id}`,
`bringup/us-control-v5/results/{id}` in the app's own Firebase project
`ultrasound-ebd93` (`js/config.js`; kept apart from Planner's project on
purpose). Access is a UID allowlist in `firestore.rules`; the user pastes the
whole file into the console. Per-device settings (name, theme, mode) are in
localStorage.

Deploy: GitHub `mido-kim/ultrasound` (this folder is the repo root), Pages from
`main` / root → https://mido-kim.github.io/ultrasound/. Commit as the repo's
local identity (set in `.git/config`).

## Working here

- Run: `python -m http.server 5174` in this folder (Planner uses 5173).
- Tests: http://localhost:5174/tests/ (title shows PASS/FAIL). Add a test when
  changing judge, records or steps logic.
- With each change: bump `js/version.js`, add a CHANGELOG.md entry.
- Check new UI at phone width (375px) and in dark mode.
