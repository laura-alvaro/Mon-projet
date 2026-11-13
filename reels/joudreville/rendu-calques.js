const { chromium } = require('playwright'); const S = require('./scenes.js'); const fs = require('fs');
(async () => {
  fs.mkdirSync('build', { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const shot = async (h, f, tr) => { await p.goto(`file://${__dirname}/calque.html#${h}`); await p.reload(); await p.waitForTimeout(800);
    await p.screenshot({ path: `build/${f}`, omitBackground: tr }); };
  for (let i = 0; i < S.length; i++) { const s = S[i], id = String(i).padStart(2,'0');
    if (s.type === 'wipe') { await shot(`${i}-avant`, `c-${id}-avant.png`, true); await shot(`${i}-apres`, `c-${id}-apres.png`, true); }
    else if (s.type === 'tags') for (let n = 0; n <= s.items.length; n++) await shot(`${i}-t-${n}`, `c-${id}-${n}.png`, false);
    else await shot(`${i}-x`, `c-${id}.png`, s.type !== 'final');
  }
  await p.goto(`file://${__dirname}/../../modeles/fin-video.html`); await p.waitForTimeout(1200);
  await p.locator('.canvas').screenshot({ path: 'build/fin.png' }); await b.close();
})();
