import type { Settings } from '../domain/settings';

// ---- Utilidades de color (contraste legible garantizado) ----
type RGB = [number, number, number];

const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n)));

function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [17, 17, 17];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (c: RGB) => '#' + c.map((v) => clamp(v).toString(16).padStart(2, '0')).join('');

// t = 0 devuelve a, t = 1 devuelve b
const mix = (a: string, b: string, t: number) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
};

const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: string, b: string) => {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

// Texto negro o blanco, el que se lea mejor sobre ese fondo
const readableOn = (bg: string) => (contrast(bg, '#FFFFFF') >= contrast(bg, '#111111') ? '#FFFFFF' : '#111111');

// Ajusta un color (acercándolo a blanco u oscuro) hasta que contraste lo suficiente con el fondo
function ensureContrast(color: string, bg: string, min: number, dark: boolean) {
  if (contrast(color, bg) >= min) return color;
  if (dark && luminance(color) < 0.05) return '#F4F4F5'; // negro en modo oscuro -> blanco
  const target = dark ? '#FFFFFF' : '#000000';
  let c = color;
  for (let t = 0.05; t <= 1; t += 0.05) {
    c = mix(color, target, t);
    if (contrast(c, bg) >= min) return c;
  }
  return c;
}

// ---- Tema ----
export function computeTheme(s: Pick<Settings, 'primaryColor' | 'secondaryColor' | 'themeMode'>, systemDark: boolean) {
  const dark = s.themeMode === 'oscuro' || (s.themeMode === 'auto' && systemDark);
  const bg = dark ? '#0E0E10' : '#FFFFFF';
  const primary = ensureContrast(s.primaryColor, bg, 3, dark);
  const secondary = s.secondaryColor;
  const secondarySoft = mix(secondary, bg, 0.86);
  const pos = dark ? '#4CC38A' : '#1E8E5A';
  const neg = dark ? '#F0706F' : '#C73E3E';

  const vars: Record<string, string> = {
    '--bg': bg,
    '--card': dark ? '#1A1A1D' : '#F4F4F5',
    '--ink': dark ? '#F4F4F5' : '#18181B',
    '--muted': dark ? '#A1A1AA' : '#71717A',
    '--line': dark ? '#2E2E33' : '#E4E4E7',
    '--primary': primary,
    '--on-primary': readableOn(primary),
    '--primary-soft': mix(primary, bg, 0.88),
    '--secondary': secondary,
    '--on-secondary': readableOn(secondary),
    '--secondary-soft': secondarySoft,
    '--secondary-ink': ensureContrast(secondary, secondarySoft, 4.5, dark),
    '--pos': pos,
    '--pos-soft': mix(pos, bg, 0.88),
    '--neg': neg,
    '--neg-soft': mix(neg, bg, 0.88),
    '--shadow': dark ? '0 4px 14px rgba(0, 0, 0, 0.45)' : '0 4px 14px rgba(0, 0, 0, 0.06)',
  };
  return { dark, vars };
}

export function applyTheme(s: Pick<Settings, 'primaryColor' | 'secondaryColor' | 'themeMode'>) {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const { dark, vars } = computeTheme(s, systemDark);
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.colorScheme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', vars['--bg']);
}
