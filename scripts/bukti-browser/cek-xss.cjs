// Pemeriksaan XSS di browser: nama penerima berisi skrip tidak dijalankan.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  let dialog = false;
  p.on('dialog', async (d) => { dialog = true; await d.dismiss(); });
  await p.goto('http://localhost:3000/masuk');
  await p.fill('#nama', 'amil-rw01'); await p.fill('#sandi', 'tirai-demo');
  await p.click('button[type=submit]');
  await p.waitForSelector('#m-nama');
  await p.fill('#m-nama', '<img src=x onerror=alert(1)>');
  await p.fill('#m-alamat', '<script>alert(2)</script>');
  await p.fill('#m-nik', '0000000000005555');
  await p.click('button:has-text("Daftarkan")');
  await p.waitForSelector('td:has-text("<img src=x onerror=alert(1)>")');
  await p.waitForTimeout(800);
  const img = await p.$$eval('.tabel-penerima img', (els) => els.length);
  console.log('dialog alert muncul?', dialog, '| elemen <img> sisipan di tabel:', img);
  await b.close();
})();
