// 펌웨어 콘솔 (#/console): the commands, the status line and the lines the
// board sends, in one window. A terminal and viewer_v5.py can't hold the COM
// port at the same time, so this does the work of both for stage 4.
//
// render() draws the page from `con`; everything live (status, plot, log) is
// then updated in place by the paint functions, so a stream of lines never
// redraws the app. The link stays open while other pages are shown: a step's
// value can be typed in the checklist and the console picked up again.

import { hasSerial, isDev, openLink } from './device.js';
import {
  CMD, FREQ_LABELS, N_ELEM, PEAK_SKIP, SAT_CODE, STATES, SWEEP_MS,
  clampPrf, depthMm, faultNames, lineCsv, lineStats, sampleUs,
} from './usc4.js';
import { esc, saveFile } from './util.js';

const POLL_MS = 1000;
const M_COLS = 300; // lines kept in the M-mode picture
const LOG_MAX = 150;
const ARM_CONFIRM_MS = 3000;

const con = {
  link: null,
  connecting: false,
  status: null, // last status line, parsed
  statusAt: 0,
  want: null, // { mode, f, prf, el } picked here; the board applies it at its next shot
  line: null,
  stats: null,
  lines: 0,
  drops: 0,
  badCrc: 0,
  lastSeq: null,
  rate: 0,
  rateCount: 0,
  rateAt: 0,
  bCols: new Array(N_ELEM).fill(null),
  mLines: [], // samples of the last M_COLS lines in M mode
  log: [],
  logNextStatus: false, // true: log the next status line if it's new; 'always': log it anyway
  lastLoggedStatus: '',
  lastLineLog: 0,
  poll: true,
  axis: 'us',
  armUntil: 0,
  sweepUntil: 0,
  timers: [],
};

// ---------------------------------------------------------------- page

