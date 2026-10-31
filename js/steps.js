// The board check procedure: stages, and the steps in each one for each kind
// of board. Based on us_control_v5.4_pcb_bringup_guide.html, mapped to the
// real test points, connectors and jumpers of main v5.4 and HV v5.1.
//
// A step's id is stored with every result, so never change or reuse an id;
// add new ids instead. Shown numbers ("2-3") come from order, per board kind:
// a main board's stages show as 1–4 though their n is 0 1 3 4.
//
//   spec  { unit, min, max }   the measured value is checked against this range
//                              (any number of values in one field; all must fit;
//                              abs: true compares the size, ignoring the sign)
//   rec   true                 record-only: the value is written down, no range
//
// Keep the text short: what to look at, and what counts as OK.

export const KINDS = {
  main: { name: '메인 보드 v5.4', short: '메인' },
  hv: { name: 'HV 보드 v5.1', short: 'HV' },
  system: { name: '연결 테스트 (메인 + HV)', short: '연결' },
};

export const STAGES = [
  {
    n: 0,
    title: '눈으로 확인',
    meta: '전원 없이 · 확대경',
    kinds: ['main', 'hv'],
    intro: '전원 넣기 전에 부품 방향, 극성, 납 브리지를 봅니다.',
  },
  {
    n: 1,
    title: '저항 재기',
    meta: '전원 없이 · 멀티미터 저항',
    kinds: ['main', 'hv'],
    intro: '값이 천천히 오르면 멈출 때까지 기다렸다 적어요. 10 Ω 아래면 그 레일 부품의 브리지부터 의심. 검은 리드: 메인은 TP707, HV는 TP905.',
  },
  {
    n: 2,
    title: 'HV 보드 켜기',
    meta: '5 V 벤치 전원 · 메인 보드와 연결 안 함',
    kinds: ['hv'],
    setup: [['on', 'HV 보드만'], ['off', 'J2 비움'], ['hv', 'J901 · J902 = 1-2 (STACK)'], ['on', 'JP901 · JP902 꽂음'], ['on', 'J1 ← 벤치 5.00 V, 300 mA 제한'], ['on', '기준 GND = TP905']],
    notes: [{
      tone: 'warn', tag: '예상 전류',
      text: '약 0.15–0.25 A (추정). 나중에 메인에 붙이면 이 전류를 VND042 5 V가 대요.',
    }, {
      tone: 'danger', tag: '주의',
      text: 'TP901 · TP903에는 스코프 · USB 접지를 물리지 마세요. TP905 기준 멀티미터로만 재요.',
    }],
  },
  {
    n: 3,
    title: '메인 보드 켜기',
    meta: '벤치 전원 · VND042 없이 · 펌웨어 없이',
    kinds: ['main'],
    intro: 'J2로 벤치 전원을 넣고 전원 레일, 송신 허가 회로, 수신 회로를 봅니다. 드라이버 입력이 저항으로 묶여 있어서 FET는 계속 꺼져 있어요.',
    setup: [['off', 'J1 비움 (VND042 없음)'], ['off', 'J3 · J4 비움'], ['off', 'R702 비움'], ['off', 'J1001 비움'], ['off', 'SW201 열림'], ['on', 'J2-1 ← 5.00 V, 100 mA 제한'], ['on', 'J2-3 ← 3.30 V, 100 mA 제한'], ['on', '두 채널 같이 켜기']],
  },
  {
    n: 4,
    title: '펌웨어 올리기',
    meta: 'VND042 연결 · HV는 0 V로 묶음',
    kinds: ['main'],
    setup: [['on', 'VND042 ↔ J1 · J2'], ['off', 'J2 벤치 전원 뺌'], ['hv', 'J3 단락 플러그 (1 · 2 · 3 묶음)'], ['off', 'HV 보드 연결 안 함'], ['off', 'R702 · 어레이 없음']],
    notes: [{
      tone: 'warn', tag: '먼저',
      text: '펌웨어는 firmware/us_control_v5_fw 폴더에 있어요. 빌드는 되지만 보드에선 아직 안 돌려봤어요. 노트북에 깔 것은 보드 지도 · 표 → 노트북 준비, 배선은 그 폴더 README에.',
    }, {
      tone: 'info', tag: 'J3 단락 플러그',
      text: 'J3의 1 · 2 · 3번을 한 선으로 묶은 플러그를 꽂아 ±HV를 GND에 고정해요. 이 상태에서만 게이트 파형(TP701 · TP703)을 일반 프로브로 봐요.',
    }],
  },
  {
    n: 5,
    title: '고전압 경로',
    meta: '벤치 ±5 → ±24 V · HV 보드 BENCH 모드 · PRF ≤ 10 Hz · 3사이클',
    kinds: ['system'],
    setup: [['off', 'J3 단락 플러그 뺌'], ['hv', 'HV J2 ↔ 메인 J3'], ['off', '메인 J4 ↔ HV J1 연결 안 함'], ['hv', 'J901 · J902 = 2-3 (BENCH)'], ['hv', 'J903 ← 이중 벤치 전원, 0 V부터, 전류 제한 낮게'], ['on', 'R702 ← 330 Ω 20 W'], ['on', 'R702 단자에 더미 C (≥ 200 V)']],
    notes: [{
      tone: 'danger', tag: '시작 조건',
      text: '두 보드의 앞 단계 모두 통과, SW201 인터록 확인, 차동 프로브 준비. 차동 프로브가 없으면 시작하지 않아요.',
    }, {
      tone: 'info', tag: '스택은 꺼 둠',
      text: 'HV 보드에 5 V를 안 주면 ±50 V 스택은 꺼져 있어요. D901 · D902가 ±5 V에서 거의 안 켜지는 건 정상.',
    }, {
      tone: 'warn', tag: '올리는 순서',
      text: '아래 1단 → 5단 순서로. 전압과 주파수를 한꺼번에 올리지 않아요. 단마다 아래 펄서 측정을 다시 봐요.',
    }],
  },
  {
    n: 6,
    title: '±48 V 스택',
    meta: '고전압 경로를 ±24 V까지 통과한 뒤',
    kinds: ['system'],
    setup: [['off', '전원 다 끄고 바꾸기'], ['off', 'J903 벤치 전원 뺌'], ['hv', 'J901 · J902 = 1-2 (STACK)'], ['on', '메인 J4 ↔ HV J1 연결'], ['hv', 'HV J2 ↔ 메인 J3']],
  },
  {
    n: 7,
    title: '어레이 연결 · 영상',
    meta: 'J1001 · 3.84 MHz부터',
    kinds: ['system'],
    intro: 'J1001은 홀수 핀 = EL0–EL15, 짝수 핀 = GND. 어레이 FPC 핀 배치가 맞는지 먼저 봐요. 접지 전극이 피검체 쪽. 3.8 MHz 소자는 F 2 (3.840 MHz)부터.',
  },
];

