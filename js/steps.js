// The bring-up procedure: stages, and the steps in each one for each kind of
// board. Text and pass criteria follow us_control_v5_build_guide.html Rev 0.3,
// mapped to the real test points, connectors and jumpers of main v5.4 and HV v5.1.
//
// A step's id is stored with every result, so never change or reuse an id;
// add new ids instead. Its shown number ("3-7") is worked out from its order.
//
//   spec  { unit, min, max }   the measured value is checked against this range
//                              (any number of values in one field; all must fit;
//                              abs: true compares the size, ignoring the sign)
//   rec   true                 record-only: the value is written down, no range

export const KINDS = {
  main: { name: '메인 v5.4', short: '메인' },
  hv: { name: 'HV v5.1', short: 'HV' },
  system: { name: '시스템 (메인 + HV)', short: '시스템' },
};

export const STAGES = [
  {
    n: 0,
    title: '육안 · 극성 점검',
    meta: '전원 없음 · 확대경',
    kinds: ['main', 'hv'],
    intro: 'JLC가 실장한 IC는 방향이 틀릴 수 있고, 손납땜 부품은 극성이 틀리기 쉽습니다. 전원을 넣기 전에 여기서 걸러 냅니다.',
  },
  {
    n: 1,
    title: '무전원 저항 점검',
    meta: '전원 없음 · DMM 저항 모드',
    kinds: ['main', 'hv'],
    intro: '레일에 커패시터가 많아서 값이 천천히 올라갑니다. 몇 초 기다려 멈춘 값을 적습니다. 기준은 단락만 걸러 내는 하한이고, 10 Ω 아래로 붙어 있으면 그 레일에 연결된 부품의 브리지부터 의심합니다. 검은 리드는 메인 TP707, HV TP905.',
  },
  {
    n: 2,
    title: 'HV 보드 단독',
    meta: 'v5 블록 9 · 5 V 벤치 전원 · 메인 보드와 연결하지 않음',
    kinds: ['hv'],
    setup: [['on', 'HV 보드만'], ['off', 'J2 비움'], ['hv', 'J901 · J902 = 1-2 STACK'], ['on', 'JP901 · JP902 장착'], ['on', 'J1 ← 벤치 5.00 V, 전류제한 300 mA'], ['on', '기준 GND = TP905']],
    notes: [{
      tone: 'warn', tag: '예상 입력 전류',
      text: '데이터시트 기준 B0524S 한 개의 무부하 입력 전류는 18 mA(최대 30 mA)입니다. 여기에 단마다 5.6 kΩ 부하와 LED 전류(약 2 mA)가 더해져 보드 전체는 약 0.15–0.25 A가 예상됩니다(추정). 메인 보드에 연결하면 이 전류를 VND042의 5 V가 J4로 대므로, 실측값을 적어 두고 단계 6에서 5 V 강하를 다시 봅니다.',
    }, {
      tone: 'danger', tag: '중간점',
      text: '절연 중간점(TP901 · TP903)에 스코프 접지나 USB 접지를 물리지 않습니다. 측정은 TP905 기준 DMM으로 합니다.',
    }],
  },
  {
    n: 3,
    title: '메인 보드 · 벤치 저전압 (VND042 없이)',
    meta: 'v5 블록 3 · 2 · 6 · 펌웨어 없이 할 수 있는 것만',
    kinds: ['main'],
    intro: '펌웨어는 아직 한 번도 컴파일되지 않았습니다. 그래서 VND042 없이 J2로 벤치 전원을 넣고, 레일 · 송신 허가 게이트 · 수신 아날로그 체인을 먼저 확인합니다. INA는 R401로 LOW, INB는 R402로 HIGH에 묶여 있어서 OE가 올라가도 드라이버는 양쪽 FET를 모두 끄는 조합에 머뭅니다.',
    setup: [['off', 'J1 비움 (VND042 없음)'], ['off', 'J3 · J4 비움'], ['off', 'R702 부하 없음'], ['off', 'J1001 비움'], ['off', 'SW201 열림'], ['on', 'J2-1 ← 5.00 V, 100 mA 제한'], ['on', 'J2-3 ← 3.30 V, 100 mA 제한'], ['on', '두 채널 동시에 켬']],
  },
  {
    n: 4,
    title: '메인 보드 · VND042 + 펌웨어',
    meta: 'v5 블록 1 · 2 · 4 · 5 · 6 · HV는 0 V로 고정',
    kinds: ['main'],
    setup: [['on', 'VND042 ↔ J1 · J2'], ['off', 'J2 벤치 전원 제거'], ['hv', 'J3 단락 플러그 (1·2·3번 묶음)'], ['off', 'HV 보드 연결 안 함'], ['off', 'R702 부하 · 어레이 없음']],
    notes: [{
      tone: 'warn', tag: '시작 전',
      text: 'CubeMX 프로젝트를 만들고 firmware/us_control_v5_user_code.c를 넣어 빌드해야 합니다. 이 코드는 아직 컴파일된 적이 없습니다.',
    }, {
      tone: 'info', tag: 'J3 단락 플러그',
      text: 'PCB에서는 TC6320 게이트가 MD1213에 이미 연결돼 있습니다. 소스(±HV)를 떠 있게 둔 채 게이트만 흔드는 것은 금지라서, J3에 1 · 2 · 3번을 한 전선으로 묶은 3핀 소켓을 꽂아 +HV = −HV = GND로 고정합니다. 이 상태에서만 TP701 · TP703 게이트 파형을 일반 프로브로 볼 수 있습니다.',
    }],
  },
  {
    n: 5,
    title: 'HV 경로 · 벤치 ±5 → ±24 V',
    meta: 'v5 블록 7 · 8 · HV 보드 BENCH 모드 · PRF ≤ 10 Hz · 3사이클',
    kinds: ['system'],
    setup: [['off', 'J3 단락 플러그 제거'], ['hv', 'HV J2 ↔ 메인 J3 (1:1)'], ['off', '메인 J4 ↔ HV J1 연결 안 함'], ['hv', 'J901 · J902 = 2-3 BENCH'], ['hv', 'J903 ← 이중 벤치 전원, 0 V에서 시작, 전류제한 낮게'], ['on', 'R702 ← 330 Ω 20 W'], ['on', 'R702 단자에 더미 C 병렬 (≥200 V)']],
    notes: [{
      tone: 'danger', tag: '착수 조건',
      text: '단계 2 · 3 · 4 합격, SW201 인터록 동작 확인(G1의 임시 대체), 정격 차동 프로브 확보(G2). 차동 프로브가 없으면 이 단계를 시작하지 않습니다.',
    }, {
      tone: 'info', tag: '스택은 꺼 둠',
      text: 'HV 보드에 5 V를 주지 않으면 B0524S 스택이 꺼져 있어서 보드 어디에도 ±50 V가 없습니다. BENCH 모드에서는 스택이 필요 없으므로 J4 ↔ J1 케이블을 빼 둡니다. D901 · D902는 벤치 전압으로 켜지므로 ±5 V에서는 거의 안 보이는 것이 정상입니다.',
    }, {
      tone: 'warn', tag: '전압 래더',
      text: '7-1 ±5 V · 100 pF · 1 MHz → 7-2 ±10 V · 100 pF → 7-3 ±10 V · 470 pF → 1 nF → 7-4 ±12 → ±24 V · 1 nF → 7-5 직전 통과 후 3.84 → 8 MHz. 전압과 주파수를 동시에 올리지 않습니다. 매 단계 양 VGS(차동: TP701−TP702, TP703−TP704), BUS(TP706), +HV 피크 전류, 레일 새그, U701 발열을 기록합니다.',
    }],
  },
  {
    n: 6,
    title: 'B0524S 스택 ±48 V',
    meta: 'v5 블록 9 · 단계 5의 ±24 V까지 통과한 뒤',
    kinds: ['system'],
    setup: [['off', '모든 전원을 끈 뒤 바꿈'], ['off', 'J903 벤치 전원 분리'], ['hv', 'J901 · J902 = 1-2 STACK (둘 다)'], ['on', '메인 J4 ↔ HV J1 연결'], ['hv', 'HV J2 ↔ 메인 J3']],
  },
  {
    n: 7,
    title: '어레이 연결과 영상',
    meta: 'v5 블록 10 · 팬텀 절차는 v5 가이드와 us_phantom_v1_guide.html',
    kinds: ['system'],
    intro: 'J1001은 홀수 핀이 EL0–EL15, 짝수 핀이 GND입니다. 8소자 어레이의 FPC 꼬리 배치가 이와 맞는지 먼저 확인하고, 바로 맞지 않으면 FFC 케이블과 중계 보드를 씁니다. 접지 쪽 전극이 피검체를 향하게 두고, 3.8 MHz 소자는 주파수 인덱스 F 2 (3.840 MHz)부터 씁니다.',
  },
];