// signedIn: a signed-in account. In 이 기기에서만 (local) mode the console
// stays closed, like the shared records: it asks to sign in instead.
export function consolePage(signedIn = true) {
  const head = `
  <div class="page-head">
    <a class="back" href="#/boards">← 회로 보드 검증</a>
    <h1>펌웨어 콘솔</h1>
    <p class="lede">VND042를 USB로 연결해서 버튼으로 명령을 보내고, 상태와 받은 줄을 한 화면에서 봐요. 터미널 · 뷰어 대신 써요.</p>
  </div>`;
  if (!signedIn) {
    return `${head}
    <div class="empty"><h2>로그인해야 써요</h2>
      <p>펌웨어 콘솔은 로그인한 계정에서만 열려요.</p>
      <button type="button" class="primary" data-act="use-cloud">로그인해서 같이 쓰기</button></div>`;
  }
  const supported = hasSerial() || isDev();
  const freqBtns = FREQ_LABELS.map((f, i) => `<button type="button" class="pick" data-act="con-freq" data-i="${i}">${f}</button>`).join('');
  const elBtns = Array.from({ length: N_ELEM }, (_, e) => `<button type="button" class="pick" data-act="con-el" data-e="${e}">${e}</button>`).join('');
  const modeBtns = ['A', 'M', 'B'].map((m) => `<button type="button" class="pick" data-act="con-mode" data-m="${m}">${m}</button>`).join('');
  return `${head}
  ${supported ? '' : `<div class="banner warn"><b>이 브라우저는 USB 시리얼을 못 써요</b>
    <p>노트북에서 Chrome이나 Edge로 이 페이지를 열어 주세요. 휴대폰 · Safari · Firefox는 안 돼요.</p></div>`}
  <div class="con" id="con-root">
    <div class="con-bar" id="con-bar">${barHtml()}</div>
    <div class="con-grid">
      <div class="con-col">
        <section class="con-panel" aria-labelledby="con-st-h">
          <div class="row"><h2 id="con-st-h">상태</h2><span class="spacer"></span><span class="small muted num" id="con-age"></span></div>
          <div id="con-status">${statusHtml()}</div>
          <div class="row">
            <button type="button" data-act="con-status" class="needs-link">상태 다시 <span class="key">?</span></button>
            <label class="con-check"><input type="checkbox" id="con-poll"${con.poll ? ' checked' : ''}> 1초마다 읽기</label>
          </div>
        </section>
        <section class="con-panel" aria-labelledby="con-tx-h">
          <h2 id="con-tx-h">보내기</h2>
          <div class="con-row"><span class="lbl">송신</span>
            <div class="con-btns">
              <button type="button" data-act="con-shot" class="needs-link">단발 <span class="key">X</span></button>
              <button type="button" data-act="con-arm" id="con-arm" class="needs-link">연속 <span class="key">R</span></button>
              <button type="button" data-act="con-sweep" id="con-sweep" class="needs-link">MUX 스윕 <span class="key">T</span></button>
            </div>
            <p class="con-help">단발 = 한 번 · 연속 = 정지까지 계속 · MUX 스윕 = 안 쏘고 EL0 → EL15만 차례로 이어 봄</p>
          </div>
          <div class="con-row"><span class="lbl">주파수 (MHz)</span><div class="con-seg">${freqBtns}</div>
            <p class="con-help">96 MHz ÷ 정수라 이 8개뿐이에요. 3.8 MHz 소자는 3.840 (3사이클은 폭이 넓어 차이 없음)</p>
          </div>
          <div class="con-row"><span class="lbl">소자 (EL)</span><div class="con-els">${elBtns}</div></div>
          <div class="con-row"><span class="lbl">PRF (1초에 쏘는 횟수)</span>
            <div class="con-btns">
              <input type="number" id="con-prf" min="1" max="2000" step="1" value="${con.want?.prf ?? 10}" aria-label="PRF (Hz)"><span class="unit">Hz</span>
              <button type="button" data-act="con-prf" class="needs-link">적용</button>
            </div>
          </div>
          <div class="con-row"><span class="lbl">모드</span><div class="con-seg con-modes">${modeBtns}</div>
            <p class="con-help">A = 한 소자 한 줄 · M = 한 소자를 시간 순으로 (움직임) · B = 소자를 바꿔 가며 16줄 단면</p>
          </div>
          <p class="small" id="con-pending"></p>
          <p class="small muted">설정은 보드가 다음 송신 때 적용해요. 정지 상태에서 바꾸면 상태 칸은 단발 뒤에 바뀌어요.</p>
        </section>
      </div>
      <div class="con-col">
        <section class="con-panel" aria-labelledby="con-ln-h">
          <div class="row">
            <h2 id="con-ln-h">받은 줄</h2><span class="spacer"></span>
            <div class="con-seg con-axis" role="group" aria-label="가로축">
              <button type="button" class="pick" data-act="con-axis" data-axis="us">µs</button>
              <button type="button" class="pick" data-act="con-axis" data-axis="mm">mm</button>
            </div>
            <button type="button" data-act="con-save" id="con-save">CSV 저장</button>
          </div>
          <div class="con-plot-box" id="con-plot-box"><canvas id="con-plot" role="img" aria-label="받은 줄 그래프"></canvas></div>
          <div id="con-read">${readHtml()}</div>
        </section>
        <section class="con-panel" aria-labelledby="con-log-h">
          <div class="row"><h2 id="con-log-h">기록</h2><span class="spacer"></span><button type="button" data-act="con-clear">지우기</button></div>
          <div class="con-log" id="con-log" aria-live="polite">${logHtml()}</div>
          <div class="con-raw">
            <input type="text" id="con-raw" placeholder="직접 보내기 (예: F3, E9, ?)" autocomplete="off" aria-label="직접 보낼 글자">
            <button type="button" data-act="con-raw" class="needs-link">보내기</button>
          </div>
        </section>
      </div>
    </div>
  </div>`;
}

