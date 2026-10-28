// Pictures at the top of the home screen, kept in config/home:
//   { id: 'home', images: [{ file, caption, link, wide }], image, caption, link }
// `wide` pictures take the whole row; the others sit two to a row (one on a
// phone). image / caption / link repeat the first picture, which is what 0.5–0.6
// read, so an older copy of the app still shows that one. No DOM here.

export function homeImages(home) {
  if (!home) return [];
  if (Array.isArray(home.images)) return home.images.filter((x) => x && x.file);
  return home.image ? [{ file: home.image, caption: home.caption || '', link: home.link || '', wide: true }] : [];
}

export function homeRecord(images, by) {
  const first = images[0];
  return {
    id: 'home', images, image: first?.file || '', caption: first?.caption || '', link: first?.link || '',
    updatedAt: new Date().toISOString(), updatedBy: by,
  };
}

export const withImage = (images, im) => (images.some((x) => x.file === im.file) ? images : [...images, im]);

export function moved(list, i, step) {
  const j = i + step;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

// A picture's link: a page of this app (#/…) or an https:// address.
export const homeLink = (u) => (/^#\/[\w\-/%.]*$/.test(u || '') || /^https:\/\//.test(u || '') ? u : '');
