// Живая стойка: боец переставляет ступню, метка при этом не двигается.
const { chromium } = require('./pw');
const FILE = process.argv[2] || 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const r=await p.evaluate(async ()=>{
    game='box'; mode='pvp'; newFight(); resetRing();
    phase='reveal'; revealDone=false; render(); paintRing();
    const tr=[]; const t0=performance.now();
    await new Promise(res=>{ const tick=()=>{ if(performance.now()-t0>9000) return res();
      const row={t:performance.now()-t0, seq:!!seq};
      for(let i=0;i<2;i++){ const F0=B[i], J=F0.drawJ||poseOf(F0);
        row['d'+i]=F0.drift[0]; row['e'+i]=F0.drift[1]; row['b'+i]=F0.base-POS[i];
        row['y'+i]=Math.max(FLOOR-J.legs[0].foot.y, FLOOR-J.legs[1].foot.y); row['f'+i]=J.legs[0].foot.x; }
      tr.push(row); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    let mx=0, dmax=0, moves=0, liftedBefore=0, gap=999, starts=0, baseMoved=0, sampled=0; const lifts=[], gaps=[], starts_t=[], winFrames=[];
    for(let i=1;i<tr.length;i++){ const q=tr[i], pr=tr[i-1];
      gap=Math.min(gap, (q.f1-q.f0)*B[0].face);
      for(const kk of [0,1,2,3]){ const k=kk%2, fld=(kk<2?'d':'e')+k;
        const d=q[fld]; mx=Math.max(mx,Math.abs(d)); baseMoved=Math.max(baseMoved,Math.abs(q['b'+k]));
        const dd=Math.abs(d-pr[fld]); dmax=Math.max(dmax, dd/Math.max(1,q.t-pr.t)*1000);   // ед./с — не зависит от частоты кадров
        if(dd>0.01){ moves++;
          if(Math.abs(pr[fld]-tr[Math.max(0,i-2)][fld])<=0.01){ starts++;
            // подъём ищем в окне переступа: пружина стопы трогается на несколько кадров позже цели
            let lift=0, gapMs=0, jEnd=Math.min(tr.length,i+45); for(let j=i;j<jEnd;j++){ lift=Math.max(lift,tr[j]['y'+k]); gapMs=Math.max(gapMs, tr[j].t-tr[j-1].t); }
            starts_t.push(+tr[i].t.toFixed(0)); winFrames.push(jEnd-i);
            // порог отделяет отрыв от волочения: при 60 кадрах подъём ~1.5.
            // Не оценивается переступ, чьё окно обрезано концом трассы, и переступ с
            // выпавшим кадром (интервал > 40 мс) — там пик просто не нарисован.
            lifts.push(+lift.toFixed(2)); gaps.push(+gapMs.toFixed(0));
            if(gapMs<=40 && jEnd-i>=45){ sampled++; if(lift>0.4) liftedBefore++; } } } } }
    // размен: база не двигается
    const rc={round:1,choices:[{id:'jab',lvl:'head'},{id:'block'}],out:[{type:'atk',dmg:20,mult:1,why:'',ok:true},{type:'def',dmg:0}],
      hp:[100,80],st:[70,80],ko:[false,false],before:{hp:[100,100],st:[100,100],pending:[null,null]}};
    const bases=[]; playRound(rc,()=>{});
    await new Promise(res=>{ const tick=()=>{ if(!seq) return res(); bases.push(B[0].base+'/'+B[1].base); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    return {кадров:tr.length, смещение_ступни_макс:+mx.toFixed(2), скорость_ступни_макс:+dmax.toFixed(0), метка_сдвинулась:+baseMoved.toFixed(2), кадров_движения:moves, переступов:starts, подъёмы:lifts, кадр_макс_мс:gaps, старт_мс:starts_t, кадров_в_окне:winFrames,
            с_ровными_кадрами:sampled, стопа_отрывалась:liftedBefore, зазор_стоп_мин:+gap.toFixed(1), база_в_размене:new Set(bases).size};
  });
  console.log(JSON.stringify(r));
  const ok = r.смещение_ступни_макс<=3.01 && r.метка_сдвинулась===0 && r.переступов>=1 && r.с_ровными_кадрами>=3 && r.стопа_отрывалась===r.с_ровными_кадрами && r.зазор_стоп_мин>=6 && r.база_в_размене===1;
  console.log(ok?'✔ живая стойка: переступы малые, шагом, в размене база стоит':'✖ живая стойка: отклонение', ' ошибок:', errs.length, errs.slice(0,2));
  await b.close();
})();