// Called after render() put the page in; fills in what the HTML can't hold.
export function mountConsole() {
  plotObserver.disconnect();
  const box = document.getElementById('con-plot-box');
  if (box) plotObserver.observe(box);
  paintAll();
}

const plotObserver = new ResizeObserver(() => drawPlot());
new MutationObserver(() => drawPlot()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

function barHtml() {
  const l = con.link;
  const chip = l
    ? `<span class="chip ok">${l.sim ? '연습 장치 (개발 모드)' : '연결됨'}</span>`
    : `<span class="chip off">${con.connecting ? '연결 중…' : '연결 안 됨'}</span>`;
  const btn = l
    ? '<button type="button" data-act="con-disconnect">끊기</button>'
    : `<button type="button" class="primary" data-act="con-connect"${con.connecting || !(hasSerial() || isDev()) ? ' disabled' : ''}>연결</button>`;
  return `${chip}${btn}<span class="small muted con-hint">${l ? 'Esc = 정지' : '목록에서 USB 직렬 장치를 골라요'}</span>
    <span class="spacer"></span>
    <button type="button" class="stop" data-act="con-stop"${l ? '' : ' disabled'}>정지 <span class="key">S</span></button>`;
}

function statusHtml() {
  const s = con.status;
  if (!s) return `<p class="muted small">${con.link ? '상태를 기다리는 중…' : '연결하면 보드 상태가 여기 보여요.'}</p>`;
  const faults = s.fault ? faultNames(s.fault).join(', ') || `0x${s.fault.toString(16)}` : '없음';
  const tile = (k, v, cls = '') => `<div class="con-tile${cls}"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  return `
    <div class="con-state st-${s.st}">${esc(STATES[s.st] ?? `st=${s.st}`)}</div>
    <div class="con-tiles">
      ${tile('주파수', s.f !== null ? `${FREQ_LABELS[s.f] ?? s.f} MHz` : '?')}
      ${tile('PRF', `${s.prf} Hz`)}
      ${tile('소자', `EL${s.el}`)}
      ${tile('모드', esc(s.mode))}
      ${tile('보낸 줄 seq', s.seq)}
      ${tile('설정 번호 cfg', s.cfg)}
      ${tile('건너뜀 skip', s.skip, s.skip ? ' warn' : '')}
      ${tile('USB 실패', s.txerr, s.txerr ? ' warn' : '')}
      ${tile('늦음 late', s.late, s.late ? ' warn' : '')}
      ${tile('크리스털 hse', s.hse ? `${s.hse} MHz` : '없음 (내부 RC)', s.hse ? '' : ' warn')}
      ${tile('고장 fault', esc(faults), s.fault ? ' bad' : '')}
    </div>`;
}

function readHtml() {
  const l = con.line;
  if (!l) return '<p class="muted small">아직 받은 줄이 없어요. 단발을 누르면 한 줄이 와요.</p>';
  const st = con.stats;
  const mhz = (l.txHz / 1e6).toFixed(3);
  const where = st.at >= 0 ? ` · ${sampleUs(l, st.at).toFixed(1)} µs (${depthMm(l, st.at).toFixed(1)} mm)` : '';
  return `
    <div class="con-tiles">
      <div class="con-tile wide${st.sat ? ' bad' : ''}"><span class="k">최고 코드 (앞 ${PEAK_SKIP}개 빼고)</span><span class="v">${st.peak}${where}${st.sat ? ' · SAT' : ''}</span></div>
      <div class="con-tile"><span class="k">최저 · 평균</span><span class="v">${st.min} · ${Math.round(st.mean)}</span></div>
      <div class="con-tile"><span class="k">이 줄</span><span class="v">#${l.sequence} · EL${l.element} · ${mhz} MHz · ${esc(l.mode)}</span></div>
      <div class="con-tile"><span class="k">받은 줄 · 1초에</span><span class="v">${con.lines} · ${con.rate}</span></div>
      <div class="con-tile${con.drops || con.badCrc ? ' warn' : ''}"><span class="k">빠진 줄 · CRC 오류</span><span class="v">${con.drops} · ${con.badCrc}</span></div>
    </div>
    <p class="small muted">ADC 시작 = 버스트 뒤 ${(l.adcDelayNs / 1000).toFixed(1)} µs · ${l.count}개 · ${(l.fsHz / 1e6).toFixed(1)} Msps · 깊이는 물 1480 m/s 기준</p>`;
}

function logHtml() {
  if (!con.log.length) return '<p class="muted small">보낸 명령과 받은 답이 여기 쌓여요.</p>';
  return con.log.map((x) => `<div class="lg ${x.dir}"><span class="t num">${x.time}</span><span class="d">${x.dir === 'out' ? '→' : x.dir === 'in' ? '←' : '·'}</span><span class="w">${esc(x.text)}${x.code ? ` <code>${esc(x.code)}</code>` : ''}</span></div>`).join('');
}

// ---------------------------------------------------------------- painting

// Once per frame; the timer covers a window that draws no frames (minimised
// or hidden), so what's on the page never falls behind.
let paintQueued = false;
function schedulePaint() {
  if (paintQueued) return;
  paintQueued = true;
  const run = () => {
    if (!paintQueued) return;
    paintQueued = false;
    paintAll();
  };
  requestAnimationFrame(run);
  setTimeout(run, 250);
}

function paintAll() {
  if (!document.getElementById('con-root')) return;
  setHtml('con-bar', barHtml());
  setHtml('con-status', statusHtml());
  setHtml('con-read', readHtml());
  paintLog();
  paintControls();
  paintAge();
  drawPlot();
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el && el.innerHTML !== html) el.innerHTML = html;
}

function paintLog() {
  const el = document.getElementById('con-log');
  if (!el) return;
  const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  el.innerHTML = logHtml();
  if (atEnd) el.scrollTop = el.scrollHeight;
}

// Buttons keep their place (and the PRF box its typing); only their state changes.
function paintControls() {
  const root = document.getElementById('con-root');
  if (!root) return;
  const on = Boolean(con.link);
  root.querySelectorAll('.needs-link, [data-act="con-freq"], [data-act="con-el"], [data-act="con-mode"]').forEach((b) => (b.disabled = !on));
  const w = con.want || {};
  const s = con.status || {};
  root.querySelectorAll('[data-act="con-freq"]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.i) === (w.f ?? s.f))));
  root.querySelectorAll('[data-act="con-el"]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.e) === (w.el ?? s.el))));
  root.querySelectorAll('[data-act="con-mode"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === (w.mode ?? s.mode))));
  root.querySelectorAll('[data-act="con-axis"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.axis === con.axis)));
  const arm = document.getElementById('con-arm');
  if (arm) {
    const asking = Date.now() < con.armUntil;
    arm.classList.toggle('arming', asking);
    arm.innerHTML = asking ? '한 번 더 누르면 연속 송신' : '연속 <span class="key">R</span>';
  }
  const sweep = document.getElementById('con-sweep');
  if (sweep) {
    const left = Math.ceil((con.sweepUntil - Date.now()) / 1000);
    sweep.innerHTML = left > 0 ? `스윕 중… ${left}초` : 'MUX 스윕 <span class="key">T</span>';
  }
  const save = document.getElementById('con-save');
  if (save) save.disabled = !con.line;
  const prf = document.getElementById('con-prf');
  if (prf && document.activeElement !== prf && w.prf) prf.value = w.prf;
  setHtml('con-pending', pendingHtml());
}

// What was picked here but isn't in the status line yet.
function pendingHtml() {
  const w = con.want;
  const s = con.status;
  if (!w || !s) return '';
  const diff = [];
  if (w.f !== undefined && w.f !== s.f) diff.push(`${FREQ_LABELS[w.f]} MHz`);
  if (w.el !== undefined && w.el !== s.el) diff.push(`EL${w.el}`);
  if (w.prf !== undefined && w.prf !== s.prf) diff.push(`PRF ${w.prf} Hz`);
  if (w.mode !== undefined && w.mode !== s.mode) diff.push(`모드 ${esc(w.mode)}`);
  return diff.length ? `<span class="chip warn">다음 송신 때 적용</span> ${diff.join(' · ')}` : '';
}

function paintAge() {
  const el = document.getElementById('con-age');
  if (!el) return;
  if (!con.link || !con.statusAt) {
    el.textContent = '';
    return;
  }
  const sec = Math.floor((Date.now() - con.statusAt) / 1000);
  el.textContent = sec < 1 ? '방금 읽음' : `${sec}초 전`;
}

// ---------------------------------------------------------------- plot

function drawPlot() {
  const cv = document.getElementById('con-plot');
  if (!cv) return;
  const w = cv.parentElement.clientWidth;
  if (!w) return;
  const h = Math.round(Math.min(380, Math.max(220, w * 0.45)));
  const dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv.style.height = `${h}px`;
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const css = getComputedStyle(document.documentElement);
  const tok = (n) => css.getPropertyValue(n).trim();
  const mono = `11px ${tok('--f-mono')}`;
  const body = `13px ${tok('--f-body')}`;
  const L = 48;
  const R = 12;
  const T = 12;
  const B = 32;
  const pw = w - L - R;
  const ph = h - T - B;
  const line = con.line;
  const mode = line?.mode || 'A';

  ctx.strokeStyle = tok('--line');
  ctx.lineWidth = 1;
  ctx.strokeRect(L + 0.5, T + 0.5, pw - 1, ph - 1);
  if (!line) {
    ctx.fillStyle = tok('--muted');
    ctx.font = body;
    ctx.textAlign = 'center';
    ctx.fillText(con.link ? '단발을 누르면 받은 줄이 여기 그려져요' : '연결하면 받은 줄이 여기 그려져요', L + pw / 2, T + ph / 2);
    return;
  }
  const n = line.samples.length;
  const at = (i) => (con.axis === 'us' ? sampleUs(line, i).toFixed(0) : depthMm(line, i).toFixed(0));
  const unit = con.axis === 'us' ? 'µs (버스트부터)' : 'mm (물)';
  ctx.font = mono;
  ctx.fillStyle = tok('--muted');

  if (mode === 'A') {
    const xOf = (i) => L + (i / (n - 1)) * pw;
    const yOf = (v) => T + ph - (v / 4095) * ph;
    ctx.fillStyle = tok('--code-bg');
    ctx.fillRect(L + 1, T + 1, xOf(PEAK_SKIP) - L, ph - 2);
    ctx.fillStyle = tok('--muted');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const v of [0, 1024, 2048, 3072, 4095]) {
      const y = Math.round(yOf(v)) + 0.5;
      ctx.strokeStyle = tok('--line');
      ctx.beginPath();
      ctx.moveTo(L, y);
      ctx.lineTo(L + pw, y);
      ctx.stroke();
      ctx.fillText(String(v), L - 6, y);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let k = 0; k <= 4; k++) {
      const i = Math.round((k * (n - 1)) / 4);
      ctx.fillText(at(i), xOf(i), T + ph + 6);
    }
    ctx.textAlign = 'right';
    ctx.fillText(unit, L + pw, T + ph + 19);
    ctx.strokeStyle = tok('--danger');
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(L, yOf(SAT_CODE));
    ctx.lineTo(L + pw, yOf(SAT_CODE));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = tok('--accent');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    line.samples.forEach((v, i) => (i ? ctx.lineTo(xOf(i), yOf(v)) : ctx.moveTo(xOf(i), yOf(v))));
    ctx.stroke();
    const st = con.stats;
    if (st?.at >= 0) {
      ctx.fillStyle = tok('--warn');
      ctx.beginPath();
      ctx.arc(xOf(st.at), yOf(st.peak), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // M: time runs left → right, one column per line. B: one column per element.
  const cols = mode === 'M' ? [...new Array(M_COLS - con.mLines.length).fill(null), ...con.mLines] : con.bCols;
  const { pic, top } = picture(cols, n);
  ctx.imageSmoothingEnabled = mode === 'M';
  ctx.drawImage(pic, L + 1, T + 1, pw - 2, ph - 2);
  ctx.fillStyle = tok('--muted');
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let k = 0; k <= 4; k++) {
    const i = Math.round((k * (n - 1)) / 4);
    ctx.fillText(at(i), L - 6, T + (k / 4) * ph);
  }
  ctx.textBaseline = 'top';
  ctx.font = body;
  if (mode === 'M') {
    ctx.textAlign = 'left';
    ctx.fillText(`← 지난 줄 ${M_COLS}개 · 흰색 = 코드 ${top} 이상`, L, T + ph + 8);
    ctx.textAlign = 'right';
    ctx.fillText(`최근 → · 세로 ${unit}`, L + pw, T + ph + 8);
  } else {
    ctx.font = mono;
    ctx.textAlign = 'center';
    for (let e = 0; e < N_ELEM; e += 3) ctx.fillText(String(e), L + ((e + 0.5) / N_ELEM) * pw, T + ph + 6);
    ctx.font = body;
    ctx.textAlign = 'right';
    ctx.fillText(`소자 · 흰색 = 코드 ${top} 이상 · 세로 ${unit}`, L + pw, T + ph + 19);
  }
}

// A grey picture, one column per entry of cols (null = nothing yet, left
// clear). White is the brightest echo in it (the TX feedthrough at the start
// is left out), so small echoes still show; at least code 256.
function picture(cols, n) {
  let top = 256;
  for (const c of cols) if (c) for (let i = PEAK_SKIP + 1; i < c.length; i++) if (c[i] > top) top = c[i];
  const pic = Object.assign(document.createElement('canvas'), { width: cols.length, height: n });
  const g = pic.getContext('2d');
  const img = g.createImageData(cols.length, n);
  cols.forEach((col, x) => {
    if (!col) return;
    for (let i = 0; i < n && i < col.length; i++) {
      const v = Math.min(255, Math.round((col[i] * 255) / top));
      img.data.set([v, v, v, 255], 4 * (i * cols.length + x));
    }
  });
  g.putImageData(img, 0, 0);
  return { pic, top };
}

function pushM(line) {
  con.mLines.push(line.samples);
  if (con.mLines.length > M_COLS) con.mLines.shift();
}

// ---------------------------------------------------------------- the link

function log(dir, text, code = '') {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  con.log.push({ dir, text, code, time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` });
  if (con.log.length > LOG_MAX) con.log.splice(0, con.log.length - LOG_MAX);
  schedulePaint();
}

