// Уровни бота: доля побед случайного игрока должна строго убывать лёгкий → средний → трудный.
const { chromium } = require('./pw');
const FILE = process.argv[2] || 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext()).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const r=await p.evaluate((N)=>{
    let seed=12345; const lcg=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
    const playerPick=()=>{ const L=legal(0); const id=L[Math.floor(lcg()*L.length)]; return ACT[id].level ? {id, lvl: lcg()<.5?'head':'body'} : {id}; };
    const out={};
    for(const lvl of ['easy','mid','hard']){
      let wins=0, koW=0, rounds=0; seed=12345;
      for(let n=0;n<N;n++){
        game='klinch'; mode='cpu'; setBotLevel(lvl); newFight();
        for(round=1; round<=MAX_ROUNDS && !isOver(); round++){
          choices=[null,null]; for(let i=0;i<2;i++) if(F[i].pending) choices[i]=F[i].pending;
          if(!choices[1]) choices[1]=botChoose(); if(!choices[0]) choices[0]=playerPick();
          resolveRound(); rounds++;
        }
        const w = F[1].ko || F[1].hp<=0 ? 0 : (F[0].ko || F[0].hp<=0 ? 1 : (F[0].hp>F[1].hp ? 0 : 1));
        if(w===0){ wins++; if(F[1].ko||F[1].hp<=0) koW++; }
      }
      out[lvl]={побед_игрока:+(100*wins/N).toFixed(1), из_них_нокаутом:koW, раундов_в_среднем:+(rounds/N).toFixed(1)};
    }
    setBotLevel('mid');
    return out;
  }, 600);
  console.log('случайный игрок против бота, 600 боёв на уровень');
  for(const k in r) console.log('  '+k.padEnd(5), JSON.stringify(r[k]));
  const e=r.easy.побед_игрока, m=r.mid.побед_игрока, h=r.hard.побед_игрока;
  const ok = e>=m+5 && m>=h+5;
  console.log(ok?'✔ уровни различимы: лёгкий > средний > трудный с зазором ≥ 5 пунктов':'✖ уровни не различаются или порядок нарушен', ' ошибок:', errs.length, errs.slice(0,2));
  await b.close();
})();
