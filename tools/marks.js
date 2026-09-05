// Следы боя: считаются от записей, растут монотонно, в живом бою и в повторе совпадают.
const { chromium } = require('./pw');
const FILE = process.argv[2] || 'file://' + require('path').resolve(__dirname, '..', 'index.html');
const OUT = require('path').join(__dirname, '.out'); require('fs').mkdirSync(OUT, {recursive:true});
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const r=await p.evaluate(async ()=>{
    game='klinch'; mode='pvp'; newFight(); resetRing();
    const seqIds=['jab','uppercut','kick','cross','jab','uppercut'], lv=['head','body'];
    for(let r=1; r<=MAX_ROUNDS && !isOver(); r++){
      round=r;
      const mk=(n)=>{ const id=seqIds[(r*2+n)%seqIds.length]; return F[n].pending || (ACT[id].level ? {id, lvl:lv[(r+n)%2]} : {id}); };
      choices=[mk(0), mk(1)]; resolveRound();
    }
    const N=bouts.length, mono=[true,true], series=[[],[]];
    let cutRule=true;
    for(let j=0;j<2;j++){ let prev={head:0,body:0,heavy:0};
      for(let n=0;n<=N;n++){ const m=marksUpTo(j,n); series[j].push(m.head+'/'+m.body+'/'+m.heavy+(m.cut?'*':''));
        if(m.head<prev.head||m.body<prev.body||m.heavy<prev.heavy) mono[j]=false;
        if(m.cut!==(m.heavy>=1)) cutRule=false; prev=m; } }
    // живой раунд: следы в конце размена совпадают с формулой по записям
    let liveOk=true, checked=0, freshCut=null;
    phase='reveal'; revealDone=false; render(); paintRing();
    for(let k=0;k<N && checked<3;k++){
      const rec=bouts[k]; if(!(rec.out[0].dmg>0 || rec.out[1].dmg>0)) continue;
      playRound(rec,()=>{});
      const start=[0,1].map(j=>JSON.stringify(B[j].marks)), want0=[0,1].map(j=>JSON.stringify(marksUpTo(j,k)));
      await new Promise(res=>{ const tick=()=>{ if(!seq) return res(); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
      const strip=m=>{ const o=Object.assign({},m); delete o.cutT; return JSON.stringify(o); };
      const end=[0,1].map(j=>strip(B[j].marks)), want1=[0,1].map(j=>strip(marksUpTo(j,k+1)));
      const s0=[0,1].map(j=>strip(JSON.parse(start[j]))), w0=[0,1].map(j=>strip(JSON.parse(want0[j])));
      if(s0.join()!==w0.join() || end.join()!==want1.join()) liveOk=false;
      for(let j=0;j<2;j++) if(B[j].marks.cut && B[j].marks.cutT>0 && !marksUpTo(j,k).cut) freshCut=B[j].marks.cutT;   // свежее рассечение получило время
      checked++;
    }
    marksIdle(); driveIdle(); for(let n=0;n<30;n++) settle(1/60);
    render(); paintRing();
    const fin=[marksUpTo(0,N), marksUpTo(1,N)];
    return {раундов:N, монотонно:mono, рассечение_по_правилу:cutRule, свежее_со_временем:freshCut!==null, ряд0:series[0].join(' '), ряд1:series[1].join(' '), живой_совпал:liveOk, проверено_раундов:checked,
            итог:fin, есть_следы:(fin[0].head+fin[1].head)>0};
  });
  console.log(JSON.stringify(r));
  await p.screenshot({path:OUT+'/marks.png', clip:{x:0,y:130,width:390,height:300}});
  const ok = r.монотонно[0] && r.монотонно[1] && r.рассечение_по_правилу && r.свежее_со_временем && r.живой_совпал && r.проверено_раундов>=2 && r.есть_следы;
  console.log(ok?'✔ следы боя: от записей, монотонны, живой бой = повтор':'✖ следы боя: расхождение', ' ошибок:', errs.length, errs.slice(0,2));
  await b.close();
})();