function onEvent(ev) {
  if (ev.type === 'status') {
    const prev = con.status;
    const s = ev.status;
    if (!s) return;
    con.status = s;
    con.statusAt = Date.now();
    if (!con.want) con.want = { mode: s.mode, f: s.f, prf: s.prf, el: s.el };
    const changed = !prev || prev.st !== s.st || prev.fault !== s.fault || prev.cfg !== s.cfg;
    const asked = con.logNextStatus === 'always' || (con.logNextStatus && ev.text !== con.lastLoggedStatus);
    if (changed || asked) {
      log('in', `상태: ${STATES[s.st] ?? s.st}`, ev.text);
      con.lastLoggedStatus = ev.text;
    }
    con.logNextStatus = false;
  } else {
    con.lines++;
    con.rateCount++;
    if (con.lastSeq !== null && ev.sequence !== ((con.lastSeq + 1) >>> 0)) con.drops++;
    con.lastSeq = ev.sequence;
    con.badCrc = con.link?.parser.badCrc ?? con.badCrc;
    con.line = ev;
    con.stats = lineStats(ev);
    if (ev.mode === 'M') pushM(ev);
    if (ev.mode === 'B') con.bCols[ev.element] = ev.samples;
    if (Date.now() - con.lastLineLog > 1000) {
      con.lastLineLog = Date.now();
      log('in', `받은 줄 #${ev.sequence} · EL${ev.element} · 최고 ${con.stats.peak}${con.stats.sat ? ' · SAT' : ''}`);
    }
  }
  schedulePaint();
}

