// Per-device settings, kept in localStorage. theme-boot.js reads the same key.
import { readJSON, writeJSON } from './util.js';

export const SETTINGS_KEY = 'usbringup.settings.v1';

export const DEFAULTS = {
  name: '', // shown next to every result this person records
  theme: 'system', // 'system' | 'light' | 'dark'
  mode: '', // '' = sign in and share, 'local' = this device only
};

export function loadSettings() {
  return { ...DEFAULTS, ...readJSON(SETTINGS_KEY, {}) };
}

export function saveSettings(s) {
  writeJSON(SETTINGS_KEY, s);
}
