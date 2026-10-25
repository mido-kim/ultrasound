# Wearable Ultrasound: notes for working on this app

A PWA of checklists for the wearable-ultrasound project, shared by two people
(미도, 정인): board checks for the US Control main v5.4 and HV v5.1 PCBs, and
array-fab and phantom protocols the two of them write in the app. Plain
HTML/CSS/JavaScript ES modules, **no build step, no npm, no framework**, the
same shape as the user's Planner app (`C:\Users\midok\Projects\personal-calendar web app`).
Keep it that way. UI text is Korean. README.md has setup and features,
CHANGELOG.md the history.

## Writing UI text

The user asked for plain, intuitive Korean, not long AI-style sentences. Keep
labels short, use 해요체 for messages and noun phrases for checklist items, no
"~을(를)" or stacked clauses. Never put Korean text in the mono font (its
spaces are wide); mono is for numbers, values and code only.

**Never write array or phantom protocol content.** Those steps belong to the
team and are written in the app's step editor; don't seed or "suggest" steps.

## Map

- `js/steps.js`: the board check procedure. `STAGES` (n, title, meta, kinds,
  intro, setup chips, notes) and `STEPS` (id, stage, kind, group, do, pass,
  spec or rec). **Step ids are stored with every result: never change or reuse
  one.** Shown numbers come from order per board kind (`stagesFor` adds
  `shown`): a main board's stages n = 0 1 3 4 show as 1–4. Main: n 0 1 3 4,
  HV: 0 1 2, 연결 테스트 (`system`, a main + HV pair): 5 6 7. URLs use n.
- `js/judge.js`: `parseValues` (several numbers per field, SI prefixes,
  units), `judge(spec, text)` → 'none' | 'ok' | 'out', `describeSpec`.
  Judging is advisory; people set the status.
- `js/records.js`: boards and results: progress, `earlierUnfinished` (a
  system also checks its pair), `over50` (FFC connector rating), `resultOps`,
  `newBoard`, `nextBoardName`, `deleteBoardOps`.
- `js/protocols.js`: array / phantom protocols and runs (`PROTO_KINDS`,
  `runSteps`, `runProgress`, editing helpers). The protocol is live: a run
  shows its current steps; a removed step with a result in a run stays as
  `removed: true` and shows only in that run.
- `js/backup.js`: CSV (BOM for Excel) and JSON backup for everything.
- `js/main.js`: boot (Firebase unless `settings.mode === 'local'`), sign-in,
  hash routes `#/` home, `#/boards`, `#/b/<id>[/<n>]`, `#/guide`,
  `#/p/<kind>`, `#/p/<kind>/edit`, `#/r/<id>`, `#/settings`. Render is the
  whole page as a string (keeps focus, caret and the row in view). Typing goes
  into `drafts` and is saved after `SAVE_MS` or on blur. The step editor works
  on a copy (`protoEdit`) saved as it changes. `boot()` is called at the end
  of the file so every const exists before the first render.
- `js/designs.js` + `designs/array/<version>/`: the 어레이 설계 page (route
  `#/p/array/designs`). Files there are **copies**; the originals stay in the
  project folder (`../US_array_v1.zip`, `../array_v1*`, `../array_v2_fpc/`).
  New version: copy its files and previews in, add an entry (newest first)
  with exact byte sizes; the tests check every listed file exists at that size.
  Preview SVGs are rendered from the Gerbers with gerbonara (flex colours);
  the repo is public, so everything here is downloadable by anyone.
- `js/guide.js`: board reference HTML (maps, tables, power order, symptoms,
  open questions), shortened from `../us_control_v5.4_pcb_bringup_guide.html`.
- `js/store.js` (localStorage) and `js/cloud.js` (Firebase, SDK 12.6.0 from
  gstatic) share `subscribe(fn)` / `apply(ops)` over `COLLS`.
- `css/app.css`: tokens on `:root` (light) and `:root[data-theme="dark"]`;
  `js/theme-boot.js` sets the attribute before first paint. No
  `prefers-color-scheme` in CSS. Fonts: IBM Plex Sans KR + IBM Plex Mono from
  Google Fonts (cached by `sw.js` for offline).
- `sw.js`: offline cache. **Add any new file to `SHELL`** and bump `CACHE`
  when the file list changes.

## Data

Board: `{ id, kind: 'main' | 'hv' | 'system', name, notes, mainId, hvId,
createdAt, createdBy, updatedAt }`. Run: `{ id, kind: 'array' | 'phantom',
name, date, notes, createdAt, createdBy, updatedAt }`. Protocol: `{ id: kind,
kind, steps: [{ id, type: 'step' | 'section', title, detail, value, unit,
removed? }], updatedAt, updatedBy }`. Result (boards and runs alike): `{ id:
targetId__stepId, boardId: targetId, stepId, status: '' | 'pass' | 'fail' |
'skip', value, note, by, byUid, at }`.

Firestore: `bringup/us-control-v5/{boards,results,runs,protocols}/{id}` in the
app's own Firebase project `ultrasound-ebd93` (`js/config.js`; kept apart from
Planner's on purpose). The path kept its first name so the rules didn't
change. Access is a UID allowlist in `firestore.rules`; the user pastes the
whole file into the console. Per-device settings (name, theme, mode) are in
localStorage.

Deploy: GitHub `mido-kim/ultrasound` (this folder is the repo root), Pages from
`main` / root → https://mido-kim.github.io/ultrasound/. Commit as the repo's
local identity (set in `.git/config`).

## Working here

- Run: `python -m http.server 5174` in this folder (Planner uses 5173), or the
  "bringup" entry in `../.claude/launch.json`.
- Tests: http://localhost:5174/tests/ (title shows PASS/FAIL). Add a test when
  changing judge, records, protocols, backup or steps logic.
- With each change: bump `js/version.js`, add a CHANGELOG.md entry.
- Check new UI at phone width (375px) and in dark mode.
