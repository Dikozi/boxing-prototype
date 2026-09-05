// Код боя: тот же код в свежей странице даёт те же записи, доигрывание не расходится,
// автосохранение снимается, когда бой окончен. Бокс и ММА.
const { chromium } = require('./pw');
const FILE = process.argv[2] || 'file://' + require('path').resolve(__dirname, '..', 'index.html');
// Ходы синтетические: множители 9 и 4 подобраны так, чтобы оба боя шли все 14 раундов.
const PLAY = (g, from, to, seedInit) => `(() => {
  ${seedInit ? "game='" + g + "'; mode='pvp'; pick=['wrestler','striker']; newFight(); rngS = fightSeed = 777;" : ''}
  const lv=['head','body'];
  for(let r=${from}; r<=${to} && !isOver(); r++){ round=r;
    const mk=(k)=>{ if(F[k].pending) return F[k].pending; const L=legal(k); const id=L[(r*9+k*4)%L.length]; return ACT[id].level ? {id, lvl:lv[(r+k)%2]} : {id}; };
    choices=[mk(0),mk(1)]; resolveRound(); }
  const rec = JSON.stringify(bouts.map(b=>[b.round,b.choices,b.out.map(o=>[o.type,o.dmg||0,!!o.liver]),b.hp,b.st,b.winded,b.ko,b.after?[b.after.pos,b.after.top]:null]));
  return {code: codeOf(), rec, n: bouts.length, saved: localStorage.getItem('klinch.fight'), over: isOver()}; })()`;
(async()=>{
  const b=await chromium.launch();
  const errs=[];
  const res={};
  for(const g of ['klinch','mma']){
    const A=await (await b.newContext()).newPage(); A.on('pageerror',e=>errs.push(''+e)); await A.goto(FILE);
    const a1=await A.evaluate(PLAY(g,1,7,true));
    const B2=await (await b.newContext()).newPage(); B2.on('pageerror',e=>errs.push(''+e)); await B2.goto(FILE);
    const b1=await B2.evaluate((code)=>{ const ok=loadCode(code); return {ok, rec: JSON.stringify(bouts.map(b=>[b.round,b.choices,b.out.map(o=>[o.type,o.dmg||0,!!o.liver]),b.hp,b.st,b.winded,b.ko,b.after?[b.after.pos,b.after.top]:null])), n:bouts.length, round}; }, a1.code);
    const a2=await A.evaluate(PLAY(g,8,14,false));
    const b2=await B2.evaluate(PLAY(g,8,14,false));
    res[g]={код_длина:a1.code.length, раундов:a1.n, загрузился:b1.ok, совпало_после_загрузки:a1.rec===b1.rec, следующий_раунд:b1.round,
            совпало_доигрывание:a2.rec===b2.rec, автосохранение_было:a1.saved===a1.code, снято_в_конце:(a2.over||a2.n>=14) ? a2.saved===null : 'бой не окончен', код:a1.code.slice(0,40)+'…'};
    await A.context().close(); await B2.context().close();
  }
  // кнопки: «продолжить бой» из автосохранения и присланный код из адреса
  const A=await (await b.newContext()).newPage(); A.on('pageerror',e=>errs.push(''+e)); await A.goto(FILE);
  const seed=await A.evaluate(PLAY('klinch',1,5,true));
  await A.evaluate(()=>{ phase='start'; render(); });
  const hasResume=await A.$('[data-go="resume"]');
  if(hasResume) await hasResume.click();
  const ui1=await A.evaluate(()=>({phase, round, n:bouts.length}));
  const D=await (await b.newContext()).newPage(); D.on('pageerror',e=>errs.push(''+e));
  await D.goto(FILE+'#f='+encodeURIComponent(seed.code));
  const hasShared=await D.$('[data-go="shared"]');
  if(hasShared) await hasShared.click();
  await D.waitForTimeout(300);
  const ui2=await D.evaluate(()=>({phase, n:bouts.length}));
  res.кнопки={продолжить_есть:!!hasResume, после_продолжить:ui1, присланный_есть:!!hasShared, после_присланного:ui2};
  await A.context().close(); await D.context().close();
  for(const g in res) console.log(g.padEnd(7), JSON.stringify(res[g]));
  const ok=['klinch','mma'].every(g=>res[g].загрузился && res[g].совпало_после_загрузки && res[g].совпало_доигрывание && res[g].автосохранение_было && res[g].снято_в_конце!==false)
    && res.кнопки.продолжить_есть && (res.кнопки.после_продолжить.phase==='choose' || res.кнопки.после_продолжить.phase==='handoff') && res.кнопки.после_продолжить.round===6 && res.кнопки.после_продолжить.n===5
    && res.кнопки.присланный_есть && res.кнопки.после_присланного.phase==='replay' && res.кнопки.после_присланного.n===5;
  console.log(ok?'✔ код боя: загрузка и доигрывание совпадают до цифры, автосохранение снимается':'✖ код боя: расхождение', ' ошибок:', errs.length, errs.slice(0,2));
  await b.close();
})();
