// What the US Control v5 firmware (firmware/us_control_v5_fw_v3; v1 and v2 in
// us_control_v5_fw and _v2) sends over USB: USC4 line packets (48-byte header +
// 12-bit samples + zlib CRC-32, little-endian, the same layout as
// host_v3/usc4.py) mixed with ASCII status lines that start with "#st=". Also
// the command bytes it takes. No DOM, no serial port: tests.js checks all of it.
// adcDelayNs (header offset 40) is signed: v2 and v3 start the ADC before the
// burst (about −5 µs), v1 started it 3–6 µs after.
// Header bytes 46 and 47 (v3) describe a pair line, fired on one element and
// received on another: rx, the receive channel, and rxSwitchUs, when the MUX
// moved to it (µs from the burst). Both 0 on a normal line, where rx = element.

export const N_ELEM = 16;
export const MAX_SAMPLES = 480;
export const HEADER = 48;
export const SAT_CODE = 4090; // firmware SAT_HIGH: flags bit 0 when the peak reaches it
export const PEAK_SKIP = 40; // the firmware's peak skips 40 samples after the burst (TX feedthrough)
export const SWEEP_MS = N_ELEM * 400; // T: 0.4 s per element, the main loop is busy meanwhile
export const MUX_SETTLE_US = 4; // MAX14866 tON and tOFF, max: how long the switches take after LE

// F n: the firmware's tx_hz_table (96 MHz timer / period).
export const FREQ_HZ = [1000000, 3000000, 3840000, 4000000, 4800000, 5052632, 6857143, 8000000];
export const FREQ_LABELS = ['1.000', '3.000', '3.840', '4.000', '4.800', '5.053', '6.857', '8.000'];
// st=0..5 in the status line (sys_state_t).
export const STATES = ['정지', '대기 (ARM)', '채널 선택', '송신', '수신', '고장'];
export const FAULT_BITS = [[0x02, 'ADC 시작 실패'], [0x04, 'ADC 오류'], [0x08, 'BREAK'], [0x10, '버스트 안 나감']];

const MAGIC = [0x55, 0x53, 0x43, 0x34]; // 'USC4'
const STATUS_HEAD = [0x23, 0x73, 0x74, 0x3d]; // '#st='
const NL = 0x0a;
const STATUS_MAX = 200;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

