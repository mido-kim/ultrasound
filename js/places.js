// 자료 지도: where everything for the project lives. The list itself is kept in
// Firestore (places) and edited in the app; this is the order of the groups
// and the starting list put in by "기본 목록 넣기".

export const PLACE_GROUPS = ['파일 보관', '기록 · 계획', '코드 · 설계', '서비스'];

export const SEED_PLACES = [
  { group: '파일 보관', label: 'Google Drive · Wearable Ultrasound', where: '', note: '미팅 슬라이드, 설계 파일, 측정 데이터 원본. 폴더 링크를 붙여 주세요.' },
  { group: '파일 보관', label: 'PC 프로젝트 폴더 (작업본)', where: 'C:\\Users\\midok\\Projects\\wearable-ultrasound', note: 'KiCad 보드, 어레이 생성 스크립트, 가이드 HTML (미도 PC)' },
  { group: '파일 보관', label: 'iCloud 보관 폴더', where: 'C:\\Users\\midok\\iCloudDrive\\BLISS\\@ 웨어러블초음파', note: '논문, 측정 데이터 (2608xx data), 예전 버전 (미도 PC)' },
  { group: '기록 · 계획', label: 'Notion 허브', where: 'https://app.notion.com/p/3f8182816c89816c9691d7b58ef193c3', note: '마일스톤, 작업 보드, 측정 기록, 미팅' },
  { group: '기록 · 계획', label: '이 앱', where: 'https://mido-kim.github.io/ultrasound/', note: '보드 검증, 어레이 · 팬텀 체크리스트, 미팅 자료, 자료 지도' },
  { group: '코드 · 설계', label: '메인 v5.4 · HV v5.1 보드 (KiCad)', where: 'C:\\Users\\midok\\Projects\\wearable-ultrasound\\pcb_v5', note: 'JLC 주문 파일은 각 보드의 jlcpcb_assembly 폴더' },
  { group: '코드 · 설계', label: '어레이 v2 FPC (생성 스크립트 · Gerber)', where: 'C:\\Users\\midok\\Projects\\wearable-ultrasound\\array_v2_fpc', note: 'make_array_v2.py, make_array_v2_3.py' },
  { group: '코드 · 설계', label: '앱 코드 (GitHub)', where: 'https://github.com/mido-kim/ultrasound', note: '' },
  { group: '서비스', label: 'Firebase 콘솔', where: 'https://console.firebase.google.com/project/ultrasound-ebd93', note: '계정, Firestore 규칙, 데이터' },
];
