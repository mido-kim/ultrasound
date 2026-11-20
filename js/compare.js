// 회로 비교 (#/compare): three ultrasound control circuits side by side.
//   USoP: Lin et al., Nat. Biotechnol. 42, 448–457 (2024), main text and
//     Supplementary Information (Supp. Fig. 9, Supp. Table 2, Extended Data Fig. 2).
//   WULPUS Pro Max: github.com/Sergio5714/wulpus-pro-max (docs, hw, errata)
//     and the WULPUS PRO paper, arXiv 2607.12137v2.
//   Ours: main v5.4 + HV v5.1 schematics, firmware v3, this app.
// Checked 2026-11-20. (계산) = worked out here, (그림) = read off a paper figure,
// 출처에 없음 = not found in that system's sources.
// Template strings: write a backslash twice, and never put ${ in the text.

export const COMPARE_DATE = '2026-11-20';

export const COMPARE_NAV = [
  ['c-glance', '한눈에'], ['c-tx', '송신'], ['c-rx', '수신'], ['c-sys', '데이터 · 전원 · 기판'],
  ['c-probe', '프로브'], ['c-result', '결과'], ['c-diff', '차이 해설'], ['c-src', '자료'],
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
    ['검파 앞 필터', '앰프가 대역을 자름', '능동 저역 필터', '없음'],
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

export const COMPARE_HTML = `
<div class="note info">
  <span class="tag">읽는 법</span>
  <p>${COMPARE_DATE} 기준이에요. (계산)은 여기서 계산한 값, (그림)은 논문 그림에서 잰 값이에요. 나머지는 출처에 적힌 그대로예요.</p>
</div>

<section id="c-glance" class="stack">
  <h2>한눈에</h2>
  ${table(COMPARE_TABLES.glance)}
</section>

<section id="c-tx" class="stack">
  <h2>송신</h2>
  ${table(COMPARE_TABLES.tx)}
</section>

<section id="c-rx" class="stack">
  <h2>수신</h2>
  ${table(COMPARE_TABLES.rx)}
</section>

<section id="c-sys" class="stack">
  <h2>데이터 · 전원 · 기판</h2>
  ${table(COMPARE_TABLES.sys)}
</section>

<section id="c-probe" class="stack">
  <h2>프로브</h2>
  ${table(COMPARE_TABLES.probe)}
</section>

<section id="c-result" class="stack">
  <h2>결과</h2>
  ${table(COMPARE_TABLES.result)}
</section>

<section id="c-diff" class="stack">
  <h2>차이 해설</h2>
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
  </div>
</section>

<section id="c-src" class="stack">
  <h2>자료</h2>
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
  </div>
</section>`;
