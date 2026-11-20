// 회로 비교 (#/compare): three ultrasound control circuits side by side.
//   USoP: Lin et al., Nat. Biotechnol. 42, 448–457 (2024), main text and
//     Supplementary Information (Supp. Fig. 9, Supp. Table 2, Extended Data Fig. 2).
//   WULPUS Pro Max: github.com/Sergio5714/wulpus-pro-max (docs, hw, errata)
//     and the WULPUS PRO paper, arXiv 2607.12137v2.
//   Ours: main v5.4 + HV v5.1 schematics, firmware v3, this app.
// Checked 2026-11-20. (계산) = worked out here, (그림) = read off a paper figure,
// 출처에 없음 = not found in that system's sources.
// Pictures: the drawings below are our own (inline SVG). The WULPUS PRO figures
// in compare/ are CC BY-SA 4.0 (credited on the page). USoP figures are
// © Springer Nature, so they never go in this public repo: they live in
// Firestore (config/compare, compareImages below) and show to signed-in accounts.
// Template strings: write a backslash twice, and never put ${ in the text.

export const COMPARE_DATE = '2026-11-20';

export const COMPARE_NAV = [
  ['c-glance', '한눈에'], ['c-draw', '그림으로'], ['c-tx', '송신'], ['c-rx', '수신'], ['c-sys', '데이터 · 전원 · 기판'],
  ['c-probe', '프로브'], ['c-result', '결과'], ['c-diff', '차이 해설'], ['c-figs', '논문 그림'], ['c-src', '자료'],
];

