'use strict';
/* =========================================================
   Identité visuelle : nom, mascotte, icônes, thèmes de couleur
   ========================================================= */
const THEMES = {
  emeraude: { label: 'Émeraude & corail', primary: '#0e9384', primary2: '#2dd4bf', accent: '#ff7a59', soft: '#e3f6f2', bg1: '#eefaf7', bg2: '#fff4ee' },
  ocean: { label: 'Marine & ambre', primary: '#1d4e89', primary2: '#4f8fd6', accent: '#f2a93b', soft: '#e6eef8', bg1: '#eef3fa', bg2: '#fff7ea' },
  framboise: { label: 'Framboise & nuit', primary: '#c2255c', primary2: '#f06595', accent: '#3b3f8f', soft: '#fbe7ef', bg1: '#fcf0f4', bg2: '#eff0fb' },
  sauge: { label: 'Sauge & terracotta', primary: '#4d7c5b', primary2: '#8fbf9a', accent: '#d9734e', soft: '#e9f2eb', bg1: '#f2f7f2', bg2: '#fbf1ea' },
};
const appName = () => (typeof db !== 'undefined' && db.settings.appName) || 'Hestia';

function applyTheme() {
  const t = THEMES[db.settings.theme] || THEMES.emeraude;
  const r = document.documentElement.style;
  r.setProperty('--primary', t.primary); r.setProperty('--primary-2', t.primary2); r.setProperty('--accent', t.accent);
  r.setProperty('--primary-soft-l', t.soft); r.setProperty('--bg1-l', t.bg1); r.setProperty('--bg2-l', t.bg2);
  document.title = appName();
  document.querySelectorAll('[data-app-name]').forEach(el => el.textContent = appName());
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = t.primary;
}

/* Mascotte : une petite maison souriante avec sa cheminée */
function mascot(size = 64, mood = 'happy') {
  const eyes = mood === 'wink'
    ? '<circle cx="40" cy="60" r="7" fill="#fff"/><circle cx="41.5" cy="61" r="3.6" fill="#1b2430"/><path d="M55 61 q6 -5 12 0" stroke="#1b2430" stroke-width="3" fill="none" stroke-linecap="round"/>'
    : '<circle cx="40" cy="60" r="7" fill="#fff"/><circle cx="64" cy="60" r="7" fill="#fff"/><circle cx="41.5" cy="61" r="3.6" fill="#1b2430"/><circle cx="65.5" cy="61" r="3.6" fill="#1b2430"/><circle cx="43" cy="59.5" r="1.2" fill="#fff"/><circle cx="67" cy="59.5" r="1.2" fill="#fff"/>';
  return `<svg class="mascot" width="${size}" height="${size}" viewBox="0 0 104 104" aria-hidden="true">
    <g class="m-smoke"><circle cx="76" cy="12" r="4" fill="var(--accent)" opacity=".35"/><circle cx="82" cy="5" r="3" fill="var(--accent)" opacity=".2"/></g>
    <rect x="70" y="18" width="11" height="18" rx="2.5" fill="var(--accent)"/>
    <path d="M12 50 L52 16 Q53 15 54 16 L92 50 Q94 53 90 54 L14 54 Q10 53 12 50Z" fill="var(--accent)"/>
    <rect x="20" y="44" width="64" height="50" rx="14" fill="var(--primary)"/>
    <rect x="20" y="44" width="64" height="16" rx="8" fill="#fff" opacity=".12"/>
    ${eyes}
    <path d="M45 74 q7 6 14 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="31" cy="71" r="4" fill="var(--accent)" opacity=".55"/><circle cx="73" cy="71" r="4" fill="var(--accent)" opacity=".55"/>
    <rect x="45" y="82" width="14" height="12" rx="4" fill="#fff" opacity=".9"/>
  </svg>`;
}

/* Icônes (trait) */
const ICON_PATHS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  folder: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 4.5a3.5 3.5 0 010 7"/><path d="M18 14a6 6 0 013.5 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  check: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 12l3 3 5-6"/>',
  file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
  euro: '<path d="M17 6.5A7 7 0 1017 17.5"/><path d="M4 10h9M4 14h9"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  bell: '<path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 004 0"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  chevL: '<path d="M15 18l-6-6 6-6"/>', chevR: '<path d="M9 18l6-6-6-6"/>', arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', refresh: '<path d="M20 11a8 8 0 00-14.9-3M4 13a8 8 0 0014.9 3"/><path d="M4 4v4h4M20 20v-4h-4"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01"/>',
  book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5"/>', megaphone: '<path d="M3 11v2a1 1 0 001 1h3l6 4V6L7 10H4a1 1 0 00-1 1z"/><path d="M17 8a5 5 0 010 8"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 7l9 6 9-6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>', cake: '<path d="M4 21h16v-8a2 2 0 00-2-2H6a2 2 0 00-2 2z"/><path d="M4 16c2 1 4 1 5 0s3-1 4 0 3 1 5 0"/><path d="M12 7v4M12 3v.5"/>',
  doc: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
};
const icon = (name, size = 20) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
const initials = (n) => String(n || '').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '🙂';