// zlib CRC-32 of bytes[start, end).
export function crc32(bytes, start = 0, end = bytes.length) {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// One line packet, as the firmware's build_packet() makes it.
export function encodeLine(samples, {
  sequence = 0, frame = 0, element = 0, mode = 'A', flags = 0, config = 0,
  fsHz = 1600000, txHz = 1000000, txTimeUs = 0, adcDelayNs = 0, rx = 0, rxSwitchUs = 0,
} = {}) {
  const n = samples.length;
  const buf = new Uint8Array(HEADER + 2 * n + 4);
  const v = new DataView(buf.buffer);
  buf.set(MAGIC, 0);
  v.setUint8(4, 1);
  v.setUint8(5, 1);
  v.setUint16(6, HEADER, true);
  v.setUint32(8, sequence >>> 0, true);
  v.setUint32(12, frame >>> 0, true);
  v.setUint8(16, element);
  v.setUint8(17, mode.charCodeAt(0));
  v.setUint8(18, 12);
  v.setUint8(19, flags);
  v.setUint16(20, n, true);
  v.setUint16(22, config, true);
  v.setUint32(24, fsHz, true);
  v.setUint32(28, txHz, true);
  v.setUint32(32, txTimeUs % 2 ** 32, true);
  v.setUint32(36, Math.floor(txTimeUs / 2 ** 32), true);
  v.setInt32(40, adcDelayNs, true);
  v.setUint16(44, 2 * n, true);
  v.setUint8(46, rxSwitchUs ? rx : 0);
  v.setUint8(47, rxSwitchUs);
  for (let i = 0; i < n; i++) v.setUint16(HEADER + 2 * i, samples[i], true);
  v.setUint32(HEADER + 2 * n, crc32(buf, 0, HEADER + 2 * n), true);
  return buf;
}

// The header at bytes[pos], or null when it isn't a valid one (same checks as
// host_v3/usc4.py, so a stray "USC4" inside sample data is not taken for a packet).
function readHeader(b, pos) {
  const v = new DataView(b.buffer, b.byteOffset + pos, HEADER);
  const h = {
    sequence: v.getUint32(8, true),
    frame: v.getUint32(12, true),
    element: v.getUint8(16),
    mode: String.fromCharCode(v.getUint8(17)),
    flags: v.getUint8(19),
    count: v.getUint16(20, true),
    config: v.getUint16(22, true),
    fsHz: v.getUint32(24, true),
    txHz: v.getUint32(28, true),
    txTimeUs: v.getUint32(32, true) + v.getUint32(36, true) * 2 ** 32,
    adcDelayNs: v.getInt32(40, true),
    rxSwitchUs: v.getUint8(47),
  };
  const rxByte = v.getUint8(46);
  h.rx = h.rxSwitchUs ? rxByte : h.element;
  const pairOk = h.rxSwitchUs ? rxByte < N_ELEM && rxByte !== h.element && 'AM'.includes(h.mode) : rxByte === 0;
  const ok = v.getUint8(4) === 1 && v.getUint8(5) === 1 && v.getUint16(6, true) === HEADER
    && h.element < N_ELEM && 'AMB'.includes(h.mode) && v.getUint8(18) === 12 && !(h.flags & ~7)
    && h.count >= 1 && h.count <= MAX_SAMPLES && v.getUint16(44, true) === 2 * h.count
    && pairOk && h.fsHz > 0 && h.txHz > 0;
  return ok ? h : null;
}

const startsWith = (b, pos, head) => head.every((x, k) => pos + k >= b.length || b[pos + k] === x);

// Feed it whatever the port returns; it gives back whole lines and status
// lines, and skips anything else (resynchronising on the next "USC4" or "#st=").
export class StreamParser {
  constructor() {
    this.buf = new Uint8Array(0);
    this.badCrc = 0;
    this.badHeader = 0;
    this.junk = 0;
  }

  feed(chunk) {
    const b = new Uint8Array(this.buf.length + chunk.length);
    b.set(this.buf);
    b.set(chunk, this.buf.length);
    const out = [];
    let pos = 0;
    while (pos < b.length) {
      const left = b.length - pos;
      if (b[pos] === MAGIC[0] && startsWith(b, pos, MAGIC)) {
        if (left < HEADER) break; // the rest of the header is still coming
        const h = readHeader(b, pos);
        if (!h) {
          this.badHeader++;
          pos++;
          continue;
        }
        const total = HEADER + 2 * h.count + 4;
        if (left < total) break;
        const body = pos + HEADER + 2 * h.count;
        const crc = (b[body] | (b[body + 1] << 8) | (b[body + 2] << 16) | (b[body + 3] << 24)) >>> 0;
        if (crc32(b, pos, body) !== crc) {
          this.badCrc++;
          pos++;
          continue;
        }
        const samples = new Uint16Array(h.count);
        let max = 0;
        for (let i = 0; i < h.count; i++) {
          const at = pos + HEADER + 2 * i;
          samples[i] = b[at] | (b[at + 1] << 8);
          if (samples[i] > max) max = samples[i];
        }
        if (max > 4095) {
          this.badHeader++;
          pos++;
          continue;
        }
        out.push({ type: 'line', ...h, samples });
        pos += total;
      } else if (b[pos] === STATUS_HEAD[0] && startsWith(b, pos, STATUS_HEAD)) {
        if (left < STATUS_HEAD.length) break;
        const end = b.subarray(pos, pos + STATUS_MAX).indexOf(NL);
        if (end < 0) {
          if (left < STATUS_MAX) break; // the rest of the line is still coming
          this.junk++;
          pos++;
          continue;
        }
        const text = String.fromCharCode(...b.subarray(pos, pos + end)).replace(/\r$/, '');
        out.push({ type: 'status', text, status: parseStatus(text) });
        pos += end + 1;
      } else {
        this.junk++;
        pos++;
      }
    }
    this.buf = b.slice(pos);
    return out;
  }
}

// "#st=0 f=0 prf=10 el=0 mode=A cfg=1 seq=0 skip=0 txerr=0 fault=0 hse=25 late=0 rx=- rxmiss=0"
// → numbers (fault is hex), or null for anything else. rx and rxmiss are v3's:
// undefined from an older firmware; rx null = '-', the element that fires.
export function parseStatus(text) {
  if (!String(text).startsWith('#st=')) return null;
  const f = {};
  for (const m of text.slice(1).matchAll(/(\w+)=(\S+)/g)) f[m[1]] = m[2];
  const num = (k, base = 10) => {
    const n = parseInt(f[k], base);
    return Number.isNaN(n) ? null : n;
  };
  return {
    st: num('st'), f: num('f'), prf: num('prf'), el: num('el'), mode: f.mode ?? null, cfg: num('cfg'),
    seq: num('seq'), skip: num('skip'), txerr: num('txerr'), fault: num('fault', 16), hse: num('hse'), late: num('late'),
    rx: f.rx === undefined ? undefined : num('rx'),
    rxmiss: f.rxmiss === undefined ? undefined : num('rxmiss'),
  };
}

export const faultNames = (bits) => FAULT_BITS.filter(([b]) => bits & b).map(([, name]) => name);

// Command bytes (cmd_parse in main.c). F and E take a byte, P two (hi, lo).
const c = (s) => s.charCodeAt(0);
export const CMD = {
  mode: (m) => Uint8Array.of(c(m)),
  freq: (i) => Uint8Array.of(c('F'), i),
  prf: (hz) => Uint8Array.of(c('P'), hz >> 8, hz & 0xff),
  element: (e) => Uint8Array.of(c('E'), e),
  listen: (e) => Uint8Array.of(c('L'), e === null ? 0xff : e), // receive element; null = the element that fires
  sequence: (list) => Uint8Array.of(c('Q'), list.length, ...list),
  arm: () => Uint8Array.of(c('R')),
  stop: () => Uint8Array.of(c('S')),
  shot: () => Uint8Array.of(c('X')),
  sweep: () => Uint8Array.of(c('T')),
  status: () => Uint8Array.of(c('?')),
};

export const clampPrf = (hz) => Math.min(2000, Math.max(1, Math.round(Number(hz)) || 1));

// Samples before the burst (v2: 8; v1 started after it: 0), and the last
// sample the firmware's peak leaves out: the burst and the 40 after it.
export const preSamples = (line) => Math.max(0, Math.floor((-line.adcDelayNs * line.fsHz) / 1e9));
export const peakSkip = (line) => PEAK_SKIP + preSamples(line);
// Where the burst starts, as a (fractional) sample index: < 0 for v1.
export const burstAt = (line) => (-line.adcDelayNs * line.fsHz) / 1e9;
export const isPair = (line) => Boolean(line.rxSwitchUs);

// The numbers the console shows for one line. peak/at: the firmware's own
// peak (after the burst and its first 40 samples), which sets SAT and the
// echo LED.
export function lineStats(line) {
  const s = line.samples;
  const skip = peakSkip(line);
  let peak = 0;
  let at = -1;
  let min = 4095;
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    const v = s[i];
    if (i > skip && v > peak) {
      peak = v;
      at = i;
    }
    if (v < min) min = v;
    sum += v;
  }
  return { peak, at, min, mean: s.length ? sum / s.length : 0, sat: Boolean(line.flags & 1) };
}

