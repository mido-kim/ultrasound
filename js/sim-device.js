// Development only (localhost ?dev): a pretend VND042 running the v5 firmware
// v2, so the console can be tried without a board. It keeps the firmware's
// rules (main.c): settings wait for the next shot, R and X only from 정지, T
// only while stopped and nothing answers for 6.4 s meanwhile, S works any
// time. It fires at the PRF, but at most 50 lines a second.

import { FREQ_HZ, N_ELEM, SWEEP_MS, encodeLine } from './usc4.js';

// v2's adc_pre_ticks[]: the ADC starts this many 96 MHz ticks before the burst.
const PRE_TICKS = [532, 484, 505, 508, 520, 523, 538, 484];
const delayNs = (f) => -Math.floor((PRE_TICKS[f] * 1000) / 96);

export function simPort() {
  let push = () => {};
  let timer = null;
  let rx = [];
  let statusWanted = false;
  let busyUntil = 0; // T sweep
  let single = false;
  const s = { st: 0, mode: 'A', f: 0, prf: 10, el: 0, cfg: 1, seq: 0, skip: 0, txerr: 0, fault: 0, hse: 25, late: 0, frame: 0, pos: 0, list: Array.from({ length: N_ELEM }, (_, i) => i) };
  let pending = null; // settings sent, applied at the next tick while armed
  let t0 = performance.now();

  const want = () => (pending ||= { mode: s.mode, f: s.f, prf: s.prf, el: s.el, list: s.list });
  const status = () => {
    if (performance.now() < busyUntil) {
      statusWanted = true;
      return;
    }
    statusWanted = false;
    const line = `#st=${s.st} f=${s.f} prf=${s.prf} el=${s.el} mode=${s.mode} cfg=${s.cfg} seq=${s.seq} skip=${s.skip} txerr=${s.txerr} fault=${s.fault.toString(16)} hse=${s.hse} late=${s.late}\n`;
    push(new TextEncoder().encode(line));
  };

  // Envelope-like samples, in time from the burst: quiet before it, the TX
  // feedthrough at it, an echo whose depth follows the element, noise on a
  // small baseline.
  const samples = (el, f) => {
    const out = new Uint16Array(480);
    const t0 = delayNs(f) / 1000; // µs of sample 0
    const center = 80 + el * 11.25; // µs
    const amp = 420 + 120 * Math.sin(performance.now() / 700);
    for (let i = 0; i < out.length; i++) {
      const t = t0 + i * 0.625;
      const feed = t >= 0 && t < 20 ? 3800 * Math.exp(-t / 3.5) : 0;
      const echo = amp * Math.exp(-(((t - center) / 4.4) ** 2));
      out[i] = Math.max(0, Math.min(4095, Math.round(110 + feed + echo + (Math.random() - 0.5) * 24)));
    }
    return out;
  };

  const fire = () => {
    if (pending) {
      const prf = s.prf;
      Object.assign(s, pending);
      pending = null;
      s.cfg++;
      s.pos = 0;
      if (s.prf !== prf) restartTimer();
    }
    const el = s.mode === 'B' ? s.list[s.pos] : s.el;
    const pkt = encodeLine(samples(el, s.f), {
      sequence: s.seq, frame: s.frame, element: el, mode: s.mode, config: s.cfg,
      fsHz: 1600000, txHz: FREQ_HZ[s.f], txTimeUs: Math.round((performance.now() - t0) * 1000) + 50,
      adcDelayNs: delayNs(s.f),
    });
    s.seq++;
    if (s.mode === 'B' && ++s.pos >= s.list.length) {
      s.pos = 0;
      s.frame++;
    }
    push(pkt);
    if (single) {
      single = false;
      s.st = 0;
    }
  };

  const tick = () => {
    if (s.st === 1 && performance.now() >= busyUntil) fire();
    if (statusWanted && performance.now() >= busyUntil) status();
  };
  const restartTimer = () => {
    clearInterval(timer);
    timer = setInterval(tick, 1000 / Math.min(50, s.prf));
  };

  const handle = (b) => {
    switch (String.fromCharCode(b[0])) {
      case 'A': case 'M': case 'B':
        want().mode = String.fromCharCode(b[0]);
        return 1;
      case 'F':
        if (b.length < 2) return 0;
        if (b[1] <= 7) want().f = b[1];
        else if (b[1] >= 48 && b[1] <= 55) want().f = b[1] - 48;
        return 2;
      case 'P':
        if (b.length < 3) return 0;
        want().prf = Math.min(2000, Math.max(1, (b[1] << 8) | b[2]));
        return 3;
      case 'E': {
        if (b.length < 2) return 0;
        const e = b[1] < N_ELEM ? b[1] : parseInt(String.fromCharCode(b[1]), 16);
        if (e >= 0 && e < N_ELEM) want().el = e;
        return 2;
      }
      case 'Q':
        if (b.length < 2) return 0;
        if (b[1] < 1 || b[1] > N_ELEM) return 2;
        if (b.length < 2 + b[1]) return 0;
        want().list = [...b.slice(2, 2 + b[1])].map((x) => x % N_ELEM);
        return 2 + b[1];
      case 'R':
        if (s.st === 0 && performance.now() >= busyUntil) {
          single = false;
          s.st = 1;
        }
        return 1;
      case 'X':
        if (performance.now() < busyUntil) return 1;
        single = true;
        if (s.st === 0) s.st = 1;
        return 1;
      case 'S':
        s.st = 0;
        single = false;
        return 1;
      case 'T':
        if (s.st === 0) busyUntil = performance.now() + SWEEP_MS;
        return 1;
      case '?':
        status();
        return 1;
      default:
        return 1;
    }
  };

  const readable = new ReadableStream({
    start(controller) {
      push = (bytes) => {
        try {
          controller.enqueue(bytes);
        } catch { /* closed */ }
      };
    },
    cancel() {
      clearInterval(timer);
    },
  });
  const writable = new WritableStream({
    write(chunk) {
      rx = rx.concat([...chunk]);
      for (;;) {
        const used = rx.length ? handle(rx) : 0;
        if (!used) break;
        rx = rx.slice(used);
      }
    },
  });

  return {
    sim: true,
    readable,
    writable,
    async open() {
      t0 = performance.now();
      restartTimer();
    },
    async close() {
      clearInterval(timer);
    },
    getInfo: () => ({ usbVendorId: 0x0483, usbProductId: 0x5740 }),
  };
}
