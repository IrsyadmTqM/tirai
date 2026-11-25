const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const D = process.argv[2];
  const b = await chromium.launch();
  const errs = [];
  async function masuk(akun) {
    const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
    const p = await ctx.newPage();
    p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(`${akun}: ${m.text()}`); });
    p.on('pageerror', (e) => errs.push(`${akun} pageerror: ${e.message}`));
    await p.goto('http://localhost:3000/masuk');
    await p.fill('#nama', akun); await p.fill('#sandi', 'tirai-demo');
    await p.click('button[type=submit]');
    await p.waitForSelector('main h1');
    await p.waitForTimeout(900);
    return { ctx, p };
  }
  // Bendahara mencatat donasi
  const ben = await masuk('bendahara');
  await ben.p.waitForSelector('#d-nominal');
  await ben.p.selectOption('#d-donatur', '1');
  await ben.p.fill('#d-nominal', '250000');
  await ben.p.click('button:has-text("Catat donasi")');
  await ben.p.waitForSelector('.pemberitahuan');
  await ben.p.waitForTimeout(900);
  await ben.p.screenshot({ path: D + '/l6-bendahara.png' });
  console.log('bendahara toast:', await ben.p.textContent('.pemberitahuan'));
  // Pemilik: data saya, unduh, ajukan hapus
  const pem = await masuk('donatur-01');
  await pem.p.waitForSelector('.tabel-data');
  const [unduhan] = await Promise.all([pem.p.waitForEvent('download'), pem.p.click('a:has-text("JSON")')]);
  const jalur = D + '/unduhan.json';
  await unduhan.saveAs(jalur);
  const isi = JSON.parse(fs.readFileSync(jalur, 'utf8'));
  console.log('unduhan:', unduhan.suggestedFilename(), 'field:', isi.data.map((f) => f.kolom).join(','), 'donasi:', isi.transaksi.baris.length, 'riwayat:', isi.riwayat_akses.length);
  await pem.p.waitForTimeout(1200);
  await pem.p.screenshot({ path: D + '/l6-pemilik.png', fullPage: true });
  await pem.p.click('button:has-text("Ajukan penghapusan")');
  await pem.p.click('button:has-text("Ya, ajukan penghapusan")');
  await pem.p.waitForSelector('.status-permintaan');
  console.log('status pemilik:', (await pem.p.textContent('.status-permintaan')).trim());
  // Amil: daftarkan penerima, ajukan hapus penerima 2
  const amil = await masuk('amil-rw01');
  await amil.p.fill('#m-nama', 'Rukmini');
  await amil.p.fill('#m-alamat', 'Gg. Mawar No. 3, RT 02/RW 01, Kel. Sukamaju');
  await amil.p.fill('#m-nik', '0000000000000777');
  await amil.p.click('button:has-text("Daftarkan")');
  await amil.p.waitForSelector('.pemberitahuan');
  console.log('amil toast:', await amil.p.textContent('.pemberitahuan'));
  await amil.p.waitForSelector('td:has-text("Rukmini")');
  await amil.p.locator('tr:has-text("Ujang Supriatna") button:has-text("Ajukan hapus")').click();
  await amil.p.locator('tr:has-text("Ujang Supriatna") button:has-text("Ya, ajukan hapus")').click();
  await amil.p.waitForSelector('text=Hapus diajukan');
  await amil.p.waitForTimeout(500);
  await amil.p.screenshot({ path: D + '/l6-amil.png' });
  // Admin: setujui permintaan donatur #1
  const adm = await masuk('admin');
  await adm.p.waitForSelector('text=donatur #1');
  await adm.p.locator('tr:has-text("donatur #1") button:has-text("Setujui")').click();
  await adm.p.locator('tr:has-text("donatur #1") button:has-text("Ya, hapus")').click();
  await adm.p.waitForSelector('.pemberitahuan');
  console.log('admin toast:', await adm.p.textContent('.pemberitahuan'));
  await adm.p.waitForTimeout(800);
  await adm.p.screenshot({ path: D + '/l6-admin.png', fullPage: true });
  // Pemilik memuat ulang: sesi sudah tidak berlaku
  await pem.p.reload();
  await pem.p.waitForTimeout(800);
  console.log('pemilik setelah dihapus melihat:', (await pem.p.textContent('main h1')).trim());
  console.log(errs.length ? 'GALAT:\n' + errs.join('\n') : 'tidak ada galat konsol');
  await b.close();
})();