// Each row: [label, USoP, WULPUS Pro Max, ours].
export const COMPARE_TABLES = {
  glance: [
    ['무엇', '몸에 붙이는 완성 시스템. 움직이는 사람의 깊은 조직 추적', '오픈소스 초저전력 연구 플랫폼', '벤치 컨트롤러 + 16소자 어레이. 시험 중'],
    ['만든 곳', 'UC San Diego Xu 그룹, 2023', 'ETH Zürich에서 시작, 지금은 Vostrikov가 유지, 2026', '우리 팀, 2026'],
    ['채널', '32 (MAX14866 ×2)', '16 (HV2707)', '16 (MAX14866 ×1)'],
    ['송신', '약 100 V 음의 임펄스 1번 (그림)', '0–30 V 단극 사각 펄스', '±48 V 양극 사각 3사이클'],
    ['수신 이득', '×220 고정 (약 47 dB)', '6 dB + VGA 최대 70 dB, TGC', '×121 고정 (41.7 dB)'],
    ['디지털화', 'RF, 12 Msps 12비트', 'RF, 8 Msps 12비트. 포락선도 고름', '포락선만, 1.6 Msps 12비트'],
    ['한 줄', '수신 창 320 µs', '400샘플 = 50 µs, 약 3.9 cm (계산)', '480샘플 = 300 µs, 약 23 cm'],
    ['PRF', '25 Hz – 1 kHz', '최대 500 Hz, 연속은 약 300 Hz', '1–2000 Hz 설정, 기본 10 Hz'],
    ['링크', 'Wi-Fi', 'USB 또는 Wi-Fi (호스트 보드)', 'USB'],
    ['전력', '614 mW', '35–58 mW + 링크', '측정 안 함'],
    ['크기', 'fPCB, 접으면 3 × 4 cm', '39 × 21 × 6 mm, 5 g', '110 × 76.5 mm 보드 2장 + MCU 보드'],
    ['공개', '논문 · 서플, ML 코드, 데이터', '회로 · 펌웨어 · 소프트웨어 전부', '이 앱 코드'],
  ],
  tx: [
    ['펄서', '부스트 + N-MOSFET 스위치 (CPH3459)', '게이트 드라이버 IXDD604가 바로 펄서', '드라이버 MD1213 + MOSFET 쌍 TC6320'],
    ['고전압', '보드 위 부스트 (390 µH, 출력 2.2 µF · 200 V). 값은 출처에 없음', '칩 하나 (LT3463)로 ±30 V. 배터리 레일에서', 'B0524S 4개 직렬 ±48 V (가벼운 부하면 약 ±54 V) 또는 벤치 전원'],
    ['진폭', '약 100 V (그림). 펄스 쪽에 100 V 제너 (BZX100A)', '30 V', '±48 V = 96 Vpp'],
    ['파형', '음의 임펄스 1번. 폭은 130 pF + 가변저항', '사각 펄스 0–127개, 듀티 50 %', '사각 3사이클, 양극'],
    ['주파수', '소자가 정함', '0.2–10 MHz', '96 MHz ÷ 정수: 1–8 MHz 중 8개'],
    ['동시 송신', '소자 하나씩 차례로 (합성 개구)', '아무 조합. 시험은 전 채널 (평면파)', '소자 하나'],
    ['송신 뒤', '직렬 다이오드 + 300 Ω 접지 (회로도)', '드라이버 출력이 고임피던스', 'MOSFET 꺼짐. R702 330 Ω은 BUS에 남음'],
    ['순서 제어', 'ATmega328P. 줄당 1 ms (수신 320 µs + MUX 680 µs)', 'MSP430 PPG. MUX 설정 16개를 차례로', 'STM32 타이머 + SPI. MUX 전환 4 µs 이내'],
    ['송신 허가', '출처에 없음', '출처에 없음', 'OE = ARM · WINDOW · PGOOD (지금 PGOOD는 SW201)'],
  ],
  rx: [
    ['T/R', 'MD0101 (4채널 중 1개 사용)', 'MD0100', 'MD0100, BUS에서 분기'],
    ['입력', '1 nF 결합 + 120 Ω 종단', 'AC 결합 (CMUT 바이어스와 겸용)', 'BAV99 클램프 2개, VMID 1.65 V 바이어스'],
    ['앰프', 'ADA4895 반전 1단 (22 kΩ / 100 Ω) + ADA4897 버퍼 2개', 'OPA836 버퍼 6 dB (CMUT은 TIA로)', 'LMH6629 비반전 2단 (1 kΩ / 100 Ω)'],
    ['이득', '×220, 잡음 이득 221', 'AD8338 VGA 0–74 dB', '×11 × ×11 = ×121'],
    ['깊이 보정 (TGC)', '블록도엔 VGA. 회로도엔 수동 가변저항만', '있음. RC 경사 + 디지털 가변저항', '없음'],
    ['앰프 대역', '약 7 MHz (계산)', '14 MHz (0.3–14.3 MHz)', '단마다 약 360 MHz (계산)'],
    ['검파 앞 필터', '앰프가 대역을 자름', '능동 저역 필터 (4 MHz)', '없음'],
    ['검파', '없음, RF 그대로', 'LT5507, 켜고 끌 수 있음', '1N5711W 다이오드 + 대역 RC (J601)'],
    ['ADC', 'PIC32MZ 내장, 12 Msps', 'MSP430FR5043 내장, 8 Msps', 'STM32F411 내장, 1.6 Msps'],
    ['쓸 수 있는 대역', '6 MHz까지 (나이퀴스트)', '1.4 MHz (0.2–1.6 MHz). 3 MHz까지 SNR 30 dB 넘음', '포락선 약 0.2 MHz (계산)'],
  ],
  sys: [
    ['링크', 'ESP32-S3 Wi-Fi, 약 10 m에서 3.4 Mbps', '호스트 보드 (XIAO ESP32-C6): USB 또는 Wi-Fi/TCP. BLE (nRF52)는 옛 방식', 'USB (CDC). 줄마다 1012 B + CRC-32'],
    ['보드와 링크', 'DAQ 모듈 (PIC32MZ + ESP32-S3)', 'SPI 8 MHz로 호스트 보드에', 'STM32가 USB를 직접'],
    ['화면 · 처리', '스마트폰 앱. 클라우드 ML (VGG13)로 채널 자동 선택, DAS 빔포밍', '데스크톱 GUI · Python. DAS + 코히런스 가중', '이 앱의 펌웨어 콘솔: A · M · B, 녹화, CSV'],
    ['전원', '3.7 V 리튬폴리머 (400 mAh 2.4 h – 2 Ah 12 h)', '호스트가 3.3 V · 저잡음 3.3 V · 5 V · 배터리를 줌', '벤치 +5 V · +3.3 V (J2) + HV 보드'],
    ['소비 전력', '614 mW (3.7 V에서 166 mA: AFE 24 mA, DAQ 142 mA)', '보드 35 mW (50 Hz) – 58 mW (300 Hz). 링크 BLE 12 mW, Wi-Fi 314 mW', '측정 안 함 (메인 3.3 V 약 30 mA)'],
    ['기판', '4층 fPCB: AFE 3 × 4 cm + DAQ 3 × 3 cm', '6층, 양면 실장', '2층 FR4, 윗면만 (메인 126개, HV 40개)'],
    ['크기', '접으면 3 × 4 cm', '39 × 21 × 6 mm, 5 g + 호스트 39 × 21 × 7 mm, 5 g', '메인 · HV 110 × 76.5 mm, VND042 23 × 53 mm'],
    ['비용', '출처에 없음', '약 USD 260 (PCBWay 조립, 3대 기준)', '–'],
    ['봉지 · 부착', 'Ecoflex 몰드, 의료용 실리콘 접착', '출처에 없음', '없음 (벤치)'],
  ],
  probe: [
    ['압전체', '1-3 복합체 PZT-5H (DeL Piezo) + 백킹', '상용 Vermon LA-2.25-32 · LA-5-32, polyCMUT', 'STEMINC PZT 판 3 × 3 × 0.55 mm, 백킹 없음'],
    ['주파수', '2 · 4 · 6 MHz', '2.25 · 5 MHz, CMUT 3 MHz', '공진 약 3.67 MHz (판 정격 3.8 MHz)'],
    ['대역', '약 50 %', '89 % (2.25 MHz), 72 % (5 MHz)', '측정 안 함'],
    ['배열', '4 MHz: 32열, 열마다 8개 병렬, 0.8 mm 피치', '32소자 0.6 mm 피치를 2개씩 묶어 16채널', '8 × 2 = 16개, 4 mm 피치 (v2-5)'],
    ['연결', '레이저 Cu 서펜타인, ACF 열압착 (14회, 10 Ω 미만)', 'DF40 0.4 mm 보드 커넥터, 케이블은 DF52 16핀', 'FPC → ZIF (Molex 54132)'],
    ['피부 쪽 전극', 'GND 전극 (잡음 줄임)', '출처에 없음', '확인 필요'],
  ],
  result: [
    ['깊이', '2 MHz 약 164 mm, 4 MHz 약 78 mm, 6 MHz 약 9 mm', '팬텀 3 cm 영상', '11/05 젤라틴 팬텀 바닥 9–13 cm (v1 어레이)'],
    ['축 해상도', '약 600 µm (2 MHz), 330 µm (4 MHz), 230 µm (6 MHz)', '약 0.7 mm (2.25 MHz, 3 cm)', '측정 안 함'],
    ['측 해상도', '출처에 없음', '약 2.3 mm (3 cm)', '측정 안 함'],
    ['SNR', '출처에 없음', '약 45 dB (총 이득 41.9 dB)', '측정 안 함'],
    ['B 모드 속도', '출처에 없음', '18.75장/s (300 Hz ÷ 16)', 'PRF ÷ 32 (계산)'],
    ['시연', '중심 혈압 · 심박 · 심박출량 12시간, 운동 중 추적', 'CIRS 팬텀, polyCMUT, TGC 21 → 53 dB', '보드 검증 중. 수신 앰프 발진 조사 중'],
  ],
};

