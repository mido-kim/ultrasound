// Reading measured values and checking them against a step's range.
// A field can hold several values ("150k, 220k, 1.2M"); each number may carry
// an SI prefix and a unit ("10 kΩ", "48.6V", "35 mA", "−4.95").

const PREFIX = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, 'μ': 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };
const UNIT_WORDS = ['v', 'a', 'ω', 'ohm', 'ohms', 'f', 'hz', 's', '%', 'w', 'mm', 'db'];

// Every number in the text, scaled by its prefix.
export function parseValues(text, unit = '') {
  const out = [];
  const s = String(text ?? '').replace(/−/g, '-').replace(/,(?=\d{3}\b)/g, '');
  const re = /([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([a-zA-Zµμ%Ω]*)/g;
  let m;
  while ((m = re.exec(s))) {
    let v = Number(m[1]);
    if (!Number.isFinite(v)) continue;
    const suffix = m[2] || '';
    const u = unit.toLowerCase();
    if (suffix && suffix.toLowerCase() !== u && PREFIX[suffix[0]] !== undefined) {
      const rest = suffix.slice(1).toLowerCase();
      if (rest === '' || rest === u || UNIT_WORDS.includes(rest)) v *= PREFIX[suffix[0]];
    }
    out.push(v);
  }
  return out;
}

// 'none' when there is no number yet, 'ok' when every value fits, 'out' when any doesn't.
export function judge(spec, text) {
  if (!spec) return { state: 'none', values: [], bad: [] };
  const values = parseValues(text, spec.unit);
  if (!values.length) return { state: 'none', values, bad: [] };
  const bad = values.filter((v0) => {
    const v = spec.abs ? Math.abs(v0) : v0;
    return (spec.min !== undefined && v < spec.min) || (spec.max !== undefined && v > spec.max);
  });
  return { state: bad.length ? 'out' : 'ok', values, bad };
}

// 0.0001 → "100 µ", 100000 → "100 k", 4.75 → "4.75"
export function si(n) {
  if (n === 0) return '0';
  const a = Math.abs(n);
  const steps = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n']];
  for (const [f, p] of steps) {
    if (a >= f * 0.9999) return `${trim(n / f)}${p ? ' ' + p : ''}`;
  }
  return trim(n);
}
const trim = (x) => String(Math.round(x * 1000) / 1000).replace('-', '−');

// The range as people read it: "4.75 – 5.25 V", "≥ 100 Ω", "≤ 0.3 A", "|x| ≤ 1.1 V".
export function describeSpec(spec) {
  if (!spec) return '';
  // "100 k" + Ω → "100 kΩ"; "4.75" + V → "4.75 V"; % and mm never take a prefix.
  const unit = (x) => {
    if (!spec.unit) return si(x);
    if (spec.unit === '%' || spec.unit === 'mm') return `${trim(x)} ${spec.unit}`;
    const t = si(x);
    return /\s[a-zA-Zµ]$/.test(t) ? `${t}${spec.unit}` : `${t} ${spec.unit}`;
  };
  const lead = spec.abs ? '|값| ' : '';
  if (spec.min !== undefined && spec.max !== undefined) return `${lead}${unit(spec.min)} – ${unit(spec.max)}`;
  if (spec.min !== undefined) return `${lead}≥ ${unit(spec.min)}`;
  if (spec.max !== undefined) return `${lead}≤ ${unit(spec.max)}`;
  return '';
}