function onClosed(byUser, why) {
  con.link = null;
  stopTimers();
  con.armUntil = 0;
  con.sweepUntil = 0;
  log('info', byUser ? '연결을 끊었어요' : `연결이 끊겼어요. USB가 빠졌거나 보드가 리셋됐을 수 있어요${why ? ` (${why})` : ''}`);
  paintAll();
}

function startTimers() {
  stopTimers();
  con.timers.push(setInterval(() => {
    if (con.link && con.poll && Date.now() >= con.sweepUntil) con.link.write(CMD.status());
  }, POLL_MS));
  con.timers.push(setInterval(() => {
    const now = Date.now();
    if (now - con.rateAt >= 1000) {
      con.rate = Math.round((con.rateCount * 1000) / (now - con.rateAt));
      con.rateCount = 0;
      con.rateAt = now;
    }
    paintAge();
    if (document.getElementById('con-root')) {
      setHtml('con-read', readHtml());
      paintControls();
    }
  }, 500));
}

function stopTimers() {
  con.timers.forEach(clearInterval);
  con.timers = [];
}

async function connect() {
  if (con.link || con.connecting) return;
  con.connecting = true;
  paintAll();
  try {
    const link = await openLink(onEvent, onClosed);
    if (link) {
      Object.assign(con, {
        link, status: null, statusAt: 0, want: null, lines: 0, drops: 0, badCrc: 0, lastSeq: null, rateCount: 0, rateAt: Date.now(),
      });
      log('info', link.sim ? '연습 장치에 연결했어요 (개발 모드). 먼저 정지를 보내요' : '연결했어요. 먼저 정지를 보내요');
      await send(CMD.stop(), '정지', 'S');
      startTimers();
    }
  } catch (err) {
    log('info', openError(err));
  }
  con.connecting = false;
  paintAll();
}