const HEAD = '<tr class="h"><th></th><th>USoP</th><th>WULPUS Pro Max</th><th class="ours">우리</th></tr>';
const table = (rows) => `<div class="tw"><table class="cmp">${HEAD}${rows.map(([k, a, b, c]) =>
  `<tr><td class="k">${k}</td><td>${a}</td><td>${b}</td><td class="ours">${c}</td></tr>`).join('')}</table></div>`;

const link = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
const WP = 'https://github.com/Sergio5714/wulpus-pro-max';

// ---------------------------------------------------------------- drawings
// Inline SVG, our own. Colors come from the app's tokens through the .cfig
// classes in app.css (light and dark); text uses the body font.

const T = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const r1 = (n) => Math.round(n * 10) / 10;

// A box with centered lines: the first bold, the rest small.
function box(x, y, w, h, lines, cls = '') {
  const lh = 15;
  const top = y + h / 2 - ((lines.length - 1) * lh) / 2 + 4;
  const text = lines.map((s, i) => `<text class="${i ? 's' : 'b'}" x="${r1(x + w / 2)}" y="${r1(top + i * lh)}" text-anchor="middle">${T(s)}</text>`).join('');
  return `<rect class="bx ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>${text}`;
}

const MARK = { 'ln-tx': 'cmp-ah-tx', 'ln-rx': 'cmp-ah-rx' };
const arrow = (x1, y1, x2, y2, cls) => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${MARK[cls] ? ` marker-end="url(#${MARK[cls]})"` : ''}/>`;

const marker = (id, cls) => `<marker id="${id}" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path class="${cls}" d="M0,0 L8,4 L0,8 z"/></marker>`;

// One lane of the signal-path drawing: MCU on the left, MUX and array on the
// right, transmit along the top row to the shared node, receive from the
// node down through the T/R switch and back left to the MCU.
const CHAIN_W = 1200;
const LANE_H = 150;
function chainLane(k, d) {
  const y0 = 40 + k * LANE_H;
  const ty = y0 + 30, ry = y0 + 92, bh = 46, full = ry + bh - ty;
  const tc = ty + bh / 2, rc = ry + bh / 2;
  const NX = 900, MUX_X = 980, MUX_W = 100, AR_X = 1104, AR_W = 84;
  let s = d.ours ? `<rect class="lane-ours" x="2" y="${y0 + 4}" width="${CHAIN_W - 4}" height="${LANE_H - 2}" rx="10"/>` : '';
  s += `<text class="t" x="14" y="${y0 + 22}">${T(d.title)}</text>`;
  s += box(12, ty, 124, full, d.mcu, 'mcu');
  let prev = 136;
  d.tx.forEach((b, i) => {
    const x = 160 + i * 164;
    s += arrow(prev, tc, x - 1, tc, 'ln-tx') + box(x, ty, 140, bh, b, 'tx');
    prev = x + 140;
  });
  s += `<line class="ln-tx" x1="${prev}" y1="${tc}" x2="${NX}" y2="${tc}"/>`;
  s += `<line class="ln" x1="${NX}" y1="${tc}" x2="${MUX_X}" y2="${tc}"/>`;
  s += `<circle class="node" cx="${NX}" cy="${tc}" r="4"/><text class="s" x="${NX}" y="${tc - 10}" text-anchor="middle">${T(d.node)}</text>`;
  s += box(MUX_X, ty, MUX_W, full, d.mux, 'mux');
  s += `<line class="ln" x1="${MUX_X + MUX_W}" y1="${ty + full / 2}" x2="${AR_X}" y2="${ty + full / 2}"/>`;
  s += box(AR_X, ty, AR_W, full, d.arr, 'arr');
  const TR_X = NX - 60;
  s += arrow(NX, tc + 4, NX, ry - 1, 'ln-rx') + box(TR_X, ry, 120, bh, d.tr, 'rx');
  let left = TR_X;
  d.rx.forEach((b) => {
    const x = left - 18 - 118;
    s += arrow(left, rc, x + 118 + 1, rc, 'ln-rx') + box(x, ry, 118, bh, b, 'rx');
    left = x;
  });
  s += arrow(left, rc, 137, rc, 'ln-rx');
  return s;
}

const CHAINS = [
  {
    title: 'USoP',
    mcu: ['ATmega328P', '시퀀서', 'PIC32MZ ADC', 'ESP32-S3 Wi-Fi'],
    tx: [['부스트', '390 µH → HVDC'], ['CPH3459 스위치', '임펄스 약 100 V']],
    node: '10 nF 결합',
    mux: ['MAX14866 ×2', '32채널'],
    arr: ['어레이', '1-3 PZT-5H'],
    tr: ['MD0101', 'T/R'],
    rx: [['1 nF · 120 Ω', '종단'], ['ADA4895', '×220 (47 dB)'], ['ADA4897', '버퍼 ×2']],
  },
  {
    title: 'WULPUS Pro Max',
    mcu: ['MSP430FR5043', 'PPG 펄스', 'ADC 8 Msps', 'SPI → 호스트'],
    tx: [['IXDD604 펄서', '0–30 V · LT3463']],
    node: '한 점 연결',
    mux: ['HV2707', '16채널'],
    arr: ['어레이', 'PZT · CMUT'],
    tr: ['MD0100', 'T/R'],
    rx: [['OPA836', '6 dB 버퍼'], ['AD8338 VGA', 'TGC 0–74 dB'], ['LT5507', '포락선 (선택)'], ['저역 필터', '4 MHz']],
  },
  {
    title: '우리 (main v5.4 + HV v5.1)',
    ours: true,
    mcu: ['STM32F411', 'TIM1 · SPI', 'ADC 1.6 Msps', 'USB → 콘솔'],
    tx: [['허가 게이트', 'ARM·WINDOW·PGOOD'], ['MD1213', '게이트 구동 ±5 V'], ['TC6320', '±48 V (B0524S ×4)']],
    node: 'BUS · R701 · R702',
    mux: ['MAX14866', '16채널'],
    arr: ['v2-5', 'PZT 판 16개'],
    tr: ['MD0100', 'T/R'],
    rx: [['BAV99 클램프', 'VMID 1.65 V'], ['LMH6629 ×2', '×121 (41.7 dB)'], ['1N5711W', '다이오드 검파'], ['RC · OPA320', '버퍼 → TP605']],
  },
];

function chainSvg() {
  const h = 40 + CHAINS.length * LANE_H + 6;
  const legend = `<line class="ln-tx" x1="14" y1="18" x2="44" y2="18"/><text class="s" x="50" y="22">송신 (고전압)</text>`
    + `<line class="ln-rx" x1="150" y1="18" x2="180" y2="18"/><text class="s" x="186" y="22">수신 (에코)</text>`
    + `<line class="ln" x1="276" y1="18" x2="306" y2="18"/><text class="s" x="312" y="22">송수신 같이 (마디 → MUX → 소자)</text>`;
  return `<svg viewBox="0 0 ${CHAIN_W} ${h}" role="img" aria-label="세 회로의 송신 · 수신 경로">
    <defs>${marker('cmp-ah-tx', 'mk-tx')}${marker('cmp-ah-rx', 'mk-rx')}</defs>
    ${legend}${CHAINS.map((d, k) => chainLane(k, d)).join('')}</svg>`;
}

// Transmit waveforms on one scale: volts up, µs across.
function burst(start, f, n, hi, lo) {
  const half = 1 / f / 2;
  const pts = [[0, 0], [start, 0]];
  for (let i = 0; i < n; i++) {
    const t = start + 2 * i * half;
    pts.push([t, hi], [t + half, hi], [t + half, lo], [t + 2 * half, lo]);
  }
  pts.push([start + 2 * n * half, 0], [1.5, 0]);
  return pts;
}
const WAVES = [
  { title: 'USoP', sub: '약 100 V 음의 임펄스 1번', pts: [[0, 0], [0.3, 0], [0.31, -100], [0.45, -100], [0.47, 0], [1.5, 0]] },
  { title: 'WULPUS Pro Max', sub: '0–30 V 사각 펄스, 개수 조절', pts: burst(0.2, 2.25, 3, 30, 0) },
  { title: '우리', sub: '±48 V 사각 3사이클', pts: burst(0.2, 3.84, 3, 48, -48), ours: true },
];

function waveSvg() {
  const cy = 145, vs = 0.72, us = 220;
  const panels = WAVES.map((w, i) => {
    const x0 = 10 + i * 395, px0 = x0 + 44;
    const X = (t) => r1(px0 + t * us), Y = (v) => r1(cy - v * vs);
    const grid = [100, 50, 0, -50, -100].map((v) => `<line class="${v ? 'grid' : 'zero'}" x1="${px0}" y1="${Y(v)}" x2="${X(1.5)}" y2="${Y(v)}"/>`
      + `<text class="s" x="${px0 - 6}" y="${Y(v) + 4}" text-anchor="end">${v > 0 ? '+' : ''}${v === 0 ? 0 : String(v).replace('-', '−')}</text>`).join('');
    const ticks = [0, 0.5, 1, 1.5].map((t) => `<text class="s" x="${X(t)}" y="250" text-anchor="middle">${t}${t === 1.5 ? ' µs' : ''}</text>`).join('');
    const path = w.pts.map(([t, v], j) => `${j ? 'L' : 'M'}${X(t)},${Y(v)}`).join(' ');
    return `${w.ours ? `<rect class="lane-ours" x="${x0}" y="4" width="385" height="256" rx="10"/>` : ''}
      <text class="t" x="${px0}" y="24">${T(w.title)}</text><text class="s" x="${px0}" y="40">${T(w.sub)}</text>
      ${grid}${ticks}<path class="wave" d="${path}"/>`;
  }).join('');
  return `<svg viewBox="0 0 1200 264" role="img" aria-label="세 회로의 송신 파형, 같은 눈금">${panels}</svg>`;
}

// Which elements fire and which listen, shot by shot (8 elements drawn).
const SCHEMES = [
  { title: 'USoP', rows: [['줄 1', 'b.......'], ['줄 2', '.b......']], note: ['한 소자로 쏘고 같은 소자로 들어요.', '소자를 차례로 바꿔 소프트웨어로 합쳐요.'] },
  { title: 'WULPUS Pro Max', rows: [['줄 1', 'bfffffff'], ['줄 2', 'fbffffff']], note: ['전 채널이 같이 쏘고 한 채널만 들어요.', '16번 쏘면 한 장 (PRF ÷ 16).'] },
  { title: '우리', ours: true, rows: [['줄 1', 'b.......'], ['줄 2', '.b......'], ['짝 줄 (v3)', 'fl......']], note: ['한 소자로 쏘고 들어요. 소자 바꿀 때 한 틱 쉬어요.', '짝 줄은 한 소자로 쏘고 다른 소자로 들어요.'] },
];
const EL_CLS = { b: 'el fire listen', f: 'el fire', l: 'el listen', '.': 'el' };

function schemeSvg() {
  const panels = SCHEMES.map((d, i) => {
    const x0 = 10 + i * 395;
    const rows = d.rows.map(([label, cells], j) => {
      const y = 40 + j * 34;
      return `<text class="s" x="${x0 + 14}" y="${y + 16}">${T(label)}</text>`
        + [...cells].map((c, n) => `<rect class="${EL_CLS[c]}" x="${x0 + 104 + n * 30}" y="${y}" width="22" height="22" rx="3"/>`).join('');
    }).join('');
    const note = d.note.map((s, j) => `<text class="s" x="${x0 + 14}" y="${150 + j * 17}">${T(s)}</text>`).join('');
    return `${d.ours ? `<rect class="lane-ours" x="${x0}" y="4" width="385" height="190" rx="10"/>` : ''}<text class="t" x="${x0 + 14}" y="26">${T(d.title)}</text>${rows}${note}`;
  }).join('');
  const legend = `<rect class="el fire" x="14" y="206" width="16" height="16" rx="3"/><text class="s" x="36" y="219">쏨</text>`
    + `<rect class="el listen" x="74" y="206" width="16" height="16" rx="3"/><text class="s" x="96" y="219">들음</text>`
    + `<rect class="el fire listen" x="146" y="206" width="16" height="16" rx="3"/><text class="s" x="168" y="219">둘 다</text>`
    + `<text class="s" x="220" y="219">소자 8개만 그렸어요</text>`;
  return `<svg viewBox="0 0 1200 230" role="img" aria-label="한 번 쏠 때 쏘는 소자와 듣는 소자">${panels}${legend}</svg>`;
}

const fig = (svg, caption) => `<figure class="cfig"><div class="cfig-scroll">${svg}</div><figcaption>${caption}</figcaption></figure>`;

// ---------------------------------------------------------------- paper figures
// WULPUS PRO, arXiv 2607.12137v2, CC BY-SA 4.0: resized copies in compare/.
const WULPUS_FIGS = [
  { src: 'compare/wulpus_pro_fig1.jpg', w: 1600, h: 1117, wide: true, cap: '<b>Fig. 1</b> 블록도 (a), 평가 보드 (b), polyCMUT를 단 모듈 (c)' },
  { src: 'compare/wulpus_pro_fig2.png', w: 1838, h: 717, wide: true, cap: '<b>Fig. 2</b> 전원: 호스트가 배터리 · 3.3 V · 5 V를 주고, LT3463이 ±30 V를 만들어요' },
  { src: 'compare/wulpus_pro_fig10.png', w: 348, h: 383, cap: '<b>Fig. 10</b> 2.25 MHz 어레이 B 모드 (CIRS 팬텀, 3 cm)' },
];

const paperFig = (f) => `<figure class="pfig${f.wide ? ' wide' : ''}">
  <a href="${f.src}" target="_blank" rel="noopener"><img src="${f.src}" width="${f.w}" height="${f.h}" alt="" loading="lazy" decoding="async"></a>
  <figcaption><span>${f.cap}</span></figcaption></figure>`;

// Pictures in Firestore (config/compare), for signed-in accounts only:
//   { id: 'compare', images: [{ file, caption, sys, src }], updatedAt, updatedBy }
export const PIC_SYSTEMS = [['usop', 'USoP'], ['wulpus', 'WULPUS Pro Max'], ['ours', '우리']];
export const PIC_SOURCE = {
  usop: 'Lin et al., Nat. Biotechnol. 42, 448–457 (2024). © Springer Nature',
  wulpus: 'Vostrikov et al., arXiv 2607.12137v2. CC BY-SA 4.0',
  ours: '',
};
export const compareImages = (rec) => (Array.isArray(rec?.images) ? rec.images.filter((x) => x && x.file) : []);
export const compareRecord = (images, by) => ({ id: 'compare', images, updatedAt: new Date().toISOString(), updatedBy: by });

// ---------------------------------------------------------------- the page

const section = (id, title, body) => `<section id="${id}" class="stack">\n  <h2>${title}</h2>\n  ${body}\n</section>`;

const DIFF_HTML = `
  <ul class="cmp-list">
    <li><b>송신 전압.</b> USoP 약 100 V, 우리 96 Vpp, WULPUS 30 V예요. WULPUS는 전 채널 동시 송신, 상용 어레이, 좁은 수신 대역, TGC, RF 빔포밍으로 낮은 전압을 메워요.</li>
    <li><b>수신 대역.</b> USoP는 앰프가 약 7 MHz에서, WULPUS는 약 1.4 MHz에서 잘라요. 우리는 검파 앞에 필터가 없어 수백 MHz 잡음까지 정류해요.</li>
    <li><b>이득 구조.</b> USoP와 우리 앰프는 둘 다 최소 안정 이득 10인 칩이에요. USoP는 이득 221로 한계에서 멀고, 우리는 11로 바로 위예요. WULPUS는 이득을 VGA에 몰았어요.</li>
    <li><b>깊이 보정.</b> TGC는 WULPUS만 있어요 (시연 21 → 53 dB). 우리는 고정 이득이라 쓸 수 있는 에코 범위가 약 10 dB예요 (시뮬레이션).</li>
    <li><b>디지털화.</b> 두 논문은 RF를 받아 소프트웨어로 빔포밍해요. 우리는 포락선만 받아서 빔포밍은 못 해요. 대신 데이터가 가볍고 한 줄에 23 cm가 담겨요.</li>
    <li><b>송신 방식과 프레임.</b> WULPUS는 전 채널을 한꺼번에 쏘고 한 채널씩 들어요. 16번에 한 장이에요. 우리 B 모드는 소자를 바꿀 때 한 틱을 쉬어서 32틱에 한 장이에요.</li>
    <li><b>송신 파형.</b> USoP는 임펄스 한 번이에요. 백킹이 있어 소자가 짧게 울려요. 백킹 없는 우리 소자에는 공진에 맞춘 버스트가 더 맞아요 (판단).</li>
    <li><b>보드 한 장.</b> WULPUS는 30 V라 고전압도 칩 하나, 펄서도 칩 하나예요. 기판은 6층 양면 실장이에요. 우리는 ±48 V 모듈 4개라 HV 보드를 따로 둬요.</li>
    <li><b>전력.</b> USoP는 614 mW 중 약 86 %를 DAQ 모듈 (ADC · Wi-Fi)이 써요. WULPUS 보드는 35–58 mW이고 Wi-Fi가 314 mW를 따로 써요.</li>
    <li><b>잡음.</b> WULPUS는 전원 레일마다 수신 대역을 막는 필터를 달았어요. USoP는 피부 쪽을 GND 전극으로 해서 잡음을 줄였어요.</li>
  </ul>
  <div class="note warn">
    <span class="tag">해볼 만한 것 (제안)</span>
    <ol>
      <li>검파 앞에 대역 필터. 소자 주파수 근처만 통과</li>
      <li>수신 앰프를 안정 한계에서 멀리. 한 단 고이득이나 Rf/Rg 240/24 Ω</li>
      <li>B 모드: 줄 끝에 다음 소자로 MUX를 미리 바꾸기 (펌웨어). 프레임이 2배</li>
      <li>여러 소자 동시 송신 (펌웨어). 펄서 전류부터 확인</li>
      <li>TGC (VGA)</li>
      <li>다음 세대: RF 디지털화 (10 Msps급 ADC)</li>
    </ol>
  </div>`;

const SOURCES_HTML = `
  <div class="two">
    <div class="stack">
      <h3>USoP</h3>
      <ul>
        <li>${link('https://doi.org/10.1038/s41587-023-01800-0', '논문')} Nat Biotechnol 42, 448–457. 서플도 같은 페이지</li>
        <li>회로: 서플 Supp. Fig. 9 · Supp. Table 2, 본문 Extended Data Fig. 2</li>
        <li>${link('https://github.com/MuyangLin95/Autonomous-Ultrasound-CodeData', 'GitHub')} ML 코드만, 회로는 없음</li>
        <li>${link('https://doi.org/10.6084/m9.figshare.22631047.v4', '데이터')} figshare</li>
      </ul>
    </div>
    <div class="stack">
      <h3>WULPUS Pro Max</h3>
      <ul>
        <li>${link(WP, 'GitHub')} 회로 (Altium · KiCad), 펌웨어, 소프트웨어</li>
        <li>${link(`${WP}/blob/main/docs/full_specifications.md`, '사양')} · ${link(`${WP}/blob/main/docs/operating_modes.md`, 'PRF 안내')} · ${link(`${WP}/blob/main/docs/host_board_options.md`, '호스트 보드')} · ${link(`${WP}/blob/main/hw/wulpus_pro_acq_pcb_dev_board/docs/ERRATA.MD`, '정오표')}</li>
        <li>${link('https://arxiv.org/abs/2607.12137', '논문')} arXiv 2607.12137 (WULPUS PRO). 서플은 없어요</li>
      </ul>
    </div>
    <div class="stack">
      <h3>우리</h3>
      <ul>
        <li><a href="#/guide">보드 지도 · 표</a> · <a href="#/console">펌웨어 콘솔</a></li>
        <li>회로도 v5.4 · v5.1과 펌웨어 v3는 프로젝트 폴더에 있어요</li>
        <li>${link('https://github.com/mido-kim/ultrasound', 'GitHub')} 이 앱 코드</li>
      </ul>
    </div>
  </div>`;

// The whole page body; `signedInPics` is the Firestore picture block from main.js.
export function comparePageHtml(signedInPics = '') {
  return `
