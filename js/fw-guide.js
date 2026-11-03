// Stage 4 (펌웨어 올리기) explained on its own page: the wiring, the laptop,
// the console, what the commands and the status line mean, SW201, the timing
// of one line and what to look for on the scope. Gathered from
// firmware/us_control_v5_fw (README, main.c) and the bring-up guide so that
// nothing has to be looked up elsewhere. Each part folds open; stageSection()
// remembers which are open. Template strings: write a backslash twice.

import { LAPTOP_HTML } from './guide.js';

const WIRING = `
  <p>VND042 핀은 보드에 인쇄된 이름 (실크)으로 찾아요. 전선은 짧게.</p>
  <div class="tw"><table>
    <tr><th>VND042</th><th>신호</th><th>메인 보드</th></tr>
    <tr><td>B15</td><td>TX_ARM (송신 허가)</td><td>J1-1</td></tr>
    <tr><td>B0</td><td>TX_WINDOW (송신 창)</td><td>J1-2</td></tr>
    <tr><td>A8</td><td>INA (드라이버 입력)</td><td>J1-4</td></tr>
    <tr><td>B13</td><td>INB (드라이버 입력)</td><td>J1-5</td></tr>
    <tr><td>A5</td><td>SPI SCK (MUX)</td><td>J1-7</td></tr>
    <tr><td>A7</td><td>SPI MOSI (MUX)</td><td>J1-8</td></tr>
    <tr><td>A4</td><td>MUX LE</td><td>J1-9</td></tr>
    <tr><td>B12</td><td>MUX CLR</td><td>J1-10</td></tr>
    <tr><td>A0</td><td>ADC 입력</td><td>J1-12</td></tr>
    <tr><td>GND</td><td>GND</td><td>J1-3 · 6 · 11 · 13, J2-2 · 4</td></tr>
    <tr><td>5V</td><td>+5 V</td><td>J2-1</td></tr>
    <tr><td>3V3</td><td>+3.3 V</td><td>J2-3</td></tr>
  </table></div>
  <ul>
    <li>J2 벤치 전원은 빼요. 이제 VND042가 USB로 받은 5 V · 3.3 V로 보드를 켜요.</li>
    <li>J3에 단락 플러그 (1 · 2 · 3번을 한 선으로 묶은 3핀): ±HV = GND. HV 보드는 연결 안 해요.</li>
    <li>SW201은 열어 둬요 (D201 꺼짐). "SW201 닫기"가 있는 줄에서만 닫아요.</li>
    <li>멀티미터 · 스코프 GND는 TP707.</li>
    <li>(선택) B14 → LED + 470 Ω → GND: 받은 줄의 최고 코드가 600을 넘으면 켜져요.</li>
  </ul>`;

const CONSOLE = `
  <ol>
    <li>노트북 Chrome이나 Edge로 이 앱 → <a href="#/console">펌웨어 콘솔</a> → <b>연결</b> → 목록에서 USB 직렬 장치 고르기. 다음부터는 바로 붙어요.</li>
    <li>연결하면 먼저 정지 (S)를 보내고, 상태를 1초마다 읽어요.</li>
    <li>버튼이 곧 명령이에요. 단발 = X, 연속 = R (실수 방지로 두 번 눌러야 시작), 정지 = S, MUX 스윕 = T, 상태 다시 = ?.</li>
    <li>버튼 (단발 · 연속 · MUX 스윕)은 무엇을 할지, 모드 (A · M · B)는 어느 소자를 쏘고 어떻게 볼지예요. A + 단발 = 한 줄 확인, B + 연속 = 실시간 단면 영상. 4단계는 A만 써요.</li>
    <li>주파수 · 소자 · PRF · 모드는 고르면 바로 보내요. 보드는 <b>다음 송신 때</b> 적용해요. 정지 상태에서 바꾸면 상태 칸은 단발 한 번 뒤에 바뀌어요.</li>
    <li>정지는 어느 화면에서든 Esc 키로도 돼요. 다른 화면으로 가도 연결은 그대로라, 체크리스트에 값을 적고 돌아와도 돼요.</li>
    <li>받은 줄: 가로는 µs (버스트부터) 또는 mm (물 기준 깊이), 세로는 ADC 코드 0–4095. 빨간 점선 = SAT (4090). 앞쪽 회색 = 최고값 계산에서 빼는 앞 40개 (송신 잡음).</li>
    <li>CSV 저장: 지금 줄을 엑셀로 열 수 있는 파일로.</li>
    <li>터미널이나 뷰어가 포트를 열고 있으면 콘솔이 연결 못 해요. 먼저 닫아요.</li>
  </ol>`;

