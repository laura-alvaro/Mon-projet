const { chromium } = require('playwright'); const SCENES = require('./scenes.js'); const fs = require('fs');
(async () => {
  fs.mkdirSync('build', { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const shot = async (hash, file, transparent) => { await p.goto(`file://${__dirname}/calque.html#${hash}`); await p.reload(); await p.waitForTimeout(800);
    await p.screenshot({ path: `build/${file}`, omitBackground: transparent }); };
  await shot('0-fond', 'fond.png', false);
  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i]; const id = String(i).padStart(2, '0');
    if (s.type === 'carte') await shot(`${i}-texte`, `texte-${id}.png`, true);
    else for (let n = 1; n <= s.items.length; n++) await shot(`${i}-liste-${n}`, `liste-${id}-${n}.png`, false);
  }
  await p.goto(`file://${__dirname}/../../modeles/fin-video.html`); await p.waitForTimeout(1200);
  await p.locator('.canvas').screenshot({ path: 'build/fin.png' });
  await b.close();
})();
