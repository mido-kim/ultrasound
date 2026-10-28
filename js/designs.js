// Array design versions, shown on 어레이 제작 → 설계 파일. The files are copies
// kept in designs/array/<version>/; the originals stay in the project folder
// (US_array_v1.zip and array_v1.* at its root, array_v2_fpc/ for v2-x).
// Newest first. Sizes are in bytes.
// v3-x came after the move to Drive: only their pictures are here, to be moved
// into records the same way; `contents` lists their Drive folder
// (../drive_upload/Wearable Ultrasound/어레이 설계/v3-x/).

const D = 'designs/array';
const GENERATOR = { href: `${D}/array_v2_generator.zip`, label: 'v2 생성 스크립트 (Python, KiCad 9)', size: 13444 };

const v3Images = (v, layout) => [
  { src: `${D}/v${v}/v${v}_stack.png`, caption: '겹친 모습 · FPC 1 쪽에서, 리본 위' },
  { src: `${D}/v${v}/v${v}_fpc1_array_end.svg`, caption: 'FPC 1 어레이 쪽 · Gerber 렌더' },
  { src: `${D}/v${v}/v${v}_fpc2.svg`, caption: 'FPC 2 · Gerber 렌더' },
  { src: `${D}/v${v}/v${v}_layout.png`, caption: layout },
];
const v3Contents = (v, readmes) => [
  `array_v${v}_FPC1_signal_JLC.zip — FPC 1 신호 · JLC 주문용 Gerber`,
  `array_v${v}_FPC2_ground_JLC.zip — FPC 2 접지 · JLC 주문용 Gerber`,
  `array_v${v}_KiCad.zip — KiCad 9 보드 (FPC 1 · 2)`,
  ...readmes,
  'array_v3_generator.zip — v3 생성 스크립트 (Python, KiCad 9)',
].join('\n');
const V3_README = 'README_v3-1_v3-2.md — 주문 설정 · 소자 배치 · 조립 메모 (3-1 · 3-2)';