// Time of sample i from the burst start (v2: < 0 for the first 8, before the
// burst), and the depth that is at a given sound speed (there and back).
export const sampleUs = (line, i) => line.adcDelayNs / 1000 + (i * 1e6) / line.fsHz;
export const depthMm = (line, i, soundSpeed = 1480) => (soundSpeed * sampleUs(line, i)) / 2000;

// The ADC reads 0–3.3 V (the VND042's own 3.3 V) as code 0–4095. What it reads
// is the receiver's envelope output (TP605), not the element's RF voltage.
export const ADC_VREF = 3.3;
export const codeToV = (code) => (code * ADC_VREF) / 4095;
const V_TEXT = Array.from({ length: 4096 }, (_, c) => codeToV(c).toFixed(4));

// One line as CSV: time from the burst (and depth) against the ADC voltage. A
// pair line adds rx_ch: the board channel the receiver was on for that sample
// (the element that fired, until the MUX moved).
export function lineCsv(line, soundSpeed = 1480) {
  const pair = isPair(line);
  const rows = [`sample,time_us,depth_mm,adc_code,adc_V${pair ? ',rx_ch' : ''}`];
  line.samples.forEach((v, i) => {
    const t = sampleUs(line, i);
    const from = pair ? `,${t < line.rxSwitchUs ? line.element : line.rx}` : '';
    rows.push(`${i},${t.toFixed(4)},${depthMm(line, i, soundSpeed).toFixed(3)},${v},${V_TEXT[v]}${from}`);
  });
  return `${rows.join('\r\n')}\r\n`;
}

