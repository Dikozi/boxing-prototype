const { chromium } = require('./pw');
const fs = require('fs'), path = require('path');
const FILE = process.argv.slice(2).find(a => a[0] !== '-') || 'file://' + path.resolve(__dirname, '..', 'index.html');
/* Эталон боксёрских записей снят с файла после правки апперкота (от до-ММА файла он отличается только апперкотом в 3-м раунде):
   бокс обязан совпадать с ним до цифры. --write перезаписывает эталон —
   только когда расхождение осознанное. */
const BASE = path.join(__dirname, 'baseline', 'boxing.txt');

// детерминированный прогон боксёрского боя по фиксированному сценарию
const SCRIPT = `(() => {
  game = 'klinch'; mode='pvp'; newFight(); round=1;
  const seq = ['jab','uppercut','kick','spin','cross','block','bblock','slip','step'];
  const lv = ['head','body'];
  const out = [];
  for (let r=1; r<=MAX_ROUNDS && !isOver(); r++){
    round = r;
    const mk = (n) => { const id = seq[(r*3+n)%seq.length];
      return F[n].pending || (ACT[id].level ? {id, lvl: lv[(r+n)%2]} : {id}); };
    choices = [mk(0), mk(1)];
    resolveRound();
  }
  return bouts.map(b => [b.round, b.out[0].type, b.out[0].dmg||0, b.out[1].type, b.out[1].dmg||0,
                         b.hp[0], b.hp[1], b.st[0], b.st[1]].join(':')).join('|');
})()`;

(async () => {
  const b = await chromium.launch();
  const res = {};
  {
    const p = await (await b.newContext()).newPage();
    const e = []; p.on('pageerror', x => e.push(''+x));
    await p.goto(FILE);
    res.new = await p.evaluate(SCRIPT);
    res.new_err = e;
    await p.close();
  }
  if (process.argv.includes('--write')) { fs.writeFileSync(BASE, res.new); console.log('эталон записан:', BASE); }
  res.base = fs.existsSync(BASE) ? fs.readFileSync(BASE, 'utf8') : '';
  console.log('=== РЕГРЕССИЯ БОКСА (одинаковый сценарий, эталон против нового) ===');
  console.log(res.new === res.base ? '✔ записи раундов совпадают до цифры' : '✖ РАСХОЖДЕНИЕ');
  if (res.new !== res.base) {
    const a = res.base.split('|'), c = res.new.split('|');
    for (let i=0;i<Math.max(a.length,c.length);i++) if(a[i]!==c[i]) console.log('  r'+(i+1), 'было', a[i], 'стало', c[i]);
  }
  console.log('  раундов:', res.new.split('|').length, ' ошибок:', res.new_err.length);

  // --- детерминизм ММА: повтор и пересмотр не меняют бой ---
  const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror', x=>errs.push(''+x));
  p.on('console', m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
  await p.goto(FILE);
  const before = await p.evaluate(() => {
    game='mma'; mode='cpu'; pick=['wrestler','grap']; newFight(); round=1;
    for (round=1; round<=MAX_ROUNDS; round++){
      choices=[F[0].pending||botChooseMMA(), F[1].pending||botChooseMMA()];
      resolveRoundMMA();
      if(F[0].ko||F[1].ko) break;
    }
    phase='over'; render();
    return {b:JSON.stringify(bouts.map(x=>[x.round,x.hp,x.st,x.after.pos,x.after.top])),
            f:JSON.stringify([F[0].hp,F[1].hp,F[0].st,F[1].st,F[0].ko,F[1].ko,F[0].tap,F[1].tap]),
            g:JSON.stringify(GR), n:bouts.length};
  });
  await p.evaluate(()=>replayStart());
  // гоняем повтор до конца, пропуская размены
  for (let i=0;i<800;i++){
    const s = await p.evaluate(()=>({ph:phase, idx:replay?replay.idx:-1, anim:animating,
                                     rp:RP.pos+'/'+RP.top, n:bouts.length}));
    if (s.ph!=='replay') break;
    if (s.idx >= s.n) break;
    if (s.anim) await p.evaluate(()=>skipSeq());
    await p.waitForTimeout(12);
  }
  await p.evaluate(()=>replayStop());
  const after = await p.evaluate(() => ({
    b:JSON.stringify(bouts.map(x=>[x.round,x.hp,x.st,x.after.pos,x.after.top])),
    f:JSON.stringify([F[0].hp,F[1].hp,F[0].st,F[1].st,F[0].ko,F[1].ko,F[0].tap,F[1].tap]),
    g:JSON.stringify(GR), rp:RP.pos+'/'+RP.top}));
  console.log('=== ДЕТЕРМИНИЗМ ММА ===');
  console.log(' раундов в бою     :', before.n);
  console.log(' записи после повтора :', before.b===after.b ? '✔ не изменились' : '✖ ИЗМЕНИЛИСЬ');
  console.log(' состояние бойцов     :', before.f===after.f ? '✔ не изменилось' : '✖ ИЗМЕНИЛОСЬ '+before.f+' -> '+after.f);
  console.log(' позиция пары         :', before.g===after.g ? '✔ не изменилась' : '✖ ИЗМЕНИЛАСЬ');
  console.log(' сцена вернулась в    :', after.rp);
  console.log(' ERRORS:', errs.length?errs.slice(0,6).join('\n'):'none');
  await b.close();
})();
