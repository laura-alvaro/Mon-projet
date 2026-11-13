const { chromium } = require('playwright'); const SCENES = require('./scenes.js'); const fs = require('fs');
(async () => {
  fs.mkdirSync('build', { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (let i = 0; i < SCENES.length; i++) {
    await p.goto(`file://${__dirname}/overlay.html#${i}`); await p.reload(); await p.waitForTimeout(900);
    await p.screenshot({ path: `build/overlay-${String(i).padStart(2,'0')}.png`, omitBackground: true });
  }
  await p.goto(`file://${__dirname}/../../modeles/fin-video.html`); await p.waitForTimeout(1200);
  await p.locator('.canvas').screenshot({ path: 'build/fin.png' });
  await b.close();
})();