const COMMANDS = `
  <p>콘솔 버튼은 아래 글자를 보내요. 터미널에서는 <code>?</code> 말고는 답이 없는 게 정상이에요 (친 글자도 안 보여요). 바뀐 건 <code>?</code>로 확인해요. 받은 줄은 1012바이트 묶음이라 터미널에서는 깨진 글자로 보여요.</p>
  <div class="tw"><table>
    <tr><th>명령</th><th>하는 일</th><th>답</th></tr>
    <tr><td><code>?</code></td><td>상태 한 줄</td><td>있음</td></tr>
    <tr><td><code>S</code></td><td>정지. ARM · WINDOW를 바로 내려요. 고장 상태도 풀어요 (fault 값은 남아요)</td><td>없음</td></tr>
    <tr><td><code>X</code></td><td>단발. 한 번 쏘고 정지로. 연속 중이면 다음 줄 뒤에 정지</td><td>받은 줄 1개</td></tr>
    <tr><td><code>R</code></td><td>연속. PRF마다 쏴요. 정지 상태에서만</td><td>받은 줄 계속</td></tr>
    <tr><td><code>T</code></td><td>MUX 스윕. 쏘지 않고 EL0 → EL15를 0.4초씩 이어요 (도통 확인용). 끝나면 모두 열림. 정지 상태에서만. 그 6.4초 동안은 다른 답이 늦어요</td><td>없음</td></tr>
    <tr><td><code>F</code> n</td><td>주파수 번호 0–7. 96 MHz ÷ 정수로 만들어서 이 8개뿐이에요 (3.80은 안 됨). 3사이클 버스트는 폭이 약 1.5 MHz라 3.8 MHz 소자는 3.840으로 충분해요</td><td>없음</td></tr>
    <tr><td><code>E</code> n</td><td>소자 0–15 (터미널에서는 0–9, a–f)</td><td>없음</td></tr>
    <tr><td><code>P</code></td><td>PRF 1–2000 Hz. 숫자가 바이트 2개라 콘솔에서만</td><td>없음</td></tr>
    <tr><td><code>A</code> <code>M</code> <code>B</code></td><td>모드. A = 고른 소자 한 줄 · M = 같은 소자를 시간 순으로 (움직임) · B = 줄마다 다음 소자, 16줄 단면 영상 (한 장에 PRF 32번)</td><td>없음</td></tr>
  </table></div>
  <div class="tw"><table>
    <tr><th>상태 값</th><th>뜻</th></tr>
    <tr><td><code>st</code></td><td>0 정지 · 1 대기 (ARM) · 2 채널 선택 · 3 송신 · 4 수신 · 5 고장</td></tr>
    <tr><td><code>f</code></td><td>주파수 번호. 0 = 1.000, 1 = 3.000, 2 = 3.840, 3 = 4.000, 4 = 4.800, 5 = 5.053, 6 = 6.857, 7 = 8.000 MHz</td></tr>
    <tr><td><code>prf</code></td><td>1초에 쏘는 횟수 (Hz)</td></tr>
    <tr><td><code>el</code> · <code>mode</code></td><td>소자 · 모드</td></tr>
    <tr><td><code>cfg</code></td><td>설정이 적용될 때마다 1씩 늘어요</td></tr>
    <tr><td><code>seq</code></td><td>지금까지 쏜 줄 수</td></tr>
    <tr><td><code>skip</code></td><td>건너뛴 송신. 앞 줄이 안 끝났거나 PC가 못 따라올 때</td></tr>
    <tr><td><code>txerr</code></td><td>USB 보내기 실패</td></tr>
    <tr><td><code>fault</code></td><td>고장, 16진수. 02 ADC 시작 실패 · 04 ADC 오류 · 10 버스트가 안 나감. 0이 정상</td></tr>
    <tr><td><code>hse</code></td><td>켤 때 찾은 크리스털 (MHz). 0이면 크리스털 없이 내부 RC로 돌아서 USB가 불안할 수 있어요</td></tr>
    <tr><td><code>late</code></td><td>송신 준비가 늦어 그 순간을 건너뛴 횟수</td></tr>
  </table></div>`;

