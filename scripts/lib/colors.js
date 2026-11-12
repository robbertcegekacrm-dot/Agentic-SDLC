// Color helpers for option tints: mix a brand color with white and check the
// contrast with black text (WCAG relative luminance).
const hex = (h) => h.replace('#', '').match(/../g).map((x) => parseInt(x, 16));
const toHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

const luminance = (h) => {
  const [r, g, b] = hex(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

// share = part of the brand color that stays (0.25 = brand mixed with white at 25%).
const mix = (h, share) => toHex(hex(h).map((v) => v * share + 255 * (1 - share)));

// Tint rule: start at `share` of the brand color and lighten in steps of 5% until
// black text has at least `minContrast` against it.
function tint(h, share = 0.25, minContrast = 11) {
  let s = share;
  let t = mix(h, s);
  while (contrast(t, '#000000') < minContrast && s > 0) { s = Math.max(0, +(s - 0.05).toFixed(2)); t = mix(h, s); }
  return { hex: t, share: s, contrast: +contrast(t, '#000000').toFixed(2) };
}

module.exports = { hex, toHex, luminance, contrast, mix, tint };