const V = (min, max) => ({ unit: 'V', min, max });

export const STEPS = [
  // ---------------------------------------------------------------- 0 · main
  { id: 'm0.ics', stage: 0, kind: 'main', do: 'JLC 실장 IC의 1번 핀 표시를 실크 점과 비교: U201 · U301 · U401 · U501 · U601–U604 · U701 · U801, D601 · D602 (BAV99)', pass: '13개 모두 실크 1번 표시와 같은 쪽' },
  { id: 'm0.qfn', stage: 0, kind: 'main', do: 'U501 (MAX14866, TQFN-48 0.5 mm)와 U401 (MD1213, QFN-12) 측면을 확대경으로', pass: '인접 핀 브리지 없음, 모든 핀에 필렛' },
  { id: 'm0.led', stage: 0, kind: 'main', do: 'LED D201 · D301 · D302 · D303', pass: '평평한 면 · 짧은 다리가 사각 패드(왼쪽)' },
  { id: 'm0.cap', stage: 0, kind: 'main', do: '전해 C702 · C704 (사각 패드 = +)', pass: 'C702는 + 다리가 +HV 쪽, C704는 + 다리가 GND 쪽(−HV가 −)' },
  { id: 'm0.d603', stage: 0, kind: 'main', do: 'D603 (1N5711W, SOD-123)', pass: '캐소드 띠가 오른쪽' },
  { id: 'm0.ffc', stage: 0, kind: 'main', do: 'J1001 FFC 32핀, R702 단자대', pass: 'FFC 인접 핀 브리지 없음 · 잠금 레버 동작, 단자대 전선 입구가 보드 가장자리 쪽' },
  { id: 'm0.jmp', stage: 0, kind: 'main', do: '점퍼 기본 상태: SW201 · JP301–303 열림, J601 한 줄 (1 nF)', pass: '가이드의 점퍼 표와 같음' },

  // ---------------------------------------------------------------- 0 · HV
  { id: 'h0.mod', stage: 0, kind: 'hv', do: 'B0524S U901–U904: 1번 핀과 몸체 방향', pass: '1번 핀이 사각 패드, 몸체가 실크 외곽선 위 (핀 줄 뒤쪽)' },
  { id: 'h0.cap', stage: 0, kind: 'hv', do: '전해 C909–C912 (사각 패드 = +)', pass: 'C909 · C910은 위쪽 노드가 +, C911은 + 다리가 GND 쪽, C912는 + 다리가 −24 쪽 (항상 더 높은 전위)' },
  { id: 'h0.led', stage: 0, kind: 'hv', do: 'LED D901 · D902', pass: '평평한 면 · 짧은 다리가 사각 패드(왼쪽)' },
  { id: 'h0.term', stage: 0, kind: 'hv', do: 'J903 단자대', pass: '전선 입구가 보드 가장자리 쪽' },
  { id: 'h0.jmp', stage: 0, kind: 'hv', do: '점퍼 기본 상태: J901 · J902 = 1-2 (STACK), JP901 · JP902 장착', pass: '두 선택 점퍼가 같은 위치' },

  // ---------------------------------------------------------------- 1 · main
  { id: 'm1.5v', stage: 1, kind: 'main', do: '+5V (J2-1) → GND', pass: '100 Ω 이상', spec: { unit: 'Ω', min: 100 } },
  { id: 'm1.33', stage: 1, kind: 'main', do: '+3V3 (J2-3) → GND', pass: '100 Ω 이상 (R601 + R602 = 20 kΩ 분압기가 있어 20 kΩ 이하로 멈추는 것은 정상)', spec: { unit: 'Ω', min: 100 } },
  { id: 'm1.n5', stage: 1, kind: 'main', do: '−5V (C304 또는 C305의 −5V 쪽 패드) → GND', pass: '100 Ω 이상', spec: { unit: 'Ω', min: 100 } },
  { id: 'm1.5to33', stage: 1, kind: 'main', do: '+5V (J2-1) ↔ +3V3 (J2-3)', pass: '100 Ω 이상', spec: { unit: 'Ω', min: 100 } },
  { id: 'm1.hv', stage: 1, kind: 'main', do: 'TP702 (+HV) → GND, TP704 (−HV) → GND, TP702 ↔ TP704 (세 값)', pass: '셋 다 100 kΩ 이상 (계속 올라감)', spec: { unit: 'Ω', min: 100e3 } },
  { id: 'm1.bus', stage: 1, kind: 'main', do: 'TP706 (BUS) → GND, R702 단자에 부하 없음', pass: '1 kΩ 이상 (MD0100 → BAV99 경로라 다이오드처럼 보일 수 있음)', spec: { unit: 'Ω', min: 1e3 } },
  { id: 'm1.pulls', stage: 1, kind: 'main', do: '풀 저항: J1-1 → GND (R201), J1-2 → GND (R202), J1-4 → GND (R401), J1-10 → GND (R502), J1-9 → +3V3 (R501), J1-5 → +3V3 (R402)', pass: '여섯 값 모두 약 10 kΩ', spec: { unit: 'Ω', min: 9e3, max: 11e3 } },
  { id: 'm1.ffc', stage: 1, kind: 'main', do: 'J1001: 각 EL 핀(홀수)과 바로 옆 GND 핀(짝수)', pass: '16쌍 모두 0 Ω 근처가 아님 (브리지 없음)' },

  // ---------------------------------------------------------------- 1 · HV
  { id: 'h1.5v', stage: 1, kind: 'hv', do: '+5V (J1-1) → GND', pass: '100 Ω 이상', spec: { unit: 'Ω', min: 100 } },
  { id: 'h1.loads', stage: 1, kind: 'hv', do: '단마다: TP901 → TP905 (R901), TP902 → TP901 (R902), TP905 → TP903 (R903), TP903 → TP904 (R904) (네 값)', pass: '각 약 5.6 kΩ 또는 조금 낮음 (꺼진 모듈 출력이 병렬로 보임). 0 Ω이나 개방이면 해당 R · 모듈 납땜', spec: { unit: 'Ω', min: 2e3, max: 6.2e3 } },

  // ---------------------------------------------------------------- 2 · HV alone
  { id: 'h2.iin', stage: 2, kind: 'hv', do: '5 V를 켜고 벤치 전원의 전류', pass: '전류제한(0.3 A)에 걸리지 않음, 약 0.15–0.25 A. 0.3 A에 닿으면 즉시 끄고 모듈 방향 · C909–C912 극성 · 출력 단락 확인', spec: { unit: 'A', max: 0.3 } },
  { id: 'h2.p24', stage: 2, kind: 'hv', do: 'TP901 (+24_MID)', pass: '+23.5 … +26.5 V (비안정화 모듈이라 경부하에서 규정보다 높게 나옴)', spec: V(23.5, 26.5) },
  { id: 'h2.n24', stage: 2, kind: 'hv', do: 'TP903 (−24_MID)', pass: '−26.5 … −23.5 V', spec: V(-26.5, -23.5) },
  { id: 'h2.p48', stage: 2, kind: 'hv', do: 'TP902 (+HV_STACK)', pass: '+47 … +53 V', spec: V(47, 53) },
  { id: 'h2.n48', stage: 2, kind: 'hv', do: 'TP904 (−HV_STACK)', pass: '−53 … −47 V', spec: V(-53, -47) },
  { id: 'h2.sym', stage: 2, kind: 'hv', do: '|TP902|와 |TP904|의 차이', pass: '10 % 이내', spec: { unit: '%', max: 10 } },
  { id: 'h2.out', stage: 2, kind: 'hv', do: 'J2-1 (+HV 출력) · J2-3 (−HV 출력)을 TP905 기준으로', pass: 'TP902 · TP904와 같은 값 (J901 · J902가 STACK을 출력으로 연결)' },
  { id: 'h2.led', stage: 2, kind: 'hv', do: 'D901 · D902, JP901을 뽑았다 꽂기', pass: '둘 다 점등, JP를 뽑으면 해당 LED만 꺼짐' },
  { id: 'h2.ffc50', stage: 2, kind: 'hv', do: '±50 V 판정: TP902 또는 |TP904|가 50 V를 넘는지', pass: '값을 기록. 넘으면 단계 7(어레이 연결) 전에 결정 — 어레이 FFC 커넥터 정격 50 V. 선택지: 실측값으로 정격 검토 / 스택 대신 벤치(J903)로 ±45 V 이하 / 새 버전에서 부하 저항 조정', rec: true },
  { id: 'h2.rip', stage: 2, kind: 'hv', do: 'TP902 리플 (스코프 AC 결합)', pass: 'mVpp와 주파수', rec: true },
  { id: 'h2.line', stage: 2, kind: 'hv', do: '(선택) 입력을 4.75 V · 5.25 V로 바꿔 TP902', pass: '입력 1 %당 출력 약 1.2 % (line regulation). VND042 5 V가 높으면 스택도 그만큼 높아짐', rec: true },
  { id: 'h2.dis', stage: 2, kind: 'hv', do: '5 V를 끄고 TP902가 1 V 아래로 내려가는 시간', pass: '시간 (각 단 1 µF × 5.6 kΩ, 시정수 약 6 ms라 수십 ms 예상)', rec: true },
  { id: 'h2.bench', stage: 2, kind: 'hv', do: '전원을 끈 채 J901 · J902 = 2-3 → J2-1 ↔ J903 왼쪽 단자, J2-1 ↔ TP902 저항', pass: 'J2-1 ↔ J903 = 0 Ω, J2-1 ↔ TP902 = 개방. 확인 후 다시 1-2' },

  // ---------------------------------------------------------------- 3 · main bench
  { id: 'm3.i33', stage: 3, kind: 'main', group: '블록 3 · ±5 V 레일', do: '켠 직후 +3.3 V 채널 전류', pass: '전류제한 미도달, 약 30–45 mA (대부분 LMH6629 두 개, 추정)', spec: { unit: 'A', max: 0.1 } },
  { id: 'm3.i5', stage: 3, kind: 'main', group: '블록 3 · ±5 V 레일', do: '+5 V 채널 전류, 부품 발열', pass: '수 mA, 뜨거운 부품 없음', spec: { unit: 'A', max: 0.1 } },
  { id: 'm3.v5', stage: 3, kind: 'main', group: '블록 3 · ±5 V 레일', do: '+5V (J2-1)', pass: '+5.0 ± 0.25 V', spec: V(4.75, 5.25) },
  { id: 'm3.v33', stage: 3, kind: 'main', group: '블록 3 · ±5 V 레일', do: '+3V3 (J2-3)', pass: '3.30 ± 0.15 V', spec: V(3.15, 3.45) },
  { id: 'm3.vn5', stage: 3, kind: 'main', group: '블록 3 · ±5 V 레일', do: '−5V (C304 패드)', pass: '−4.9 V보다 깊고 −5.5 V보다 얕음', spec: V(-5.5, -4.9) },
  { id: 'm3.vdd', stage: 3, kind: 'main', group: '블록 3 · ±5 V 레일', do: 'VDD − VSS = (+5V) − (−5V)', pass: '13 V 이하 (절대최대 13.5 V)', spec: V(undefined, 13) },
  { id: 'm3.rip', stage: 3, kind: 'main', group: '블록 3 · ±5 V 레일', do: '−5 V 리플 (스코프 AC 결합)', pass: 'mVpp와 주파수. 35 kHz 근처(24.5–45.5 kHz) 성분이 보이면 MAX829 정상. 나중에 ENV에 같은 성분이 보이면 원인이 여기', rec: true },
  { id: 'm3.leds', stage: 3, kind: 'main', group: '블록 3 · ±5 V 레일', do: 'JP301 · JP302 · JP303을 하나씩 꽂아 LED 확인 후 뽑기, 꽂은 상태의 레일 전압', pass: 'D301 (+5) · D302 (+3.3) · D303 (−5) 점등. 레일 변화 기록 (LED 한 개 약 1–3 mA)' },
  { id: 'm3.oe0', stage: 3, kind: 'main', group: '블록 2 · 송신 허가 게이트 (손으로)', do: '모두 기본 상태에서 TP403 (MD_OE), D201', pass: 'TP403 < 0.3 V, D201 꺼짐', spec: V(undefined, 0.3) },
  { id: 'm3.truth', stage: 3, kind: 'main', group: '블록 2 · 송신 허가 게이트 (손으로)', do: 'A = J1-1, B = J1-2를 점퍼선으로 J2-3 (+3V3)에 이어 HIGH, C = SW201. 8가지 조합마다 TP403', pass: '세 입력이 모두 HIGH일 때만 > 2.9 V, 나머지 7조합 < 0.3 V. SW201을 닫으면 D201 점등' },
  { id: 'm3.lock', stage: 3, kind: 'main', group: '블록 2 · 송신 허가 게이트 (손으로)', do: 'A · B HIGH, SW201 닫은 상태에서 SW201을 엶', pass: 'TP403이 즉시 LOW' },
  { id: 'm3.vmid', stage: 3, kind: 'main', group: '블록 6 · 수신 체인 아날로그', do: 'TP603 (VMID)', pass: '1.65 ± 0.05 V', spec: V(1.6, 1.7) },
  { id: 'm3.lna1dc', stage: 3, kind: 'main', group: '블록 6 · 수신 체인 아날로그', do: 'LNA1_OUT (R606 · C610 패드)', pass: '1.65 ± 0.15 V', spec: V(1.5, 1.8) },
  { id: 'm3.lna2dc', stage: 3, kind: 'main', group: '블록 6 · 수신 체인 아날로그', do: 'LNA2_OUT (R610 · R612 패드)', pass: '1.65 ± 0.15 V', spec: V(1.5, 1.8) },
  { id: 'm3.osc', stage: 3, kind: 'main', group: '블록 6 · 수신 체인 아날로그', do: 'TP601을 100 nF로 GND에 묶고 LNA2_OUT을 스코프로', pass: '발진 없음. 발진하면 U602 · U603 전원 핀 옆 100 nF · 1 µF 납땜 확인' },
  { id: 'm3.gain', stage: 3, kind: 'main', group: '블록 6 · 수신 체인 아날로그', do: 'AFG → TP601 (접지 TP707), 1 MHz 1 mVpp 연속파 → LNA2_OUT mVpp', pass: '약 121 mVpp (×11 × ×11 = 41.6 dB). 실측 이득 기록', rec: true },
  { id: 'm3.gainf', stage: 3, kind: 'main', group: '블록 6 · 수신 체인 아날로그', do: '같은 측정을 3.840 MHz, 8 MHz에서', pass: '주파수별 이득', rec: true },
  { id: 'm3.env', stage: 3, kind: 'main', group: '블록 6 · 수신 체인 아날로그', do: 'AFG 3사이클 버스트 5 mV → TP604 (ENV), J601 줄을 주파수에 맞춰', pass: '포락선이 오르고 내림, 리플이 피크의 10 % 이내' },
  { id: 'm3.adc', stage: 3, kind: 'main', group: '블록 6 · 수신 체인 아날로그', do: 'TP605 (ADC_IN) 최고값', pass: '포락선이 그대로 보이고 3.3 V를 넘지 않음', spec: V(undefined, 3.3) },
  { id: 'm3.window', stage: 3, kind: 'main', group: '블록 6 · 수신 체인 아날로그', do: '3.840 MHz 3사이클 버스트를 0.5 → 20 mV로 올리며 TP605 피크', pass: '검파 문턱과 포화 입력 (예상 RAW_RX 기준 약 2–3 mV ~ 7 mV)', rec: true },
  { id: 'm3.lna1in', stage: 3, kind: 'main', group: '블록 6 · 수신 체인 아날로그', do: '큰 입력에서 TP602 (LNA1_IN) 최고 · 최저 (두 값)', pass: '0.1 – 3.1 V 안', spec: V(0.1, 3.1) },

  // ---------------------------------------------------------------- 4 · main + firmware
  { id: 'm4.dfu', stage: 4, kind: 'main', group: '블록 1 · MCU와 펌웨어', do: 'BOOT0을 누른 채 USB → DFU → 펌웨어 기록 → PC13 LED', pass: '장치가 CDC 포트로 열림' },
  { id: 'm4.status', stage: 4, kind: 'main', group: '블록 1 · MCU와 펌웨어', do: '터미널에서 ?', pass: '#st=0 … fault=0 한 줄 (st=0은 DISARMED)' },
  { id: 'm4.vnd5', stage: 4, kind: 'main', group: '블록 1 · MCU와 펌웨어', do: 'VND042 5 V (J2-1)', pass: '4.75 – 5.25 V (MAX14866 VCC 범위)', spec: V(4.75, 5.25) },
  { id: 'm4.idle', stage: 4, kind: 'main', group: '블록 1 · MCU와 펌웨어', do: 'J1-1 (TX_ARM) · J1-2 (TX_WINDOW)를 리셋 직후, USB 재연결 후, S 전송 후', pass: '모두 < 0.3 V', spec: V(undefined, 0.3) },
  { id: 'm4.nopulse', stage: 4, kind: 'main', group: '블록 1 · MCU와 펌웨어', do: '스코프 TP401 (INA) · TP402 (INB), 리셋 반복', pass: 'ARM 없이는 펄스열이 전혀 없음. INB는 HIGH로 대기' },
  { id: 'm4.shot', stage: 4, kind: 'main', group: '블록 1 · MCU와 펌웨어', do: 'R (ARM) → X (단발) → ?', pass: 'seq가 1 증가하고 상태가 0으로 돌아옴' },
  { id: 'm4.lock', stage: 4, kind: 'main', group: '블록 2 · 허가 게이트 (펌웨어로)', do: 'ARM 상태에서 SW201을 엶, TP403을 스코프로', pass: 'TP403이 즉시 LOW. 지연 기록' },
  { id: 'm4.lockfw', stage: 4, kind: 'main', group: '블록 2 · 허가 게이트 (펌웨어로)', do: 'SW201을 연 채 R · X를 여러 번', pass: 'TP403이 한 번도 올라가지 않음' },
  { id: 'm4.window', stage: 4, kind: 'main', group: '블록 2 · 허가 게이트 (펌웨어로)', do: 'J1-2 (TX_WINDOW) 펄스 폭', pass: '버스트보다 길고 다음 PRF 전에 내려감', rec: true },
  { id: 'm4.outa', stage: 4, kind: 'main', group: '블록 4 · MD1213 (J3 단락 플러그)', do: 'OE = 0에서 OUTA (C413 위쪽 패드) DC', pass: '≈ +5 V', spec: V(4.5, 5.5) },
  { id: 'm4.outb', stage: 4, kind: 'main', group: '블록 4 · MD1213 (J3 단락 플러그)', do: 'OE = 0에서 OUTB (C414 위쪽 패드) DC', pass: '≈ −5 V', spec: V(-5.5, -4.5) },
  { id: 'm4.freq', stage: 4, kind: 'main', group: '블록 4 · MD1213 (J3 단락 플러그)', do: 'SW201 닫고 ARM, F 0–7을 바꾸며 X 단발 → OUTA 주기', pass: '1.000 / 3.000 / 3.840 / 4.000 / 4.800 / 5.053 / 6.857 / 8.000 MHz와 ±1 % 이내' },
  { id: 'm4.cycles', stage: 4, kind: 'main', group: '블록 4 · MD1213 (J3 단락 플러그)', do: '버스트 사이클 수를 눈으로 셈', pass: '정확히 3사이클' },
  { id: 'm4.overlap', stage: 4, kind: 'main', group: '블록 4 · MD1213 (J3 단락 플러그)', do: 'OUTA · OUTB 2채널 동시', pass: 'OUTA = −5 V와 OUTB = +5 V가 겹치는 순간이 없음. 보이면 즉시 중단하고 CH1N 극성 확인' },
  { id: 'm4.dead', stage: 4, kind: 'main', group: '블록 4 · MD1213 (J3 단락 플러그)', do: 'dead-time 구간 (OUTA = +5 V · OUTB = −5 V, 양쪽 FET OFF) 폭', pass: '구간이 있음. 폭 기록', rec: true },
  { id: 'm4.edge', stage: 4, kind: 'main', group: '블록 4 · MD1213 (J3 단락 플러그)', do: '8 MHz에서 상승시간, 버스트 중 ±5 V 리플 · 전류', pass: '상승시간 (목표 10 ns 이하), 리플 · 피크 전류. 단계 5의 기준값', rec: true },
  { id: 'm4.open', stage: 4, kind: 'main', group: '블록 5 · MAX14866', do: 'CLR 펄스 뒤 TP706 ↔ 각 EL 핀 (J1001 홀수 핀) 저항', pass: '16채널 모두 개방' },
  { id: 'm4.sweep', stage: 4, kind: 'main', group: '블록 5 · MAX14866', do: 'T 명령으로 0.4초 간격 스윕', pass: 'EL0 → EL15 순서대로 하나씩만 도통. 두 채널이 동시에 닫히면 SPI 바이트 순서 문제' },
  { id: 'm4.ron', stage: 4, kind: 'main', group: '블록 5 · MAX14866', do: '도통 저항', pass: '리드 포함 약 8–20 Ω (데이터시트 RON 7–13 Ω)', spec: { unit: 'Ω', min: 8, max: 20 } },
  { id: 'm4.spi', stage: 4, kind: 'main', group: '블록 5 · MAX14866', do: '스코프 J1-7 (SCK) · J1-9 (LE) · J1-10 (CLR)', pass: '16클럭 MSB 우선, LE LOW ≥ 5 ns, CLR HIGH ≥ 115 ns' },
  { id: 'm4.cbus', stage: 4, kind: 'main', group: '블록 5 · MAX14866', do: '(LCR 있으면) TP706 ↔ GND 용량', pass: '약 200 pF 예상 (OFF 15개 × 11 pF + ON 33 pF)', rec: true },
  { id: 'm4.storm', stage: 4, kind: 'main', group: '블록 5 · MAX14866', do: 'E를 연속 전송하며 상태 확인', pass: 'TX · ACQUIRE 중에는 채널이 안 바뀌고 skip 카운터만 증가' },
  { id: 'm4.code', stage: 4, kind: 'main', group: '블록 6 · ADC까지 (J3 단락 플러그 유지)', do: 'AFG 5 mV 버스트를 TP601에, SW201 닫고 R + X → 뷰어 A 모드의 ADC 코드', pass: '약 300–800, 4095에 붙지 않음', spec: { unit: '', min: 300, max: 800 } },
  { id: 'm4.sat', stage: 4, kind: 'main', group: '블록 6 · ADC까지 (J3 단락 플러그 유지)', do: '입력을 10배로', pass: '뷰어 제목에 SAT 표시 (saturation bit0)' },

  // ---------------------------------------------------------------- 5 · system bench HV
  { id: 'x5.r1', stage: 5, kind: 'system', group: '전압 래더', do: '7-1 ±5 V · 더미 100 pF · 1 MHz', pass: '블록 7 측정 전부 합격 후 다음 칸', rec: true },
  { id: 'x5.r2', stage: 5, kind: 'system', group: '전압 래더', do: '7-2 ±10 V · 100 pF · 1 MHz', pass: '같음 + 오버슈트 기록', rec: true },
  { id: 'x5.r3', stage: 5, kind: 'system', group: '전압 래더', do: '7-3 ±10 V · 470 pF → 1 nF · 1 MHz', pass: '같음 + 발열 기록', rec: true },
  { id: 'x5.r4', stage: 5, kind: 'system', group: '전압 래더', do: '7-4 ±12 → ±24 V · 1 nF · 1 MHz', pass: '같음. 여기서 멈추고 블록 8로', rec: true },
  { id: 'x5.r5', stage: 5, kind: 'system', group: '전압 래더', do: '7-5 직전 통과 후 1 nF · 3.84 → 8 MHz', pass: '전압과 주파수를 동시에 올리지 않음', rec: true },
  { id: 'x5.vgs', stage: 5, kind: 'system', group: '블록 7 · 펄서 TC6320와 BUS', do: 'VGS,P (TP701 − TP702) · VGS,N (TP703 − TP704) 동시 관측, 차동 프로브', pass: '두 FET가 동시에 ON인 구간이 없음. 있으면 즉시 전원 차단 — dead-time과 게이트 R(R403 · R404) 재검토' },
  { id: 'x5.bus', stage: 5, kind: 'system', group: '블록 7 · 펄서 TC6320와 BUS', do: 'BUS 진폭 (TP706)', pass: '레일의 약 0.85–0.95배 예상 (33 Ω / 330 Ω 분압과 RDS(on))', rec: true },
  { id: 'x5.ipk', stage: 5, kind: 'system', group: '블록 7 · 펄서 TC6320와 BUS', do: '+HV 피크 전류 (J3 케이블 +HV 선에 전류 프로브)', pass: '부하 · 주파수별 피크. 벤치 전류제한에 걸리면 부하를 낮춤', rec: true },
  { id: 'x5.settle', stage: 5, kind: 'system', group: '블록 7 · 펄서 TC6320와 BUS', do: '버스트 뒤 BUS가 ±1 V 안으로 돌아오는 시간', pass: 'MUX SPI 대기 · 블랭킹의 하한. 4.5 µs보다 길면 펌웨어 대기값을 늘림', rec: true },
  { id: 'x5.sag', stage: 5, kind: 'system', group: '블록 7 · 펄서 TC6320와 BUS', do: '버스트 중 TP702 · TP704 새그 (TP707 기준)', pass: 'C702 · C704 전압이 무너지지 않음' },
  { id: 'x5.heat', stage: 5, kind: 'system', group: '블록 7 · 펄서 TC6320와 BUS', do: '10발 연속 후 U701 온도', pass: '만졌을 때 미지근. 뜨거우면 shoot-through — 중단' },
  { id: 'x5.clamp', stage: 5, kind: 'system', group: '블록 8 · T/R 결합과 블랭킹 (±10 V 이하에서 시작)', do: 'J1001 EL0 (1번)–GND (2번)에 더미 1 nF + 1 kΩ. TP601 (RAW_RX) 최대 진폭', pass: 'BAV99 (D601)가 ±0.7–1.1 V로 클램프. 더 크면 D601 방향 · 납땜', spec: { unit: 'V', max: 1.1, abs: true } },
  { id: 'x5.lna1in', stage: 5, kind: 'system', group: '블록 8 · T/R 결합과 블랭킹 (±10 V 이하에서 시작)', do: 'TP602 (LNA1_IN) 최고 · 최저 (두 값), TP603 변동은 메모에', pass: '0.1 – 3.1 V 안', spec: V(0.1, 3.1) },
  { id: 'x5.blank', stage: 5, kind: 'system', group: '블록 8 · T/R 결합과 블랭킹 (±10 V 이하에서 시작)', do: 'LNA2_OUT이 1.65 V로 돌아오는 시간을 주파수 8개 모두', pass: '각 값 + 여유를 펌웨어 blank_us[]에', rec: true },
  { id: 'x5.dead', stage: 5, kind: 'system', group: '블록 8 · T/R 결합과 블랭킹 (±10 V 이하에서 시작)', do: 'AFG로 버스트 뒤 지연된 작은 RF를 TP601에 넣으며 지연을 줄임', pass: '검출 가능한 최소 지연 = 실제 불감대 (1 MHz에서 약 18 µs 예상)', rec: true },
  { id: 'x5.load', stage: 5, kind: 'system', group: '블록 8 · T/R 결합과 블랭킹 (±10 V 이하에서 시작)', do: 'R702 330 Ω를 뺀 때와 넣은 때 에코 진폭', pass: '감도 손실 dB. BUS 용량(메인 4단계)과 함께 최종 부하 값의 근거', rec: true },
  { id: 'x5.le', stage: 5, kind: 'system', group: '블록 8 · T/R 결합과 블랭킹 (±10 V 이하에서 시작)', do: '2채널: TP706 (BUS)와 J1-9 (LE)', pass: 'BUS가 조용해진 뒤에만 LE 펄스 (≥ 4.5 µs). 겹치면 상태기계 수정' },
  { id: 'x5.xtalk', stage: 5, kind: 'system', group: '블록 8 · T/R 결합과 블랭킹 (±10 V 이하에서 시작)', do: 'EL0 발사 중 EL1 (J1001 3번) 진폭', pass: '−30 dB 이하 목표 (데이터시트 크로스토크 −62 dB @5 MHz)', rec: true },

  // ---------------------------------------------------------------- 6 · system stack
  { id: 'x6.start', stage: 6, kind: 'system', do: '기동할 때 TP702 · TP704 파형', pass: '오버슈트와 상승시간. +5 V(J2-1)가 먼저 무너지지 않는지', rec: true },
  { id: 'x6.v5', stage: 6, kind: 'system', do: 'HV 보드가 붙은 상태에서 VND042 5 V (J2-1)', pass: '4.75 – 5.25 V 유지. 떨어지면 HV J1에 별도 5 V 벤치 전원을 쓰고 J4 케이블을 뺌', spec: V(4.75, 5.25) },
  { id: 'x6.hvp', stage: 6, kind: 'system', do: 'TP702 (+HV), TP707 기준', pass: 'HV 보드 단독(단계 2) 값과 비슷, +47 … +53 V', spec: V(47, 53) },
  { id: 'x6.hvn', stage: 6, kind: 'system', do: 'TP704 (−HV), TP707 기준', pass: '−53 … −47 V', spec: V(-53, -47) },
  { id: 'x6.sym', stage: 6, kind: 'system', do: '|TP702|와 |TP704|의 차이', pass: '10 % 이내', spec: { unit: '%', max: 10 } },
  { id: 'x6.redo', stage: 6, kind: 'system', do: '단계 5의 블록 7 · 8 측정을 전부 다시', pass: '항목별 값이 ±24 V 결과에서 예상한 범위 안' },
  { id: 'x6.g3', stage: 6, kind: 'system', do: 'G3: 소자 허용 펄스 전압과 Cp', pass: '소자 허용 전압이 실측 BUS 진폭보다 큼. ±24 V · ±48 V 전후로 각 소자 Cp @1 kHz 비교' },
  { id: 'x6.dis', stage: 6, kind: 'system', do: '전원을 끄고 TP702 · TP704가 1 V 아래가 되는 시간', pass: '메인 C702 · C704 (10 µF)가 HV 보드 5.6 kΩ × 2 경로로 빠지므로 수백 ms 수준. 이 시간 전에는 J3 케이블을 뽑지 않음', rec: true },
  { id: 'x6.ffc', stage: 6, kind: 'system', do: 'FFC 50 V 판정 (HV 보드 단계 2의 값)', pass: '단계 7 전에 결정 완료' },

  // ---------------------------------------------------------------- 7 · array
  { id: 'x7.map', stage: 7, kind: 'system', do: '채널 맵: element n을 발사하며 해당 소자를 손가락으로 두드림', pass: '화면에서 잡음이 뜨는 element와 두드린 소자가 일치' },
  { id: 'x7.echo', stage: 7, kind: 'system', do: '수조 단일 소자, 반사판 5–10 cm', pass: 'A 모드에 에코 피크' },
  { id: 'x7.cal', stage: 7, kind: 'system', do: '거리 2점 이상으로 system_delay_ns 보정 후 오차', pass: '두 거리에서 계산값과 실측 오차 < 2 mm', spec: { unit: 'mm', max: 2 } },
  { id: 'x7.bmode', stage: 7, kind: 'system', do: '8채널 B 모드: 평평한 반사판, 기울인 반사판', pass: '수평 띠 / 기울어진 띠. drop · CRC 카운터 0' },
  { id: 'x7.prf', stage: 7, kind: 'system', do: 'PRF 10 → 100 → 500 Hz', pass: 'drop이 시작되는 PRF = 전송 상한', rec: true },
  { id: 'x7.mmode', stage: 7, kind: 'system', do: 'M 모드에서 표적을 움직임', pass: '궤적이 보이고 누락 라인이 시간축을 압축하지 않음' },
  { id: 'x7.safe', stage: 7, kind: 'system', do: 'USB 분리 · 재연결, 명령 폭주, 리셋', pass: '어떤 경우에도 ARM이 스스로 올라가지 않음' },
  { id: 'x7.phantom', stage: 7, kind: 'system', do: '팬텀: 두 와이어 시간차로 음속 → 뷰어에 입력, 와이어 깊이 오차', pass: '설계 깊이와 ±1 mm 이내 (21번 레시피 문헌 음속 1578 m/s, 1540이 아님)', spec: { unit: 'mm', max: 1 } },
];

// Stages a board of this kind goes through, each with its steps and their
// shown numbers.
export function stagesFor(kind) {
  return STAGES.filter((s) => s.kinds.includes(kind)).map((s) => {
    const steps = STEPS.filter((st) => st.stage === s.n && st.kind === kind)
      .map((st, i) => ({ ...st, no: `${s.n}-${i + 1}` }));
    return { ...s, steps };
  });
}

export const stepById = new Map(STEPS.map((s) => [s.id, s]));