// One B-mode frame as a table: time and depth down the rows, then one column
// per element, in volts, in the order given. cols: [{ name, line }], each the
// element's latest line. The newest line sets the time axis; a column is left
// empty when its line is missing, older than the frame before the newest,
// or taken with other timing (another frequency).
function frameParts(cols) {
  const have = cols.map((c) => c.line).filter(Boolean);
  if (!have.length) return null;
  const ref = have.reduce((a, b) => (b.sequence > a.sequence ? b : a));
  const fits = (l) => l && (l.frame === ref.frame || l.frame === ref.frame - 1)
    && l.adcDelayNs === ref.adcDelayNs && l.fsHz === ref.fsHz && l.samples.length === ref.samples.length;
  return { ref, use: cols.map((c) => (fits(c.line) ? c.line.samples : null)) };
}
export function frameCsv(cols, soundSpeed = 1480) {
  const f = frameParts(cols);
  if (!f) return '';
  const rows = [['time_us', 'depth_mm', ...cols.map((c) => c.name)].join(',')];
  for (let i = 0; i < f.ref.samples.length; i++) {
    rows.push([sampleUs(f.ref, i).toFixed(4), depthMm(f.ref, i, soundSpeed).toFixed(3), ...f.use.map((s) => (s ? V_TEXT[s[i]] : ''))].join(','));
  }
  return `${rows.join('\r\n')}\r\n`;
}
// How many of the columns frameCsv fills, and the newest line it is timed by.
export const frameInfo = (cols) => {
  const f = frameParts(cols);
  return f ? { filled: f.use.filter(Boolean).length, ref: f.ref } : { filled: 0, ref: null };
};

// A recording as CSV, one row per line: the board's time of the burst, the
// PC's ms since the recording started, what was fired, then the voltage of
// every sample (V0…). Sample n is adc_start_us + n × dt_us after the burst.
// With pair lines in it, rx_ch, rx_element and rx_switch_us come before V0.
// recs: [{ ms, line, element, rxElement }]. Returned in pieces for a Blob: a
// long recording is tens of MB.
export function recordingCsv(recs) {
  const n = recs.reduce((m, r) => Math.max(m, r.line.samples.length), 0);
  const pairs = recs.some((r) => isPair(r.line));
  const head = ['board_us', 'pc_ms', 'seq', 'frame', 'board_ch', 'element', 'mode', 'tx_MHz', 'adc_start_us', 'dt_us', 'sat',
    ...(pairs ? ['rx_ch', 'rx_element', 'rx_switch_us'] : []),
    ...Array.from({ length: n }, (_, i) => `V${i}`)];
  const parts = [`${head.join(',')}\r\n`];
  let rows = [];
  for (const r of recs) {
    const l = r.line;
    const v = Array.from(l.samples, (c) => V_TEXT[c]);
    const rx = !pairs ? '' : isPair(l) ? `${l.rx},${r.rxElement ?? ''},${l.rxSwitchUs},` : `${l.element},${r.element ?? ''},,`;
    rows.push(`${l.txTimeUs},${r.ms},${l.sequence},${l.frame},${l.element},${r.element ?? ''},${l.mode},${(l.txHz / 1e6).toFixed(3)},`
      + `${(l.adcDelayNs / 1000).toFixed(3)},${(1e6 / l.fsHz).toFixed(4)},${l.flags & 1},${rx}${v.join(',')}`);
    if (rows.length === 500) {
      parts.push(`${rows.join('\r\n')}\r\n`);
      rows = [];
    }
  }
  if (rows.length) parts.push(`${rows.join('\r\n')}\r\n`);
  return parts;
}

// A recording as the board sent it: the USC4 packets back to back, byte for
// byte, for host_v3/usc4.py (LineParser) or anything else later.
export const recordingRaw = (recs) => recs.map((r) => encodeLine(r.line.samples, r.line));