<div class="note info">
  <span class="tag">읽는 법</span>
  <p>${COMPARE_DATE} 기준이에요. (계산)은 여기서 계산한 값, (그림)은 논문 그림에서 잰 값이에요. 나머지는 출처에 적힌 그대로예요.</p>
</div>
${section('c-glance', '한눈에', table(COMPARE_TABLES.glance))}
${section('c-draw', '그림으로', `
  ${fig(chainSvg(), '송신은 위 줄 (MCU → 펄서 → 마디), 수신은 아래 줄 (마디 → T/R → 앰프 → MCU). 세 회로 모두 펄서와 T/R이 한 마디에서 MUX로 이어져요.')}
  ${fig(waveSvg(), '같은 눈금 (세로 V, 가로 µs). USoP 높이는 그림에서 잰 값이고, 펄스 폭 · WULPUS 개수와 주파수 (2.25 MHz) · 우리 주파수 (3.84 MHz)는 예시예요.')}
  ${fig(schemeSvg(), '한 번 쏠 때 어느 소자가 쏘고 어느 소자가 듣는지. WULPUS는 16채널을 다 쓰고, USoP는 32채널이에요.')}`)}
${section('c-tx', '송신', table(COMPARE_TABLES.tx))}
${section('c-rx', '수신', table(COMPARE_TABLES.rx))}
${section('c-sys', '데이터 · 전원 · 기판', table(COMPARE_TABLES.sys))}
${section('c-probe', '프로브', table(COMPARE_TABLES.probe))}
${section('c-result', '결과', table(COMPARE_TABLES.result))}
${section('c-diff', '차이 해설', DIFF_HTML)}
${section('c-figs', '논문 그림', `
  <h3>WULPUS PRO</h3>
  <div class="pfigs">${WULPUS_FIGS.map(paperFig).join('')}</div>
  <p class="small muted">그림: Vostrikov et al., "WULPUS PRO", ${link('https://arxiv.org/abs/2607.12137', 'arXiv 2607.12137v2')}, ${link('https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY-SA 4.0')}. 크기만 줄였어요.</p>
  ${signedInPics}`)}
${section('c-src', '자료', SOURCES_HTML)}`;
}
