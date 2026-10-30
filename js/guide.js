// The board reference: rules, board maps, connector / jumper / test point
// tables, power order, symptoms and open questions. Taken from
// us_control_v5.4_pcb_bringup_guide.html, with the wording shortened for the app.

export const GUIDE_HTML = `
<section id="g-rules"><div class="note danger">
    <span class="tag">꼭 지킬 것</span>
    <ol>
      <li><b>전압은 앞 단계가 통과했을 때만 올려요.</b> 1 MHz · 1채널이 된다고 8 MHz · 16채널이 되는 건 아니에요.</li>
      <li><b>접지된 스코프 프로브를 TP702 · TP704 (MOSFET 소스)에 물리지 마세요.</b> 스코프 접지와 MCU 접지가 이어져 있어서 −HV가 단락돼요. V<sub>GS</sub>는 차동 프로브로만.</li>
      <li><b>메인 보드에는 ±HV 방전 저항이 없어요.</b> C702 · C704는 HV 보드를 통해서만 방전돼요. 끈 뒤 TP702 · TP704가 1 V 아래인지 보고 나서 J3 케이블을 뽑거나 보드를 만져요.</li>
    </ol>
  </div>
</section>
<section id="g-map">
  <div class="stage-head">
    <span class="stage-num">보드 지도</span>
    <h2>테스트 포인트 · 커넥터 · 점퍼 위치</h2>
  </div>
  <p>축척을 맞춘 윗면 그림. 주황 점 = 테스트 포인트, 초록 = 저전압 커넥터 · 점퍼, 빨강 = 고전압 커넥터, 빨간 <b>1</b> = 1번 핀.</p>
  <div class="map">
    <figure>
      <svg viewBox="0 0 700 500" role="img" aria-label="메인 보드 v5.4 윗면 지도">
        <rect class="brd" x="20" y="20" width="660" height="459" rx="4"/>
        <circle class="hole" cx="47.6" cy="41.6" r="9.6"/><circle class="hole" cx="652.4" cy="41.6" r="9.6"/>
        <circle class="hole" cx="47.6" cy="457.4" r="9.6"/><circle class="hole" cx="652.4" cy="457.4" r="9.6"/>
        <text class="s" x="28" y="474">메인 v5.4 · 110 × 76.5 mm · 윗면</text>
        <!-- connectors top -->
        <rect class="conn" x="358" y="55" width="198" height="14" rx="2"/><text class="c" x="457" y="49" text-anchor="middle">J1 · VND042 링크 (13핀)</text><text class="p1" x="550" y="66">1</text>
        <rect class="conn" x="279" y="55" width="60" height="14" rx="2"/><text class="c" x="309" y="49" text-anchor="middle">J2 · 전원</text><text class="p1" x="333" y="66">1</text>
        <rect class="conn" x="631" y="94" width="14" height="23" rx="2"/><text class="c" x="625" y="104" text-anchor="end">SW201 인터록</text><text class="p1" x="648" y="104">1</text>
        <circle class="led" cx="615.8" cy="170" r="9"/><line x1="609" y1="162" x2="609" y2="178" stroke="currentColor" class="led"/><text x="615.8" y="193" text-anchor="middle">D201</text>
        <rect class="ic" x="569" y="116" width="18" height="12"/><text class="s" x="578" y="140" text-anchor="middle">U201</text>
        <circle class="tp" cx="519.2" cy="105.8" r="4"/><text class="t" x="526" y="101">TP401 INA</text>
        <circle class="tp" cx="492.8" cy="105.8" r="4"/><text class="t" x="486" y="101" text-anchor="end">TP402 INB</text>
        <circle class="tp" cx="554" cy="155" r="4"/><text class="t" x="561" y="152">TP403 OE</text>
        <rect class="ic" x="494" y="161" width="24" height="24"/><text class="s" x="506" y="198" text-anchor="middle">U401 MD1213</text>
        <rect class="ic" x="489" y="233" width="10" height="19"/><rect class="ic" x="513" y="233" width="10" height="19"/>
        <text class="s" x="506" y="226" text-anchor="middle">C414 · C413</text><text class="s" x="506" y="264" text-anchor="middle">위 패드 = OUTB · OUTA</text>
        <rect class="ic" x="431" y="248" width="18" height="12"/><text class="s" x="440" y="272" text-anchor="middle">U301 MAX829</text>
        <rect class="conn" x="631" y="208" width="14" height="29" rx="2"/><text class="c" x="625" y="219" text-anchor="end">J4 +5V → HV J1</text><text class="p1" x="648" y="219">1</text>
        <rect class="hvconn" x="625" y="300" width="14" height="45" rx="2"/><text class="h" x="619" y="313" text-anchor="end">J3 ← HV J2</text><text class="s" x="619" y="326" text-anchor="end">위 −HV · 가운데 GND</text><text class="s" x="619" y="338" text-anchor="end">아래 +HV (1번)</text><text class="p1" x="642" y="342">1</text>
        <circle class="cap" cx="582.8" cy="293" r="18.9"/><text class="s" x="582.8" y="266" text-anchor="middle">C704 −HV</text>
        <circle class="cap" cx="582.8" cy="344" r="18.9"/><text class="s" x="582.8" y="377" text-anchor="middle">C702 +HV</text>
        <rect class="ic" x="491" y="302" width="30" height="24"/><text class="s" x="506" y="318" text-anchor="middle">U701</text><text class="s" x="506" y="296" text-anchor="middle">TC6320</text>
        <circle class="tp" cx="479" cy="284" r="4"/><text class="t" x="472" y="281" text-anchor="end">TP701 GATE_P</text>
        <circle class="tp" cx="531.2" cy="293" r="4"/><text class="t" x="531" y="285" text-anchor="end">TP703</text>
        <circle class="tp" cx="551.6" cy="290.6" r="4"/><text class="t" x="545" y="306" text-anchor="middle">TP704 −HV</text>
        <circle class="tp" cx="552.8" cy="350" r="4"/><text class="t" x="545" y="398" text-anchor="middle">TP702 +HV</text>
        <line x1="552.8" y1="354" x2="548" y2="388" stroke="currentColor" class="cap"/>
        <circle class="tp" cx="530" cy="359" r="4"/><text class="t" x="530" y="378" text-anchor="middle">TP705</text>
        <rect class="ic" x="475" y="350" width="38" height="19"/><text class="s" x="494" y="345" text-anchor="middle">R701 33 Ω</text>
        <circle class="tp" cx="455" cy="359" r="4"/><text class="t" x="455" y="378" text-anchor="middle">TP706 BUS</text>
        <circle class="tp" cx="455" cy="335" r="4"/><text class="t" x="455" y="327" text-anchor="middle">TP707 GND</text>
        <rect class="ic" x="311.6" y="336.8" width="42" height="42"/><text class="s" x="332.6" y="330" text-anchor="middle">U501 MAX14866</text>
        <rect class="ic" x="234.5" y="303.5" width="27" height="15"/><text class="s" x="248" y="331" text-anchor="middle">U801 MD0100</text>
        <circle class="tp" cx="245.6" cy="285.8" r="4"/><text class="t" x="253" y="282">TP601 RAW_RX</text>
        <rect class="ic" x="215" y="281" width="12" height="12"/><text class="s" x="221" y="305" text-anchor="middle">D601</text>
        <rect class="ic" x="149.6" y="282.8" width="12" height="12"/><text class="s" x="155.6" y="307" text-anchor="middle">D602</text>
        <circle class="tp" cx="161.6" cy="266" r="4"/><text class="t" x="168" y="262">TP602 LNA1_IN</text>
        <rect class="ic" x="212" y="209" width="18" height="12"/><text class="s" x="221" y="233" text-anchor="middle">U601 VMID 버퍼</text>
        <circle class="tp" cx="206" cy="164" r="4"/><text class="t" x="213" y="161">TP603 VMID</text>
        <rect class="ic" x="186.8" y="89" width="18" height="12"/><text class="s" x="195.8" y="113" text-anchor="middle">U604 ADC 버퍼</text>
        <circle class="tp" cx="263" cy="104" r="4"/><text class="t" x="270" y="101">TP605 ADC</text>
        <rect class="ic" x="44.6" y="272" width="18" height="12"/><text class="s" x="53.6" y="296" text-anchor="middle">U602 LNA1</text>
        <rect class="ic" x="44.6" y="153.2" width="18" height="12"/><text class="s" x="53.6" y="177" text-anchor="middle">U603 LNA2</text>
        <circle class="tp" cx="128" cy="135.2" r="4"/><text class="t" x="128" y="127" text-anchor="middle">TP604 ENV</text>
        <rect class="conn" x="128" y="145" width="29" height="45" rx="2"/><text class="c" x="163" y="158">J601 ENV 대역</text><text class="s" x="163" y="170">윗줄 1 nF · 가운데 220 pF</text><text class="s" x="163" y="181">아랫줄 100 pF</text><text class="p1" x="120" y="156">1</text>
        <rect class="ic" x="121" y="88" width="17" height="9"/><text class="s" x="129" y="83" text-anchor="middle">D603</text>
        <rect class="hvconn" x="282" y="428" width="106" height="16" rx="2"/><text class="h" x="335" y="459" text-anchor="middle">J1001 어레이 FFC 32P</text><text class="s" x="335" y="470" text-anchor="middle">홀수 = EL0–EL15 · 짝수 = GND</text><text class="p1" x="275" y="441">1</text>
        <rect class="hvconn" x="420" y="428" width="31" height="24" rx="2"/><text class="h" x="435" y="421" text-anchor="middle">R702 단자</text><text class="s" x="435" y="466" text-anchor="middle">왼 BUS · 오 GND</text>
        <circle class="led" cx="511.8" cy="428" r="9"/><circle class="led" cx="547.8" cy="428" r="9"/><circle class="led" cx="583.8" cy="428" r="9"/>
        <text x="511.8" y="452" text-anchor="middle">D301</text><text x="547.8" y="452" text-anchor="middle">D302</text><text x="583.8" y="452" text-anchor="middle">D303</text>
        <text class="s" x="511.8" y="464" text-anchor="middle">+5</text><text class="s" x="547.8" y="464" text-anchor="middle">+3.3</text><text class="s" x="583.8" y="464" text-anchor="middle">−5</text>
        <rect class="conn" x="608" y="383" width="12" height="24" rx="2"/><rect class="conn" x="629.6" y="383" width="12" height="24" rx="2"/><rect class="conn" x="651.2" y="383" width="12" height="24" rx="2"/>
        <text class="c" x="636" y="376" text-anchor="middle">JP301–303</text>
      </svg>
    </figure>
    <figcaption>메인 v5.4. J1 · J2는 오른쪽 끝이 1번. J3 · J4는 HV 보드 J2 · J1과 같은 자리라 두 보드를 겹치면 맞아요.</figcaption>

    <figure>
      <svg viewBox="0 0 700 500" role="img" aria-label="HV 보드 v5.1 윗면 지도">
        <rect class="brd" x="20" y="20" width="660" height="459" rx="4"/>
        <circle class="hole" cx="47.6" cy="41.6" r="9.6"/><circle class="hole" cx="652.4" cy="41.6" r="9.6"/>
        <circle class="hole" cx="47.6" cy="457.4" r="9.6"/><circle class="hole" cx="652.4" cy="457.4" r="9.6"/>
        <text class="s" x="28" y="474">HV v5.1 · 110 × 76.5 mm · 윗면</text>
        <rect class="ic" x="170.1" y="76.4" width="69.6" height="36"/><text x="205" y="94" text-anchor="middle">U902 · B</text><text class="s" x="205" y="106" text-anchor="middle">+24 → +48</text><text class="p1" x="173" y="124">1</text>
        <rect class="ic" x="170.1" y="160.4" width="69.6" height="36"/><text x="205" y="178" text-anchor="middle">U901 · A</text><text class="s" x="205" y="190" text-anchor="middle">GND → +24</text><text class="p1" x="173" y="208">1</text>
        <rect class="ic" x="170.1" y="244.4" width="69.6" height="36"/><text x="205" y="262" text-anchor="middle">U903 · C</text><text class="s" x="205" y="274" text-anchor="middle">−24 → GND</text><text class="p1" x="173" y="292">1</text>
        <rect class="ic" x="170.1" y="328.4" width="69.6" height="36"/><text x="205" y="346" text-anchor="middle">U904 · D</text><text class="s" x="205" y="358" text-anchor="middle">−48 → −24</text><text class="p1" x="173" y="376">1</text>
        <circle class="cap" cx="278" cy="93.8" r="15"/><text class="s" x="278" y="72" text-anchor="middle">C910</text>
        <circle class="cap" cx="278" cy="177.8" r="15"/><text class="s" x="278" y="156" text-anchor="middle">C909</text>
        <circle class="cap" cx="278" cy="261.8" r="15"/><text class="s" x="278" y="240" text-anchor="middle">C911</text>
        <circle class="cap" cx="278" cy="345.8" r="15"/><text class="s" x="278" y="324" text-anchor="middle">C912</text>
        <circle class="tp" cx="347" cy="93.8" r="4"/><text class="t" x="355" y="97">TP902 +48</text>
        <circle class="tp" cx="347" cy="177.8" r="4"/><text class="t" x="355" y="181">TP901 +24</text>
        <circle class="tp" cx="347" cy="261.8" r="4"/><text class="t" x="355" y="265">TP903 −24</text>
        <circle class="tp" cx="347" cy="345.8" r="4"/><text class="t" x="355" y="349">TP904 −48</text>
        <rect class="hvconn" x="415" y="118" width="14" height="45" rx="2"/><text class="h" x="422" y="110" text-anchor="middle">J901 +HV 선택</text>
        <text class="s" x="434" y="128">1 STACK</text><text class="s" x="434" y="143">2 OUT</text><text class="s" x="434" y="158">3 BENCH</text>
        <rect class="hvconn" x="415" y="346" width="14" height="45" rx="2"/><text class="h" x="422" y="338" text-anchor="middle">J902 −HV 선택</text>
        <text class="s" x="434" y="356">1 STACK</text><text class="s" x="434" y="371">2 OUT</text><text class="s" x="434" y="386">3 BENCH</text>
        <circle class="led" cx="520.8" cy="137" r="9"/><line x1="514" y1="129" x2="514" y2="145" class="led"/><text x="520.8" y="160" text-anchor="middle">D901</text>
        <rect class="conn" x="553" y="124" width="14" height="29" rx="2"/><text class="c" x="575" y="140">JP901</text>
        <circle class="led" cx="520.8" cy="281" r="9"/><line x1="514" y1="273" x2="514" y2="289" class="led"/><text x="520.8" y="304" text-anchor="middle">D902</text>
        <rect class="conn" x="553" y="268" width="14" height="29" rx="2"/><text class="c" x="575" y="284">JP902</text>
        <circle class="tp" cx="590" cy="389" r="4"/><text class="t" x="597" y="392">TP905 GND</text>
        <rect class="conn" x="631" y="208" width="14" height="29" rx="2"/><text class="c" x="625" y="219" text-anchor="end">J1 +5V ← 메인 J4</text><text class="p1" x="648" y="219">1</text>
        <rect class="hvconn" x="625" y="300" width="14" height="45" rx="2"/><text class="h" x="619" y="313" text-anchor="end">J2 → 메인 J3</text><text class="s" x="619" y="326" text-anchor="end">위 −HV · 가운데 GND</text><text class="s" x="619" y="338" text-anchor="end">아래 +HV (1번)</text><text class="p1" x="642" y="342">1</text>
        <rect class="hvconn" x="340" y="424" width="81" height="26" rx="2"/><text class="h" x="380" y="417" text-anchor="middle">J903 벤치 입력</text><text class="s" x="380" y="465" text-anchor="middle">왼 +HV · 가운데 GND · 오 −HV</text>
      </svg>
    </figure>
    <figcaption>HV v5.1. 모듈은 위에서부터 B · A · C · D 순서로 쌓여요. 1번 핀은 왼쪽 끝 사각 패드. J901 · J902는 항상 같은 위치로.</figcaption>
  </div>

  <div class="two">
    <div class="stack">
      <h3>메인 보드 커넥터</h3>
      <div class="tw"><table>
        <tr><th>핀</th><th>J1 (VND042 링크)</th><th>STM32</th></tr>
        <tr><td class="mono">1</td><td>TX_ARM → U201 A</td><td class="mono">PB15</td></tr>
        <tr><td class="mono">2</td><td>TX_WINDOW → U201 B</td><td class="mono">PB0</td></tr>
        <tr><td class="mono">4</td><td>INA_DRV (TP401)</td><td class="mono">PA8</td></tr>
        <tr><td class="mono">5</td><td>INB_DRV (TP402)</td><td class="mono">PB13</td></tr>
        <tr><td class="mono">7 · 8</td><td>SPI_SCK · SPI_MOSI</td><td class="mono">PA5 · PA7</td></tr>
        <tr><td class="mono">9 · 10</td><td>MUX_LE · MUX_CLR</td><td class="mono">PA4 · PB12</td></tr>
        <tr><td class="mono">12</td><td>ADC_IN (TP605)</td><td class="mono">PA0</td></tr>
        <tr><td class="mono">3 6 11 13</td><td>GND</td><td></td></tr>
      </table></div>
      <div class="tw"><table>
        <tr><th>커넥터</th><th>핀 순서</th></tr>
        <tr><td class="mono">J2 전원</td><td>1 +5V · 2 GND · 3 +3V3 · 4 GND</td></tr>
        <tr><td class="mono">J3 HV 입력</td><td>1 +HV · 2 GND · 3 −HV</td></tr>
        <tr><td class="mono">J4 +5V 출력</td><td>1 +5V · 2 GND</td></tr>
        <tr><td class="mono">R702 단자</td><td>1 BUS · 2 GND — 330 Ω 20 W (PWR220T) 연결</td></tr>
        <tr><td class="mono">J1001</td><td>홀수 핀 1 · 3 · … · 31 = EL0 … EL15, 짝수 핀 = GND</td></tr>
      </table></div>
    </div>
    <div class="stack">
      <h3>점퍼 기본 상태</h3>
      <div class="tw"><table>
        <tr><th>점퍼</th><th>역할</th><th>기본</th></tr>
        <tr><td class="mono">SW201</td><td>인터록 = PGOOD. 닫으면 +3V3 → PGOOD, TX 허가 가능</td><td><span class="chip off">열림</span></td></tr>
        <tr><td class="mono">JP301–303</td><td>레일 LED D301–D303 (+5 · +3.3 · −5). 디버깅 때만</td><td><span class="chip off">열림</span></td></tr>
        <tr><td class="mono">J601</td><td>ENV 대역 C: 1 nF (1 MHz) · 220 pF (3.8–5 MHz) · 100 pF (6.9–8 MHz), 1 kΩ와 시정수 1 / 0.22 / 0.1 µs</td><td><span class="chip on">한 줄만</span></td></tr>
        <tr><td class="mono">J901 · J902</td><td>±HV 출처. 1-2 = STACK, 2-3 = BENCH(J903). 둘을 항상 같게</td><td><span class="chip hv">단계마다 지정</span></td></tr>
        <tr><td class="mono">JP901 · JP902</td><td>HV-present LED D901 · D902</td><td><span class="chip on">장착</span></td></tr>
      </table></div>
      <h3>테스트 포인트</h3>
      <div class="tw"><table>
        <tr><th>TP</th><th>노드</th><th>TP</th><th>노드</th></tr>
        <tr><td class="mono">401 · 402</td><td>INA · INB</td><td class="mono">701 · 702</td><td>GATE_P · +HV</td></tr>
        <tr><td class="mono">403</td><td>MD_OE (AND 출력)</td><td class="mono">703 · 704</td><td>GATE_N · −HV</td></tr>
        <tr><td class="mono">601</td><td>RAW_RX</td><td class="mono">705</td><td>PULSER_OUT</td></tr>
        <tr><td class="mono">602</td><td>LNA1_IN</td><td class="mono">706</td><td>BUS</td></tr>
        <tr><td class="mono">603</td><td>VMID 1.65 V</td><td class="mono">707</td><td>GND</td></tr>
        <tr><td class="mono">604 · 605</td><td>ENV · ADC_IN</td><td class="mono">901–905</td><td>+24 · +48 · −24 · −48 · GND (HV)</td></tr>
      </table></div>
    </div>
  </div>
</section>


<section id="g-power">
  <div class="stage-head">
    <span class="stage-num">순서</span>
    <h2>전원 켜고 끄는 순서 · 방전</h2>
  </div>
  <div class="two">
    <div class="stack">
      <h3>켤 때</h3>
      <ol>
        <li>VND042 USB 연결 → 레일 안정 (+5 · +3.3 · −5 V)</li>
        <li>TP403 (OE)가 LOW인지 확인, SW201 열림</li>
        <li>HV 공급: 벤치는 0 V에서 천천히 올림 / 스택은 HV 보드 5 V</li>
        <li>게이트 결합 C (C413 · C414)가 충전될 때까지 잠시 대기</li>
        <li>SW201 닫기 → <code>R</code> (ARM)</li>
      </ol>
    </div>
    <div class="stack">
      <h3>끌 때</h3>
      <ol>
        <li><code>S</code> (STOP) → SW201 열기 → TP403 LOW 확인</li>
        <li>HV 차단: 벤치 출력 OFF / HV 보드 5 V 분리</li>
        <li><b>TP702 · TP704가 1 V 아래가 될 때까지 대기</b> (J3 케이블은 꽂아 둔 채)</li>
        <li>VND042 USB 분리</li>
      </ol>
    </div>
  </div>
  <div class="note warn">
    <span class="tag">자동 차단 없음</span>
    <p>지금 PGOOD는 손으로 꽂는 SW201 점퍼예요. 전압이 무너져도 저절로 꺼지지 않아요. ±48 V로 계속 켜 두는 건 아직 안 돼요.</p>
  </div>
</section>


<section id="g-trouble">
  <div class="stage-head">
    <span class="stage-num">문제 생기면</span>
    <h2>증상별로 볼 곳</h2>
  </div>
  <div class="tw"><table>
    <tr><th>증상</th><th>먼저 볼 곳</th></tr>
    <tr><td>HV 보드 5 V 입력이 전류제한에 걸림</td><td>모듈 1번 핀 방향, C909–C912 극성, 출력 단락</td></tr>
    <tr><td>스택 한 단만 0 V</td><td>해당 모듈 2번 핀(+Vin) 납땜, 5.6 kΩ 납땜, 같은 줄 C901–C908</td></tr>
    <tr><td>TP902는 정상인데 J2-1이 0 V</td><td>J901 점퍼 위치 (1-2여야 STACK)</td></tr>
    <tr><td>−5 V가 −4.7 V보다 얕음</td><td>MAX829 flying C (C303) 납땜, JP303 LED 부하, U401 열패드(EP)가 −5 V에 납땜됐는지</td></tr>
    <tr><td>SW201을 열어도 TP403이 HIGH</td><td>U201 방향 · 납땜, R203 (PGOOD 풀다운), R205</td></tr>
    <tr><td>LNA 출력 DC가 1.65 V가 아님</td><td>TP603 (VMID), R605 · R609 바이어스, U602 · U603 발진</td></tr>
    <tr><td>MUX 두 채널이 동시에 도통</td><td>펌웨어 SPI 바이트 순서, J1-9 (LE) 타이밍</td></tr>
    <tr><td>MUX 한 채널만 안 열림</td><td>U501 해당 NO 핀 납땜, J1001 해당 홀수 핀</td></tr>
    <tr><td>BUS 진폭이 레일보다 훨씬 작음</td><td>R701 납땜, R702 부하 값, C413 · C414 결합 C, 게이트 R (R403 · R404)</td></tr>
    <tr><td>ENV에 35 kHz 리플</td><td>MAX829 펌프 성분 — −5 V 바이패스</td></tr>
  </table></div>
</section>


<section id="g-open">
  <div class="stage-head">
    <span class="stage-num">남은 문제</span>
    <h2>아직 안 정한 것</h2>
  </div>
  <ul>
    <li><b>자동 차단</b> PGOOD · HV 자동 차단 회로 없음. 지금은 SW201 수동 점퍼</li>
    <li><b>차동 프로브</b> 고전압 경로 전에 준비</li>
    <li><b>소자 허용 전압</b> PZT 허용 펄스 전압 (STEMINC 미공개, 문의 필요)과 Cp 변화</li>
    <li><b>FFC 50 V</b> HV 스택이 ±50 V를 넘을 수 있음</li>
    <li><b>펌웨어</b> 빌드는 됨, 보드에선 아직 안 돌려봄 (펌웨어 올리기에서 스코프로 확인)</li>
    <li><b>VND042 5 V</b> HV 보드를 붙여도 4.75–5.25 V인지</li>
  </ul>
</section>

`;