function openError(err) {
  if (err?.name === 'NetworkError' || /open/i.test(err?.message || '')) {
    return '포트를 못 열었어요. 터미널이나 뷰어가 이 포트를 열고 있으면 닫고 다시 연결해요.';
  }
  if (err?.name === 'SecurityError') return 'USB 시리얼이 막혀 있어요. 주소가 https인지, 브라우저 설정을 확인해요.';
  return `연결 못 했어요: ${err?.message || err}`;
}

async function disconnect() {
  const l = con.link;
  if (!l) return;
  log('out', '정지', 'S');
  await l.write(CMD.stop());
  await l.close(true);
}

// Writes a command, logs it, and reads the status back so its effect shows.
async function send(bytes, text, code, { askAfter = [150] } = {}) {
  const l = con.link;
  if (!l) return;
  if (text) log('out', text, code);
  await l.write(bytes);
  for (const ms of askAfter) {
    setTimeout(() => {
      if (con.link !== l) return;
      con.logNextStatus = true;
      l.write(CMD.status());
    }, ms);
  }
}

function pick(key, value) {
  if (!con.link) return;
  con.want = { ...(con.want || {}), [key]: value };
  if (key === 'f') send(CMD.freq(value), `주파수 ${FREQ_LABELS[value]} MHz`, `F${value}`);
  if (key === 'el') send(CMD.element(value), `소자 EL${value}`, `E${value.toString(16)}`);
  if (key === 'mode') send(CMD.mode(value), `모드 ${value}`, value);
  if (key === 'prf') send(CMD.prf(value), `PRF ${value} Hz`, `P ${value >> 8} ${value & 0xff}`);
  paintControls();
}

