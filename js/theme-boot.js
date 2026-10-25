// Picks light or dark before the page first paints, so a dark theme doesn't
// flash light while the app loads. main.js takes over once the app runs.
(function () {
  var s = {};
  try {
    s = JSON.parse(localStorage.getItem('usbringup.settings.v1')) || {};
  } catch (e) {
    // No settings yet: System.
  }
  var t = s.theme === 'light' || s.theme === 'dark'
    ? s.theme
    : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
})();
