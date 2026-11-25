const { chromium, devices } = require('playwright');
(async () => {
  const D = process.argv[2];
  const b = await chromium.launch();
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (['error','warning'].includes(m.type())) errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await p.goto('http://localhost:3000/');
  await p.waitForSelector('table.buku-kas');
  await p.waitForTimeout(1200);
  await p.screenshot({ path: D + '/l5-beranda-bendahara.png' });
  await p.click('button.tombol-peran:has-text("Amil lapangan")');
  await p.waitForTimeout(250);
  await p.screenshot({ path: D + '/l5-transisi.png' });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: D + '/l5-beranda-amil.png' });
  await p.click('button.tombol-peran:has-text("Admin")');
  await p.waitForTimeout(1400);
  await p.screenshot({ path: D + '/l5-beranda-admin.png' });
  await p.locator('#cara-kerja').scrollIntoViewIfNeeded();
  for (let y = 0; y < 6; y++) { await p.mouse.wheel(0, 500); await p.waitForTimeout(350); }
  await p.waitForTimeout(800);
  await p.screenshot({ path: D + '/l5-penuh.png', fullPage: true });
  const m = await b.newContext({ ...devices['iPhone 13'] });
  const pm = await m.newPage();
  pm.on('console', (x) => { if (['error','warning'].includes(x.type())) errs.push('mobile: ' + x.text()); });
  await pm.goto('http://localhost:3000/');
  await pm.waitForSelector('table.buku-kas');
  await pm.waitForTimeout(1200);
  await pm.screenshot({ path: D + '/l5-ponsel.png' });
  for (let y = 0; y < 14; y++) { await pm.mouse.wheel(0, 400); await pm.waitForTimeout(200); }
  await pm.screenshot({ path: D + '/l5-ponsel-penuh.png', fullPage: true });
  console.log(errs.length ? errs.join('\n') : 'tidak ada galat konsol');
  await b.close();
})();