// R and X do nothing while the board is in 고장 (FAULT) until S.
function faultHint() {
  if (con.status?.st !== 5) return false;
  log('info', '고장 상태라 송신을 안 받아요. 정지를 누르면 풀려요 (fault 값은 남아요).');
  return true;
}

function shot() {
  if (!con.link || faultHint()) return;
  const prf = con.status?.prf || 10;
  send(CMD.shot(), '단발', 'X', { askAfter: [150, Math.min(2500, 1500 / prf + 300)] });
}

function arm() {
  if (!con.link || faultHint()) return;
  if (con.status && con.status.st >= 1 && con.status.st <= 4) {
    log('info', '이미 송신 중이에요. 멈추려면 정지.');
    return;
  }
  if (Date.now() > con.armUntil) {
    con.armUntil = Date.now() + ARM_CONFIRM_MS;
    paintControls();
    setTimeout(paintControls, ARM_CONFIRM_MS + 50);
    return;
  }
  con.armUntil = 0;
  send(CMD.arm(), '연속 송신 시작', 'R');
  paintControls();
}

function sweep() {
  if (!con.link) return;
  if (con.status && con.status.st !== 0 && con.status.st !== 5) {
    log('info', 'MUX 스윕은 정지 상태에서만 돼요. 먼저 정지를 눌러요.');
    return;
  }
  con.sweepUntil = Date.now() + SWEEP_MS;
  send(CMD.sweep(), `MUX 스윕 (EL0 → EL15, 0.4초씩, ${SWEEP_MS / 1000}초)`, 'T', { askAfter: [SWEEP_MS + 300] });
  paintControls();
}

