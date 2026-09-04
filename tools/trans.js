const { chromium } = require('./pw');
const FILE = process.argv[2] || 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext()).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const r=await p.evaluate(()=>{
    const ang=(a,c,d)=>{ const v1={x:a.x-c.x,y:a.y-c.y}, v2={x:d.x-c.x,y:d.y-c.y};
      return Math.atan2(v1.x*v2.y-v1.y*v2.x, v1.x*v2.x+v1.y*v2.y); };
    const out=[];
    for(const key of Object.keys(TRANS)){
      const [from,to]=key.split('>');
      game='mma'; mode='pvp'; pick=['wrestler','striker']; newFight(); resetRing();
      setRP(from, from==='stand'?-1:(from==='clinch'?0:1), null);
      for(let n=0;n<200;n++){ driveIdle(); settle(1/60); }
      startTrans(to, to==='stand'?-1:(to==='clinch'?0:1));
      let prev=[null,null], pt=[null,null], flips=0, maxRate=0, maxTip=0;
      for(let n=0;n<60;n++){
        RP.tk=Math.min(1, RP.tk + (1000/60)/TRANS_MS);
        driveIdle(); settle(1/60);
        for(let i=0;i<2;i++){
          const J=B[i].J;
          const cur=[ang(J.arms[0].sh,J.arms[0].el,J.arms[0].hand),
                     ang(J.arms[1].sh,J.arms[1].el,J.arms[1].hand),
                     ang(J.legs[0].hip,J.legs[0].knee,J.legs[0].foot),
                     ang(J.legs[1].hip,J.legs[1].knee,J.legs[1].foot)];
          if(prev[i]) for(let k=0;k<4;k++){
            if(Math.sign(prev[i][k])!==Math.sign(cur[k]) && Math.abs(prev[i][k])>0.12 && Math.abs(cur[k])>0.12) flips++;
            maxRate=Math.max(maxRate, Math.abs(cur[k]-prev[i][k])*180/Math.PI);
          }
          // скорость КОНЦА конечности — вот это и видит глаз
          const tip=[J.arms[0].hand,J.arms[1].hand,J.legs[0].foot,J.legs[1].foot];
          if(pt[i]) for(let k=0;k<4;k++)
            maxTip=Math.max(maxTip, Math.hypot(tip[k].x-pt[i][k].x, tip[k].y-pt[i][k].y));
          pt[i]=tip.map(q=>({x:q.x,y:q.y}));
          prev[i]=cur;
        }
      }
      out.push({переход:key, перескоки:flips, макс:+maxRate.toFixed(0), конец:+maxTip.toFixed(1)});
    }
    return out.sort((a,c)=>c.макс-a.макс);
  });
  let worst=0, fl=0, tip=0;
  for(const x of r){ worst=Math.max(worst,x.макс); fl+=x.перескоки; tip=Math.max(tip,x.конец); }
  console.log('переходов:', r.length, ' худший сустав:', worst+'°/кадр',
              ' худший конец конечности:', tip+' ед/кадр', ' перескоков знака:', fl);
  const byTip=r.slice().sort((a,c)=>c.конец-a.конец);
  for(const x of byTip.slice(0,5)) console.log('  '+x.переход.padEnd(16)+
    String(x.конец).padStart(5)+' ед/кадр   '+String(x.макс).padStart(4)+'°/кадр');
  console.log('ошибок:', errs.length, errs.slice(0,2));
  await b.close();
})();