const SW201 = `
  <p>SW201은 송신 허가 회로의 세 번째 열쇠예요. 손으로 꽂는 점퍼 (스위치)로 PGOOD 선을 3.3 V에 잇거나 끊어요.</p>
  <pre class="cmd">TP403 (MD1213 OE) = ARM (J1-1) AND WINDOW (J1-2) AND PGOOD (SW201)</pre>
  <ul>
    <li><b>닫힘</b> (D201 초록 켜짐): PGOOD = 3.3 V. 펌웨어의 ARM · WINDOW가 송신을 정해요.</li>
    <li><b>열림</b> (D201 꺼짐): R203이 PGOOD를 0 V로 내려요. 펌웨어가 뭘 하든 OE = 0이라 MD1213이 두 FET를 꺼 둬요. 펄스가 안 나가요.</li>
    <li>열려 있어도 TP401 · TP402 (MD1213 입력)에는 펄스가 보여요. 막히는 건 출력 OUTA · OUTB예요. 받은 줄 (ADC)도 그대로 와요.</li>
    <li>고전압을 끊거나 방전하는 스위치는 아니에요. ±HV는 그대로 있고, 펄스만 막아요.</li>
    <li>지금은 임시예요. 나중에 HV 레일을 감시하는 PGOOD 회로가 이 자리를 대신해요.</li>
  </ul>`;

const TIMING = `
  <p>PRF 한 주기 (10 Hz면 100 ms)마다 이렇게 돌아요. 시간은 그 주기 시작부터.</p>
  <div class="tw"><table>
    <tr><th>시간</th><th>일</th></tr>
    <tr><td>0 µs 바로 뒤</td><td>ADC · 타이머 준비 (십수 µs), 그다음 WINDOW (J1-2) HIGH</td></tr>
    <tr><td>50 µs</td><td>버스트 시작. 3사이클 (1 MHz면 3 µs, 8 MHz면 0.375 µs)</td></tr>
    <tr><td>버스트 끝</td><td>INA LOW · INB HIGH (쉼)로 돌아가고 WINDOW LOW</td></tr>
    <tr><td>50 µs + 블랭킹</td><td>ADC 시작. 블랭킹은 주파수 순서대로 6 · 5 · 4 · 4 · 3 · 3 · 3 · 3 µs (시작값)</td></tr>
    <tr><td>+ 300 µs</td><td>480개 (1.6 Msps)를 다 받으면 그 줄 (1012바이트)을 USB로</td></tr>
  </table></div>`;

const SCOPE = `
  <ul>
    <li><b>두 FET가 같이 켜지는 순간</b> (OUTA −5 V 이면서 OUTB +5 V): 보이면 바로 Esc. 펌웨어의 INB 극성 문제예요.</li>
    <li><b>dead time</b>: 펌웨어 값은 전환마다 약 52 ns. 6.857 · 8 MHz는 반주기가 73 · 62.5 ns라 실제로 미는 시간이 21 · 10 ns뿐이에요. 높은 주파수에서는 줄여야 할 수 있어요 (펌웨어 수정).</li>
    <li><b>버스트 끝</b>: 마지막 사이클 바로 뒤 INA (TP401)에 짧은 튐이 있는지.</li>
    <li><b>블랭킹</b>: 6 · 5 · 4 · 4 · 3 · 3 · 3 · 3 µs는 시작값이에요. 고전압 단계에서 잰 회복 시간으로 바꿔요.</li>
  </ul>
  <p class="small muted">테스트 포인트 위치는 <a href="#/guide">보드 지도 · 표</a>에 있어요.</p>`;

export const STAGE_DETAIL = {
  4: [
    { key: 'sd4-wire', title: '① 배선 · 준비', html: WIRING },
    { key: 'sd4-laptop', title: '② 노트북 준비 · 펌웨어 올리기', html: LAPTOP_HTML },
    { key: 'sd4-console', title: '③ 펌웨어 콘솔 쓰는 법', html: CONSOLE },
    { key: 'sd4-cmds', title: '④ 명령 · 상태 줄 읽는 법', html: COMMANDS },
    { key: 'sd4-sw201', title: '⑤ SW201 = 송신 허가 스위치', html: SW201 },
    { key: 'sd4-time', title: '⑥ 한 줄의 타이밍', html: TIMING },
    { key: 'sd4-scope', title: '⑦ 스코프로 꼭 볼 것', html: SCOPE },
  ],
};