function applyPrf() {
  const el = document.getElementById('con-prf');
  if (!el) return;
  const hz = clampPrf(el.value);
  el.value = hz;
  pick('prf', hz);
}

function sendRaw() {
  const el = document.getElementById('con-raw');
  const text = el?.value.trim();
  if (!text || !con.link) return;
  send(new TextEncoder().encode(text), '직접 보냄', text);
}

function saveLine() {
  const l = con.line;
  if (!l) return;
  saveFile(`line_${l.sequence}_EL${l.element}_${(l.txHz / 1e6).toFixed(3)}MHz.csv`, lineCsv(l), 'text/csv');
}

// ---------------------------------------------------------------- events from main.js

export function consoleAction(act, el) {
  switch (act) {
    case 'con-connect': return connect();
    case 'con-disconnect': return disconnect();
    case 'con-stop':
      con.armUntil = 0;
      return send(CMD.stop(), '정지', 'S');
    case 'con-shot': return shot();
    case 'con-arm': return arm();
    case 'con-sweep': return sweep();
    case 'con-status':
      con.logNextStatus = 'always';
      return send(CMD.status(), '상태 읽기', '?', { askAfter: [] });
    case 'con-freq': return pick('f', Number(el.dataset.i));
    case 'con-el': return pick('el', Number(el.dataset.e));
    case 'con-mode': return pick('mode', el.dataset.m);
    case 'con-prf': return applyPrf();
    case 'con-axis':
      con.axis = el.dataset.axis;
      return paintAll();
    case 'con-save': return saveLine();
    case 'con-raw': return sendRaw();
    case 'con-clear':
      con.log = [];
      return paintLog();
    default: return undefined;
  }
}

export function consoleChange(t) {
  if (t.id === 'con-poll') con.poll = t.checked;
}

// Esc stops the board from any page while connected; Enter sends the box it's in.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && con.link) {
    con.armUntil = 0;
    send(CMD.stop(), '정지 (Esc)', 'S');
  } else if (e.key === 'Enter' && (e.target.id === 'con-prf' || e.target.id === 'con-raw')) {
    e.preventDefault();
    if (e.target.id === 'con-prf') applyPrf();
    else sendRaw();
  }
});
// Leaving or reloading the page: try to leave the board stopped.
addEventListener('pagehide', () => con.link?.write(CMD.stop()));
