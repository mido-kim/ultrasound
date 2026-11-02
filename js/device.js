// The USB link to the VND042: Web Serial (Chrome or Edge on a computer), or
// on localhost with ?dev a pretend board (sim-device.js) so the console can be
// tried without one. Bytes from the board go through StreamParser; the events
// (lines, status lines) go to onEvent. Writes are queued so two buttons
// pressed quickly never fight over the port.

import { StreamParser } from './usc4.js';

export const USB_ID = { usbVendorId: 0x0483, usbProductId: 0x5740 }; // usbd_desc.c
export const hasSerial = () => 'serial' in navigator;
export const isDev = () => location.hostname === 'localhost' && new URLSearchParams(location.search).has('dev');

// Opens the board. A port this site was allowed before opens without asking
// again; otherwise the browser shows its list. Resolves null when the person
// closes the list without picking one.
export async function openLink(onEvent, onClose) {
  let port;
  if (isDev()) {
    const { simPort } = await import('./sim-device.js');
    port = simPort();
  } else {
    const known = (await navigator.serial.getPorts()).filter((p) => {
      const info = p.getInfo();
      return info.usbVendorId === USB_ID.usbVendorId && info.usbProductId === USB_ID.usbProductId;
    });
    try {
      port = known.length === 1 ? known[0] : await navigator.serial.requestPort({ filters: [USB_ID] });
    } catch (err) {
      if (err.name === 'NotFoundError') return null;
      throw err;
    }
  }
  await port.open({ baudRate: 115200, bufferSize: 1 << 16 }); // CDC ignores the baud rate
  return new Link(port, onEvent, onClose);
}

class Link {
  constructor(port, onEvent, onClose) {
    this.port = port;
    this.parser = new StreamParser();
    this.onEvent = onEvent;
    this.onClose = onClose;
    this.reader = null;
    this.queue = Promise.resolve();
    this.closing = false;
    this.sim = Boolean(port.sim);
    this.bytesIn = 0;
    this.done = this.readLoop();
    this.onUnplug = (e) => e.target === port && this.close(false);
    if (!this.sim) navigator.serial.addEventListener('disconnect', this.onUnplug);
  }

  async readLoop() {
    let why = '';
    try {
      while (this.port.readable && !this.closing) {
        this.reader = this.port.readable.getReader();
        try {
          for (;;) {
            const { value, done } = await this.reader.read();
            if (done) break;
            this.bytesIn += value.length;
            for (const ev of this.parser.feed(value)) this.onEvent(ev);
          }
        } finally {
          this.reader.releaseLock();
          this.reader = null;
        }
      }
    } catch (err) {
      why = err.message || String(err);
    }
    if (!this.closing) this.close(false, why);
  }

  // bytes: Uint8Array. Resolves when written (or right away once closed).
  write(bytes) {
    this.queue = this.queue.then(async () => {
      if (this.closing || !this.port.writable) return;
      const w = this.port.writable.getWriter();
      try {
        await w.write(bytes);
      } finally {
        w.releaseLock();
      }
    }).catch(() => {});
    return this.queue;
  }

  // byUser: the 끊기 button (or leaving), as opposed to the board going away.
  async close(byUser = true, why = '') {
    if (this.closing) return;
    this.closing = true;
    if (!this.sim) navigator.serial.removeEventListener('disconnect', this.onUnplug);
    try {
      await this.reader?.cancel();
    } catch { /* already gone */ }
    await this.done.catch(() => {});
    await this.queue;
    try {
      await this.port.close();
    } catch { /* unplugged */ }
    this.onClose?.(byUser, why);
  }
}
