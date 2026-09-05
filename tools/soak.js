const { chromium } = require('./pw');
const FILE = 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e));
  p.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
  await p.goto(FILE);
  const stat = {fights:0, over:0, ko:0, sub:0, dec:0}; const pos = new Set(); const acts = new Set();
  for (let f=0; f<4; f++){
    const mma = f < 3, cpu = f % 2 === 0;
    await p.evaluate(()=>{ replayStop&&0; });
    await p.evaluate(()=>{ phase='start'; game='klinch'; render(); });
    await p.click(mma? '[data-go="game-mma"]':'[data-go="game-klinch"]');
    await p.click(cpu? '[data-go="opp-cpu"]':'[data-go="opp-pvp"]');
    for (let i=0;i<1400;i++){
      const s = await p.evaluate(()=>({ph:phase, anim:animating,
        picks:[...document.querySelectorAll('[data-pick]')].map(e=>e.dataset.pick),
        arch:[...document.querySelectorAll('[data-arch]')].map(e=>e.dataset.arch),
        lvl:!!document.querySelector('[data-lvl]'),
        go:[...document.querySelectorAll('[data-go]')].map(e=>e.dataset.go),
        pos:GR.pos+(GR.top>=0?'/'+GR.top:''), tap:F[0].tap||F[1].tap,
        hp:[F[0].hp,F[1].hp]}));
      if (game_over(s)) break;
      pos.add(s.pos); s.picks.forEach(x=>acts.add(x));
      if (s.anim){ await p.evaluate(()=>skipSeq()); await p.waitForTimeout(16); continue; }
      if (s.arch.length) await p.click(`[data-arch="${s.arch[(Math.random()*s.arch.length)|0]}"]`);
      else if (s.picks.length) await p.click(`[data-pick="${s.picks[(Math.random()*s.picks.length)|0]}"]`);
      else if (s.lvl) await p.click(Math.random()<.5?'[data-lvl="head"]':'[data-lvl="body"]');
      else if (s.go.includes('done')) await p.click('[data-go="done"]');
      else if (s.go.includes('choose') && !s.go.includes('next')) await p.click('[data-go="choose"]');
      else if (s.go.includes('next')) await p.click('[data-go="next"]');
      else if (s.go.includes('over')) await p.click('[data-go="over"]');
      else await p.waitForTimeout(30);
    }
    function game_over(s){ return s.ph==='over'; }
    const v = await p.evaluate(()=>({ph:phase, t:document.querySelector('#panel h1')?.textContent||'',
                                     s:document.querySelector('#panel .sub')?.textContent||''}));
    stat.fights++; if (v.ph === 'over') stat.over++;
    if (/Сдача/.test(v.s)) stat.sub++; else if (/Нокаут/.test(v.s)) stat.ko++; else stat.dec++;
    console.log(` бой ${f+1} ${mma?'ММА':'бокс'} ${cpu?'vs CPU':'2 игрока'}: ${v.ph} — ${v.t} / ${v.s}`);
    // повтор боя целиком
    if (v.ph==='over'){
      await p.click('[data-go="replay"]');
      for (let i=0;i<900;i++){
        const s=await p.evaluate(()=>({ph:phase, idx:replay?replay.idx:-1, n:bouts.length, anim:animating}));
        if (s.ph!=='replay'||s.idx>=s.n) break;
        if (s.anim) await p.evaluate(()=>skipSeq());
        await p.waitForTimeout(10);
      }
      await p.evaluate(()=>replayStop());
    }
  }
  console.log('исходы:', JSON.stringify(stat));
  console.log('позиции:', [...pos].sort().join(' '));
  console.log('действий предложено:', [...acts].length);
  console.log('ERRORS:', errs.length?errs.slice(0,10).join('\n'):'none');
  /* Бой обязан ДОЙТИ до финала через интерфейс. Раньше пробник смотрел только
     на ошибки страницы, и застрявший экран (кнопка «В ГОЛОВУ» глохла из-за
     чужого слушателя) четыре боя подряд считался успехом. */
  const ok = stat.over === 4 && errs.length === 0;
  console.log(ok ? '✔ четыре боя доиграны через интерфейс до финала' : '✖ бой не дошёл до финала или есть ошибки: доиграно ' + stat.over + ' из 4');
  await b.close();
})();
