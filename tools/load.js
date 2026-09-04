// Загрузка по сети: локальный http-сервер + троттлинг Chrome (CDP).
// Меряет три момента: стартовый экран (phase === 'start'), хвост файла
// (картинки врезок и музыка пришли) и событие load. Порог — старт на Fast 3G
// быстрее 15 с: это первое, что видит новый игрок на GitHub Pages.
const { chromium } = require('./pw');
const http = require('http'), fs = require('fs'), path = require('path');
const FILE = process.argv[2] || path.resolve(__dirname, '..', 'index.html');
const NETS = { 'Fast 3G': { download: 1.6e6 / 8, upload: 750e3 / 8, latency: 150 },
               '4G':      { download: 9e6 / 8,   upload: 4.5e6 / 8, latency: 60 } };
(async () => {
  const body = fs.readFileSync(FILE);
  const srv = http.createServer((q, r) => {
    r.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-length': body.length }); r.end(body);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const b = await chromium.launch();
  console.log('=== ЗАГРУЗКА: ' + (body.length / 1048576).toFixed(2) + ' МБ ===');
  let worst = 0;
  for (const [name, net] of Object.entries(NETS)) {
    const st = [], tl = [], ld = [];
    for (let i = 0; i < 2; i++) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
      const p = await ctx.newPage();
      const cdp = await ctx.newCDPSession(p);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: net.download, uploadThroughput: net.upload, latency: net.latency });
      const t0 = Date.now();
      p.goto(url, { waitUntil: 'commit', timeout: 180000 }).catch(() => {});
      await p.waitForFunction(() => typeof phase !== 'undefined' && phase === 'start', null, { timeout: 180000 });
      st.push(Date.now() - t0);
      await p.waitForFunction(() => typeof MUS_SRC !== 'undefined' && !!MUS_SRC && typeof CUT_ART !== 'undefined' && Object.keys(CUT_ART).length > 0,
                              null, { timeout: 180000 }).catch(() => {});
      tl.push(Date.now() - t0);
      await p.waitForLoadState('load', { timeout: 180000 }).catch(() => {});
      ld.push(Date.now() - t0);
      await ctx.close();
    }
    if (name === 'Fast 3G') worst = Math.max(...st);
    console.log(`  ${name}: стартовый экран ${st.join('/')} мс · хвост (картинки+музыка) ${tl.join('/')} мс · load ${ld.join('/')} мс`);
  }
  console.log(worst < 15000 ? '✔ Fast 3G: старт быстрее 15 с' : '✖ Fast 3G: старт медленнее 15 с (' + worst + ' мс)');
  await b.close(); srv.close();
})();
