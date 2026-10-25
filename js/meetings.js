// Meeting slides, shown on 미팅 자료 (newest first), and the picture on the home
// screen. Files are copies kept in meetings/<date>/; the originals stay in the
// project's "meeting slides" folder. The pptx is stored under a plain ASCII
// name and downloads under its original name. Sizes are in bytes.

const M = 'meetings';

export const MEETINGS = [
  {
    id: '2026-09-11',
    date: '2026-09-11',
    title: '진행 사항',
    sub: '9/3~ · 김미도, 최정인 · 15장',
    thumb: `${M}/2026-09-11/overview.png`,
    google: 'https://docs.google.com/presentation/d/1qMH61aXveKQvTqYJOArfaVrI385QruXmxSNs56uLrDQ/edit?usp=sharing',
    pptx: { href: `${M}/2026-09-11/ultrasound_260911_meeting.pptx`, name: '초음파 260911 미팅 (260903~).pptx', size: 33442888 },
  },
];

export const HOME_FIGURE = {
  src: `${M}/2026-09-11/overview.png`,
  caption: '진행 사항 · 2026-09-11 미팅',
  meeting: '2026-09-11',
};