export const ARRAY_DESIGNS = [
  {
    id: 'v3-3',
    title: '버전 3-3',
    date: '2026-10-28',
    points: [
      '3-1과 같고, ACF 접합 줄만 소자에서 30 mm (3-1은 11 mm)',
      'FPC 2 길이 54 mm (3-1은 35 mm), FPC 1 335 mm',
    ],
    images: v3Images('3-3', '꼬리 · 전체 길이 · 두 FPC 구리면'),
    files: [],
    contents: v3Contents('3-3', ['README_v3-3.md — 3-1과 다른 점 · 크기', V3_README]),
  },
  {
    id: 'v3-2',
    title: '버전 3-2',
    date: '2026-10-28',
    points: [
      '3-1과 같은 배치, 소자 패드 1.2 mm (섬 1.84 mm)',
      'ACF 아래 다리를 물결로 (±0.6 mm) · 외곽을 선 따라 자름',
      'ACF 접합 줄이 소자에서 18.7 mm',
    ],
    images: v3Images('3-2', '꼬리 · 전체 길이 · 두 FPC 구리면'),
    files: [],
    contents: v3Contents('3-2', [V3_README]),
  },
  {
    id: 'v3-1',
    title: '버전 3-1',
    date: '2026-10-28',
    points: [
      '4 × 4 소자, 4 mm 피치 · 열 단위 번호 (첫 열 EL0–EL3)',
      '2~4번째 줄은 옆 틈으로 연결 · 틈마다 0.15 mm 선 3개',
      '직선 배선, 사각 외곽 · 정렬 구멍 4개 · ACF 접합 줄이 소자에서 11 mm',
    ],
    images: v3Images('3-1', '꼬리 · 전체 길이 · 두 FPC 구리면'),
    files: [],
    contents: v3Contents('3-1', [V3_README]),
  },
  {
    id: 'v2-3',
    title: '버전 2-3',
    date: '2026-10-25',
    points: [
      '2-2에서 소자 패드를 1.2 mm로 줄임 (섬 1.84 mm)',
      '두 번째 줄 선도 물결 (±0.35 mm)',
      'ACF 접합 줄이 소자에서 13 mm (2-2는 8 mm)',
    ],
    images: [
      { src: `${D}/v2-3/v2-3_stack.png`, caption: '겹친 모습 · FPC 1 쪽에서, 리본 위' },
      { src: `${D}/v2-3/v2-3_fpc1_array_end.svg`, caption: 'FPC 1 어레이 쪽 · Gerber 렌더' },
      { src: `${D}/v2-3/v2-3_fpc2.svg`, caption: 'FPC 2 · Gerber 렌더' },
      { src: `${D}/v2-3/v2-3_layout.png`, caption: '두 FPC 구리면' },
    ],
    files: [
      { href: `${D}/v2-3/array_v2-3_FPC1_signal_JLC.zip`, label: 'FPC 1 신호 · JLC 주문용 Gerber', size: 64685 },
      { href: `${D}/v2-3/array_v2-3_FPC2_ground_JLC.zip`, label: 'FPC 2 접지 · JLC 주문용 Gerber', size: 60892 },
      { href: `${D}/v2-3/array_v2-3_KiCad.zip`, label: 'KiCad 9 보드 (FPC 1 · 2)', size: 454488 },
      { href: `${D}/v2-3/README_v2-3.md`, label: '주문 설정 · 2-2와 다른 점', size: 1581 },
      GENERATOR,
    ],
  },
  {
    id: 'v2-2',
    title: '버전 2-2',
    date: '2026-10-25',
    points: [
      '2-1과 같은 배치, 다리를 물결로 (±0.5 mm)',
      '외곽을 선 따라 자름 · 소자마다 섬 2.44 mm',
      'ACF 접합 줄이 소자에서 8 mm',
    ],
    images: [
      { src: `${D}/v2-2/v2-2_stack.png`, caption: '겹친 모습 · FPC 1 쪽에서, 리본 위' },
      { src: `${D}/v2-2/v2-2_fpc1_array_end.svg`, caption: 'FPC 1 어레이 쪽 · Gerber 렌더' },
      { src: `${D}/v2-2/v2-2_fpc2.svg`, caption: 'FPC 2 · Gerber 렌더' },
      { src: `${D}/v2-2/v2-2_layout.png`, caption: '꼬리 · 전체 길이 · 두 FPC 구리면' },
    ],
    files: [
      { href: `${D}/v2-2/array_v2-2_FPC1_signal_JLC.zip`, label: 'FPC 1 신호 · JLC 주문용 Gerber', size: 31630 },
      { href: `${D}/v2-2/array_v2-2_FPC2_ground_JLC.zip`, label: 'FPC 2 접지 · JLC 주문용 Gerber', size: 27758 },
      { href: `${D}/v2-2/array_v2-2_KiCad.zip`, label: 'KiCad 9 보드 (FPC 1 · 2)', size: 235186 },
      { href: `${D}/v2-2/README_v2-1_v2-2.md`, label: '주문 설정 · 조립 메모 (2-1 · 2-2)', size: 4103 },
      GENERATOR,
    ],
  },
  {
    id: 'v2-1',
    title: '버전 2-1',
    date: '2026-10-25',
    points: [
      '8 × 2 소자, 4 mm 피치 · 열 쌍 번호 (첫 열 EL0 / EL1)',
      'FPC 1 신호 (꼬리 + 254 mm 리본) · FPC 2 접지, ACF로 접지 전달',
      '직선 배선, 넉넉한 사각 외곽 · 정렬 구멍 4개',
    ],
    images: [
      { src: `${D}/v2-1/v2-1_stack.png`, caption: '겹친 모습 · FPC 1 쪽에서, 리본 위' },
      { src: `${D}/v2-1/v2-1_fpc1_array_end.svg`, caption: 'FPC 1 어레이 쪽 · Gerber 렌더' },
      { src: `${D}/v2-1/v2-1_fpc2.svg`, caption: 'FPC 2 · Gerber 렌더' },
      { src: `${D}/v2-1/v2-1_layout.png`, caption: '꼬리 · 전체 길이 · 두 FPC 구리면' },
    ],
    files: [
      { href: `${D}/v2-1/array_v2-1_FPC1_signal_JLC.zip`, label: 'FPC 1 신호 · JLC 주문용 Gerber', size: 10587 },
      { href: `${D}/v2-1/array_v2-1_FPC2_ground_JLC.zip`, label: 'FPC 2 접지 · JLC 주문용 Gerber', size: 6773 },
      { href: `${D}/v2-1/array_v2-1_KiCad.zip`, label: 'KiCad 9 보드 (FPC 1 · 2)', size: 18091 },
      { href: `${D}/v2-1/README_v2-1_v2-2.md`, label: '주문 설정 · 조립 메모 (2-1 · 2-2)', size: 4103 },
      GENERATOR,
    ],
  },
  {
    id: 'v1',
    title: '버전 1',
    date: '2026-09-14',
    points: [
      '8소자 일자형, 4 mm 피치',
      'AutoCAD 도면 → EasyEDA에서 Gerber',
    ],
    images: [
      { src: `${D}/v1/v1_fpc.svg`, caption: 'Gerber 렌더 (US_array_v1.zip)' },
    ],
    files: [
      { href: `${D}/v1/US_array_v1.zip`, label: 'JLC 주문용 Gerber (EasyEDA)', size: 20813 },
      { href: `${D}/v1/array_v1.dwg`, label: 'AutoCAD 도면', size: 44811 },
      { href: `${D}/v1/array_v1_traces.dxf`, label: 'DXF · 배선', size: 252995 },
      { href: `${D}/v1/array_v1_coverlay_openings.dxf`, label: 'DXF · 커버레이 구멍', size: 253018 },
      { href: `${D}/v1/array_v1_outline.dxf`, label: 'DXF · 외곽', size: 252997 },
    ],
  },
];
