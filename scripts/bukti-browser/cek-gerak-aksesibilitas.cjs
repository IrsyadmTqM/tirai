const { chromium } = require('playwright');
(async () => {
  const D = process.argv[2];
  const b = await chromium.launch();
  // 1. Reduced motion: no transform in progress right after switching role.
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3000/');
  await p.waitForSelector('table.buku-kas');
  await p.click('button.tombol-peran:has-text("Amil lapangan")');
  await p.waitForTimeout(120);
  const transforms = await p.$$eval('.tirai-sel', (els) => els.map((e) => getComputedStyle(e).transform).filter((t) => t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)'));
  console.log('reduced-motion: tirai dengan transform belum selesai =', transforms.length);
  const garis = await p.$eval('.alur-garis-isi', (e) => getComputedStyle(e).transform);
  console.log('reduced-motion: garis alur =', garis);
  await p.screenshot({ path: D + '/l5-hemat-gerak.png' });
  await ctx.close();
  // 2. Keyboard: tab to role buttons and activate with Enter.
  const k = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const pk = await k.newPage();
  await pk.goto('http://localhost:3000/');
  await pk.waitForSelector('table.buku-kas');
  for (let i = 0; i < 6; i++) await pk.keyboard.press('Tab');
  const fokus = await pk.evaluate(() => document.activeElement.textContent);
  await pk.keyboard.press('Enter');
  await pk.waitForTimeout(800);
  const ditekan = await pk.$eval('button[aria-pressed=true]', (e) => e.textContent);
  console.log('keyboard: fokus pada', JSON.stringify(fokus), '-> aktif', JSON.stringify(ditekan));
  await pk.screenshot({ path: D + '/l5-fokus.png', clip: { x: 560, y: 300, width: 500, height: 100 } });
  // 3. Touch target sizes.
  const kecil = await pk.$$eval('a, button, input', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 44; }).map((e) => e.outerHTML.slice(0, 60)));
  console.log('target sentuh < 44px:', kecil.length ? kecil : 'tidak ada');
  await k.close();
  // 4. Video of role switching.
  const v = await b.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: D + '/video', size: { width: 1280, height: 800 } } });
  const pv = await v.newPage();
  await pv.goto('http://localhost:3000/');
  await pv.waitForSelector('table.buku-kas');
  await pv.waitForTimeout(800);
  await pv.mouse.wheel(0, 250); await pv.waitForTimeout(700);
  for (const r of ['Amil lapangan', 'Admin', 'Bendahara', 'Amil lapangan']) {
    await pv.click(`button.tombol-peran:has-text("${r}")`);
    await pv.waitForTimeout(1700);
  }
  await pv.locator('#cara-kerja h2').scrollIntoViewIfNeeded();
  for (let y = 0; y < 16; y++) { await pv.mouse.wheel(0, 140); await pv.waitForTimeout(160); }
  await pv.waitForTimeout(1200);
  const jalur = await pv.video().path();
  await v.close();
  console.log('video:', jalur);
  await b.close();
})();