const V = (min, max) => ({ unit: 'V', min, max });

export const STEPS = [
  // ---------------------------------------------------------------- 0 · main
  { id: 'm0.ics', stage: 0, kind: 'main', do: 'IC 방향 (1번 핀 = 실크 점): U201 · U301 · U401 · U501 · U601–U604 · U701 · U801 · D601 · D602', pass: '13개 모두 맞음' },
  { id: 'm0.qfn', stage: 0, kind: 'main', do: 'U501 (MAX14866) · U401 (MD1213) 핀 옆면', pass: '브리지 없음, 모든 핀에 납' },
  { id: 'm0.led', stage: 0, kind: 'main', do: 'LED D201 · D301 · D302 · D303 방향', pass: '평평한 면 · 짧은 다리 = 사각 패드 (왼쪽)' },
  { id: 'm0.cap', stage: 0, kind: 'main', do: '전해 C702 · C704 극성 (사각 패드 = +)', pass: 'C702는 + 가 +HV 쪽, C704는 + 가 GND 쪽' },
  { id: 'm0.d603', stage: 0, kind: 'main', do: 'D603 방향', pass: '띠가 오른쪽' },
  { id: 'm0.ffc', stage: 0, kind: 'main', do: 'J1001 FFC 커넥터 · R702 단자대', pass: '핀 브리지 없음, 잠금 레버 움직임, 단자대 입구가 보드 바깥쪽' },
  { id: 'm0.jmp', stage: 0, kind: 'main', do: '점퍼 기본 위치', pass: 'SW201 · JP301–303 열림, J601 한 줄 (1 nF)' },

  // ---------------------------------------------------------------- 0 · HV
  { id: 'h0.mod', stage: 0, kind: 'hv', do: 'B0524S U901–U904 방향', pass: '1번 핀 = 사각 패드, 몸체가 실크 선 위' },
  { id: 'h0.cap', stage: 0, kind: 'hv', do: '전해 C909–C912 극성 (사각 패드 = +)', pass: '+ 가 더 높은 전압 쪽: C909 · C910 위쪽, C911 GND 쪽, C912 −24 쪽' },
  { id: 'h0.led', stage: 0, kind: 'hv', do: 'LED D901 · D902 방향', pass: '평평한 면 · 짧은 다리 = 사각 패드 (왼쪽)' },
  { id: 'h0.term', stage: 0, kind: 'hv', do: 'J903 단자대 방향', pass: '입구가 보드 바깥쪽' },
  { id: 'h0.jmp', stage: 0, kind: 'hv', do: '점퍼 기본 위치', pass: 'J901 · J902 = 1-2 (STACK), JP901 · JP902 꽂음' },

  // ---------------------------------------------------------------- 1 · main
  { id: 'm1.5v', stage: 1, kind: 'main', do: '+5V (J2-1) → GND', pass: '100 Ω 이상', spec: { unit: 'Ω', min: 100 } },
  { id: 'm1.33', stage: 1, kind: 'main', do: '+3V3 (J2-3) → GND', pass: '100 Ω 이상 (20 kΩ 근처에서 멈추면 정상)', spec: { unit: 'Ω', min: 100 } },
  { id: 'm1.n5', stage: 1, kind: 'main', do: '−5V (C304 · C305의 −5V 쪽 패드) → GND', pass: '100 Ω 이상', spec: { unit: 'Ω', min: 100 } },
  { id: 'm1.5to33', stage: 1, kind: 'main', do: '+5V (J2-1) ↔ +3V3 (J2-3)', pass: '100 Ω 이상', spec: { unit: 'Ω', min: 100 } },
  { id: 'm1.hv', stage: 1, kind: 'main', do: 'TP702 (+HV) → GND, TP704 (−HV) → GND, TP702 ↔ TP704', pass: '셋 다 100 kΩ 이상 (계속 오름)', spec: { unit: 'Ω', min: 100e3 } },
  { id: 'm1.bus', stage: 1, kind: 'main', do: 'TP706 (BUS) → GND, R702 비운 채', pass: '1 kΩ 이상 (다이오드처럼 보일 수 있음)', spec: { unit: 'Ω', min: 1e3 } },
  { id: 'm1.pulls', stage: 1, kind: 'main', do: '풀 저항 6개: J1-1 · J1-2 · J1-4 · J1-10 → GND, J1-9 · J1-5 → +3V3', pass: '모두 약 10 kΩ', spec: { unit: 'Ω', min: 9e3, max: 11e3 } },
  { id: 'm1.ffc', stage: 1, kind: 'main', do: 'J1001: EL 핀 (홀수) ↔ 옆 GND 핀 (짝수), 16쌍', pass: '0 Ω인 쌍 없음' },

  // ---------------------------------------------------------------- 1 · HV
  { id: 'h1.5v', stage: 1, kind: 'hv', do: '+5V (J1-1) → GND', pass: '100 Ω 이상', spec: { unit: 'Ω', min: 100 } },
  { id: 'h1.loads', stage: 1, kind: 'hv', do: '단마다 4개: TP901→TP905, TP902→TP901, TP905→TP903, TP903→TP904', pass: '각 5.6 kΩ 또는 조금 낮음. 0 Ω이나 끊김이면 그 저항 · 모듈 납땜', spec: { unit: 'Ω', min: 2e3, max: 6.2e3 } },

  // ---------------------------------------------------------------- 2 · HV alone
  { id: 'h2.iin', stage: 2, kind: 'hv', do: '5 V 켜고 입력 전류', pass: '0.3 A 제한에 안 걸림 (약 0.15–0.25 A). 걸리면 바로 끄고 모듈 방향 · 전해 극성 확인', spec: { unit: 'A', max: 0.3 } },
  { id: 'h2.p24', stage: 2, kind: 'hv', do: 'TP901 (+24)', pass: '+23.5 … +26.5 V', spec: V(23.5, 26.5) },
  { id: 'h2.n24', stage: 2, kind: 'hv', do: 'TP903 (−24)', pass: '−26.5 … −23.5 V', spec: V(-26.5, -23.5) },
  { id: 'h2.p48', stage: 2, kind: 'hv', do: 'TP902 (+48)', pass: '+47 … +53 V', spec: V(47, 53) },
  { id: 'h2.n48', stage: 2, kind: 'hv', do: 'TP904 (−48)', pass: '−53 … −47 V', spec: V(-53, -47) },
  { id: 'h2.sym', stage: 2, kind: 'hv', do: '|TP902|와 |TP904| 차이', pass: '10 % 이내', spec: { unit: '%', max: 10 } },
  { id: 'h2.out', stage: 2, kind: 'hv', do: 'J2-1 (+HV) · J2-3 (−HV), TP905 기준', pass: 'TP902 · TP904와 같은 값' },
  { id: 'h2.led', stage: 2, kind: 'hv', do: 'D901 · D902, JP901 뺐다 꽂기', pass: '둘 다 켜짐, 뺀 쪽만 꺼짐' },
  { id: 'h2.ffc50', stage: 2, kind: 'hv', do: '50 V 넘는지: TP902, |TP904|', pass: '값 기록. 넘으면 어레이 연결 전에 결정 (FFC 커넥터 정격 50 V)', rec: true },
  { id: 'h2.rip', stage: 2, kind: 'hv', do: 'TP902 리플 (스코프 AC)', pass: 'mVpp · 주파수', rec: true },
  { id: 'h2.line', stage: 2, kind: 'hv', do: '(선택) 입력 4.75 V · 5.25 V일 때 TP902', pass: '입력 1 %당 출력 약 1.2 %', rec: true },
  { id: 'h2.dis', stage: 2, kind: 'hv', do: '5 V 끄고 TP902가 1 V 아래로 가는 시간', pass: '수십 ms 예상', rec: true },
  { id: 'h2.bench', stage: 2, kind: 'hv', do: '전원 끄고 J901 · J902 = 2-3으로: J2-1 ↔ J903 왼쪽, J2-1 ↔ TP902', pass: '0 Ω / 끊김. 확인 후 다시 1-2로' },

  // ---------------------------------------------------------------- 3 · main bench
  { id: 'm3.i33', stage: 3, kind: 'main', group: '전원 레일', do: '켠 직후 3.3 V 전류', pass: '100 mA 제한 안 걸림 (약 30–45 mA)', spec: { unit: 'A', max: 0.1 } },
  { id: 'm3.i5', stage: 3, kind: 'main', group: '전원 레일', do: '5 V 전류, 뜨거운 부품', pass: '몇 mA, 뜨거운 것 없음', spec: { unit: 'A', max: 0.1 } },
  { id: 'm3.v5', stage: 3, kind: 'main', group: '전원 레일', do: '+5V (J2-1)', pass: '4.75 – 5.25 V', spec: V(4.75, 5.25) },
  { id: 'm3.v33', stage: 3, kind: 'main', group: '전원 레일', do: '+3V3 (J2-3)', pass: '3.15 – 3.45 V', spec: V(3.15, 3.45) },
  { id: 'm3.vn5', stage: 3, kind: 'main', group: '전원 레일', do: '−5V (C304 패드)', pass: '−5.5 … −4.9 V', spec: V(-5.5, -4.9) },
  { id: 'm3.vdd', stage: 3, kind: 'main', group: '전원 레일', do: '(+5V) − (−5V)', pass: '13 V 이하', spec: V(undefined, 13) },
  { id: 'm3.rip', stage: 3, kind: 'main', group: '전원 레일', do: '−5 V 리플 (스코프 AC)', pass: 'mVpp · 주파수. 35 kHz 근처 성분은 정상 (MAX829)', rec: true },
  { id: 'm3.leds', stage: 3, kind: 'main', group: '전원 레일', do: 'JP301 · JP302 · JP303 하나씩 꽂았다 빼기', pass: 'D301 · D302 · D303 켜짐. 레일 변화 기록' },
  { id: 'm3.oe0', stage: 3, kind: 'main', group: '송신 허가 회로 (손으로)', do: '기본 상태에서 TP403 (OE), D201', pass: 'TP403 < 0.3 V, D201 꺼짐', spec: V(undefined, 0.3) },
  { id: 'm3.truth', stage: 3, kind: 'main', group: '송신 허가 회로 (손으로)', do: 'J1-1 · J1-2를 +3V3에 이어 HIGH, SW201 닫기 · 열기. 8가지 조합마다 TP403', pass: '셋 다 HIGH일 때만 > 2.9 V, 나머지 < 0.3 V. SW201 닫으면 D201 켜짐' },
  { id: 'm3.lock', stage: 3, kind: 'main', group: '송신 허가 회로 (손으로)', do: 'J1-1 · J1-2 HIGH, SW201 닫은 상태에서 SW201 열기', pass: 'TP403 바로 LOW' },
  { id: 'm3.vmid', stage: 3, kind: 'main', group: '수신 회로', do: 'TP603 (VMID)', pass: '1.60 – 1.70 V', spec: V(1.6, 1.7) },
  { id: 'm3.lna1dc', stage: 3, kind: 'main', group: '수신 회로', do: 'LNA1 출력 (R606 · C610 패드)', pass: '1.50 – 1.80 V', spec: V(1.5, 1.8) },
  { id: 'm3.lna2dc', stage: 3, kind: 'main', group: '수신 회로', do: 'LNA2 출력 (R610 · R612 패드)', pass: '1.50 – 1.80 V', spec: V(1.5, 1.8) },
  { id: 'm3.osc', stage: 3, kind: 'main', group: '수신 회로', do: 'TP601을 100 nF로 GND에 묶고 LNA2 출력 보기', pass: '발진 없음. 있으면 U602 · U603 전원 옆 커패시터 납땜' },
  { id: 'm3.gain', stage: 3, kind: 'main', group: '수신 회로', do: 'AFG 1 MHz 1 mVpp → TP601, LNA2 출력', pass: '약 121 mVpp (41.6 dB). 실측 기록', rec: true },
  { id: 'm3.gainf', stage: 3, kind: 'main', group: '수신 회로', do: '같은 측정을 3.84 MHz · 8 MHz에서', pass: '주파수별 이득', rec: true },
  { id: 'm3.env', stage: 3, kind: 'main', group: '수신 회로', do: 'AFG 3사이클 5 mV → TP604 (ENV), J601을 주파수에 맞게', pass: '포락선이 오르내림, 리플 10 % 이내' },
  { id: 'm3.adc', stage: 3, kind: 'main', group: '수신 회로', do: 'TP605 (ADC) 최고값', pass: '3.3 V 넘지 않음', spec: V(undefined, 3.3) },
  { id: 'm3.window', stage: 3, kind: 'main', group: '수신 회로', do: '3.84 MHz 버스트를 0.5 → 20 mV로 올리며 TP605', pass: '보이기 시작하는 입력, 포화되는 입력', rec: true },
  { id: 'm3.lna1in', stage: 3, kind: 'main', group: '수신 회로', do: '큰 입력에서 TP602 (LNA1_IN) 최고 · 최저', pass: '0.1 – 3.1 V', spec: V(0.1, 3.1) },

  // ---------------------------------------------------------------- 4 · main + firmware
  { id: 'm4.dfu', stage: 4, kind: 'main', group: 'MCU · 펌웨어', do: 'BOOT0 누른 채 USB → 펌웨어 쓰기 → USB 다시 꽂기', pass: '새 COM 포트가 생김 (장치 관리자 → 포트)' },
  { id: 'm4.status', stage: 4, kind: 'main', group: 'MCU · 펌웨어', do: '터미널에 ?', pass: '#st=0 … fault=0' },
  { id: 'm4.vnd5', stage: 4, kind: 'main', group: 'MCU · 펌웨어', do: 'VND042 5 V (J2-1)', pass: '4.75 – 5.25 V', spec: V(4.75, 5.25) },
  { id: 'm4.idle', stage: 4, kind: 'main', group: 'MCU · 펌웨어', do: 'J1-1 · J1-2: 리셋 직후, USB 다시 꽂은 뒤, S 보낸 뒤', pass: '모두 < 0.3 V', spec: V(undefined, 0.3) },
  { id: 'm4.nopulse', stage: 4, kind: 'main', group: 'MCU · 펌웨어', do: 'TP401 · TP402 스코프, 리셋 반복', pass: 'ARM 없이 펄스 없음, INB는 HIGH' },
  { id: 'm4.shot', stage: 4, kind: 'main', group: 'MCU · 펌웨어', do: 'X → ? (R은 계속 쏘기라서 안 씀)', pass: 'seq 1 증가, 상태 0으로 돌아옴' },
  { id: 'm4.lock', stage: 4, kind: 'main', group: '송신 허가 (펌웨어)', do: 'ARM 상태에서 SW201 열기, TP403', pass: '바로 LOW. 지연 기록' },
  { id: 'm4.lockfw', stage: 4, kind: 'main', group: '송신 허가 (펌웨어)', do: 'SW201 연 채 R · X 여러 번', pass: 'TP403 한 번도 안 올라감' },
  { id: 'm4.window', stage: 4, kind: 'main', group: '송신 허가 (펌웨어)', do: 'J1-2 (TX_WINDOW) 펄스 폭', pass: '버스트보다 길고 다음 펄스 전에 내려감', rec: true },
  { id: 'm4.outa', stage: 4, kind: 'main', group: 'MD1213 드라이버 (J3 단락 플러그)', do: 'OE = 0일 때 OUTA (C413 위 패드)', pass: '약 +5 V', spec: V(4.5, 5.5) },
  { id: 'm4.outb', stage: 4, kind: 'main', group: 'MD1213 드라이버 (J3 단락 플러그)', do: 'OE = 0일 때 OUTB (C414 위 패드)', pass: '약 −5 V', spec: V(-5.5, -4.5) },
  { id: 'm4.freq', stage: 4, kind: 'main', group: 'MD1213 드라이버 (J3 단락 플러그)', do: 'SW201 닫고 ARM, F 0–7마다 X → OUTA 주기', pass: '1 / 3 / 3.84 / 4 / 4.8 / 5.053 / 6.857 / 8 MHz ±1 %' },
  { id: 'm4.cycles', stage: 4, kind: 'main', group: 'MD1213 드라이버 (J3 단락 플러그)', do: '버스트 사이클 수', pass: '정확히 3' },
  { id: 'm4.overlap', stage: 4, kind: 'main', group: 'MD1213 드라이버 (J3 단락 플러그)', do: 'OUTA · OUTB 같이 보기', pass: '겹치는 순간 없음. 보이면 바로 멈추기' },
  { id: 'm4.dead', stage: 4, kind: 'main', group: 'MD1213 드라이버 (J3 단락 플러그)', do: '둘 다 꺼진 구간 (dead time) 폭', pass: '구간 있음. 폭 기록', rec: true },
  { id: 'm4.edge', stage: 4, kind: 'main', group: 'MD1213 드라이버 (J3 단락 플러그)', do: '8 MHz 상승시간, ±5 V 리플 · 전류', pass: '목표 10 ns 이하. 고전압 경로의 기준값', rec: true },
  { id: 'm4.open', stage: 4, kind: 'main', group: 'MAX14866 MUX', do: 'CLR 뒤 TP706 ↔ EL 핀 16개', pass: '모두 끊김' },
  { id: 'm4.sweep', stage: 4, kind: 'main', group: 'MAX14866 MUX', do: 'T 명령 (0.4초 간격 스윕)', pass: 'EL0 → EL15 하나씩만 연결' },
  { id: 'm4.ron', stage: 4, kind: 'main', group: 'MAX14866 MUX', do: '연결됐을 때 저항', pass: '8 – 20 Ω (리드 포함)', spec: { unit: 'Ω', min: 8, max: 20 } },
  { id: 'm4.spi', stage: 4, kind: 'main', group: 'MAX14866 MUX', do: 'J1-7 (SCK) · J1-9 (LE) · J1-10 (CLR) 스코프', pass: '16클럭 MSB 먼저, LE LOW ≥ 5 ns, CLR ≥ 115 ns' },
  { id: 'm4.cbus', stage: 4, kind: 'main', group: 'MAX14866 MUX', do: '(LCR 있으면) TP706 ↔ GND 용량', pass: '약 200 pF', rec: true },
  { id: 'm4.storm', stage: 4, kind: 'main', group: 'MAX14866 MUX', do: 'E 연속 전송', pass: '송수신 중엔 채널 안 바뀜, skip만 늘어남' },
  { id: 'm4.code', stage: 4, kind: 'main', group: 'ADC까지 (J3 단락 플러그 그대로)', do: 'AFG 5 mV → TP601, SW201 닫고 R + X → ADC 코드', pass: '300 – 800', spec: { unit: '', min: 300, max: 800 } },
  { id: 'm4.sat', stage: 4, kind: 'main', group: 'ADC까지 (J3 단락 플러그 그대로)', do: '입력 10배', pass: '뷰어에 SAT 표시' },

  // ---------------------------------------------------------------- 5 · system bench HV
  { id: 'x5.r1', stage: 5, kind: 'system', group: '전압 올리는 순서', do: '1단: ±5 V · 100 pF · 1 MHz', pass: '아래 측정 다 통과하면 다음 단', rec: true },
  { id: 'x5.r2', stage: 5, kind: 'system', group: '전압 올리는 순서', do: '2단: ±10 V · 100 pF', pass: '오버슈트 기록', rec: true },
  { id: 'x5.r3', stage: 5, kind: 'system', group: '전압 올리는 순서', do: '3단: ±10 V · 470 pF → 1 nF', pass: '발열 기록', rec: true },
  { id: 'x5.r4', stage: 5, kind: 'system', group: '전압 올리는 순서', do: '4단: ±12 → ±24 V · 1 nF', pass: '여기서 멈추고 송수신 분리 측정', rec: true },
  { id: 'x5.r5', stage: 5, kind: 'system', group: '전압 올리는 순서', do: '5단: 1 nF · 3.84 → 8 MHz', pass: '전압과 주파수를 한꺼번에 올리지 않기', rec: true },
  { id: 'x5.vgs', stage: 5, kind: 'system', group: '펄서 · BUS', do: 'VGS (TP701−TP702, TP703−TP704), 차동 프로브', pass: '두 FET가 같이 켜지는 구간 없음. 있으면 바로 전원 끄기' },
  { id: 'x5.bus', stage: 5, kind: 'system', group: '펄서 · BUS', do: 'BUS 진폭 (TP706)', pass: '레일의 약 0.85–0.95배', rec: true },
  { id: 'x5.ipk', stage: 5, kind: 'system', group: '펄서 · BUS', do: '+HV 피크 전류 (J3 +HV 선)', pass: '부하 · 주파수별 피크', rec: true },
  { id: 'x5.settle', stage: 5, kind: 'system', group: '펄서 · BUS', do: '버스트 뒤 BUS가 ±1 V 안으로 돌아오는 시간', pass: '4.5 µs 넘으면 펌웨어 대기 늘리기', rec: true },
  { id: 'x5.sag', stage: 5, kind: 'system', group: '펄서 · BUS', do: '버스트 중 TP702 · TP704 처짐 (TP707 기준)', pass: '크게 떨어지지 않음' },
  { id: 'x5.heat', stage: 5, kind: 'system', group: '펄서 · BUS', do: '10발 뒤 U701 온도', pass: '미지근. 뜨거우면 멈추기' },
  { id: 'x5.clamp', stage: 5, kind: 'system', group: '송수신 분리 · 블랭킹 (±10 V 이하부터)', do: 'EL0–GND에 더미 1 nF + 1 kΩ, TP601 최대 진폭', pass: '±1.1 V 이내 (D601 클램프)', spec: { unit: 'V', max: 1.1, abs: true } },
  { id: 'x5.lna1in', stage: 5, kind: 'system', group: '송수신 분리 · 블랭킹 (±10 V 이하부터)', do: 'TP602 (LNA1_IN) 최고 · 최저', pass: '0.1 – 3.1 V', spec: V(0.1, 3.1) },
  { id: 'x5.blank', stage: 5, kind: 'system', group: '송수신 분리 · 블랭킹 (±10 V 이하부터)', do: 'LNA2 출력이 1.65 V로 돌아오는 시간, 주파수 8개', pass: '펌웨어 blank_us[]에 넣기', rec: true },
  { id: 'x5.dead', stage: 5, kind: 'system', group: '송수신 분리 · 블랭킹 (±10 V 이하부터)', do: '버스트 뒤 작은 신호를 점점 일찍 넣기', pass: '보이는 최소 지연 (1 MHz에서 약 18 µs)', rec: true },
  { id: 'x5.load', stage: 5, kind: 'system', group: '송수신 분리 · 블랭킹 (±10 V 이하부터)', do: 'R702 뺐을 때 · 넣었을 때 에코 크기', pass: '감도 손실 dB', rec: true },
  { id: 'x5.le', stage: 5, kind: 'system', group: '송수신 분리 · 블랭킹 (±10 V 이하부터)', do: 'TP706 (BUS) · J1-9 (LE) 같이 보기', pass: 'BUS가 조용해진 뒤에만 LE (≥ 4.5 µs)' },
  { id: 'x5.xtalk', stage: 5, kind: 'system', group: '송수신 분리 · 블랭킹 (±10 V 이하부터)', do: 'EL0 쏠 때 EL1 (J1001 3번) 크기', pass: '−30 dB 이하 목표', rec: true },

  // ---------------------------------------------------------------- 6 · system stack
  { id: 'x6.start', stage: 6, kind: 'system', do: '켤 때 TP702 · TP704 파형', pass: '오버슈트 · 상승시간. 5 V가 먼저 떨어지지 않는지', rec: true },
  { id: 'x6.v5', stage: 6, kind: 'system', do: 'HV 보드 붙인 상태에서 VND042 5 V (J2-1)', pass: '4.75 – 5.25 V. 떨어지면 HV J1에 따로 5 V', spec: V(4.75, 5.25) },
  { id: 'x6.hvp', stage: 6, kind: 'system', do: 'TP702 (+HV), TP707 기준', pass: '+47 … +53 V', spec: V(47, 53) },
  { id: 'x6.hvn', stage: 6, kind: 'system', do: 'TP704 (−HV), TP707 기준', pass: '−53 … −47 V', spec: V(-53, -47) },
  { id: 'x6.sym', stage: 6, kind: 'system', do: '|TP702|와 |TP704| 차이', pass: '10 % 이내', spec: { unit: '%', max: 10 } },
  { id: 'x6.redo', stage: 6, kind: 'system', do: '고전압 경로의 펄서 · 송수신 측정 다시', pass: '±24 V 결과로 예상한 범위 안' },
  { id: 'x6.g3', stage: 6, kind: 'system', do: '소자 허용 전압 · Cp', pass: '허용 전압 > BUS 진폭. ±24 V · ±48 V 전후로 Cp 비교' },
  { id: 'x6.dis', stage: 6, kind: 'system', do: '끄고 TP702 · TP704가 1 V 아래로 가는 시간', pass: '수백 ms. 그 전엔 J3 케이블 뽑지 않기', rec: true },
  { id: 'x6.ffc', stage: 6, kind: 'system', do: 'FFC 50 V 문제 결정', pass: '어레이 연결 전에 정함' },

  // ---------------------------------------------------------------- 7 · array
  { id: 'x7.map', stage: 7, kind: 'system', do: '채널 맵: 소자 n을 쏘면서 그 소자를 톡톡', pass: '화면 잡음 위치 = 두드린 소자' },
  { id: 'x7.echo', stage: 7, kind: 'system', do: '수조에서 소자 하나, 반사판 5–10 cm', pass: 'A 모드에 에코' },
  { id: 'x7.cal', stage: 7, kind: 'system', do: '거리 2곳 이상으로 지연 보정 후 오차', pass: '2 mm 미만', spec: { unit: 'mm', max: 2 } },
  { id: 'x7.bmode', stage: 7, kind: 'system', do: '8채널 B 모드: 평평한 · 기울인 반사판', pass: '수평 띠 / 기운 띠. drop · CRC 0' },
  { id: 'x7.prf', stage: 7, kind: 'system', do: 'PRF 10 → 100 → 500 Hz', pass: 'drop이 시작되는 PRF', rec: true },
  { id: 'x7.mmode', stage: 7, kind: 'system', do: 'M 모드에서 표적 움직이기', pass: '궤적 보임, 끊김 없음' },
  { id: 'x7.safe', stage: 7, kind: 'system', do: 'USB 뽑았다 꽂기, 명령 연타, 리셋', pass: 'ARM이 저절로 켜지지 않음' },
  { id: 'x7.phantom', stage: 7, kind: 'system', do: '팬텀 와이어 깊이 오차 (음속은 팬텀 기록 값)', pass: '±1 mm 이내', spec: { unit: 'mm', max: 1 } },
];

// Stages a board of this kind goes through, numbered from 1 for that kind,
// each with its steps and their shown numbers.
export function stagesFor(kind) {
  return STAGES.filter((s) => s.kinds.includes(kind)).map((s, i) => {
    const shown = i + 1;
    const steps = STEPS.filter((st) => st.stage === s.n && st.kind === kind)
      .map((st, j) => ({ ...st, no: `${shown}-${j + 1}` }));
    return { ...s, shown, steps };
  });
}

export const stepById = new Map(STEPS.map((s) => [s.id, s]));
