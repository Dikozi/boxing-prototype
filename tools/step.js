// Кто ведёт движение и скользит ли опорная стопа — по ЖИВОМУ циклу.
const { chromium } = require('./pw');
const FILE = process.argv[2] || 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const r=await p.evaluate(async ()=>{
    const out=[];
    for(const id of ['jab','uppercut','crossLand','kick','spinLand']){
      game='box'; mode='pvp'; newFight(); resetRing();
      phase='reveal'; revealDone=false; render(); paintRing();
      const rc={round:1,choices:[{id:id,lvl:'head'},{id:'block'}],
        out:[{type:'atk',dmg:ACT[id].dmg,mult:1,why:'',ok:true},{type:'def',dmg:0}],
        hp:[100,60],st:[70,80],ko:[false,false],
        before:{hp:[100,100],st:[100,100],pending:[null,null]}};
      const tr=[];
      playRound(rc,()=>{});
      await new Promise(res=>{ const tick=()=>{ if(!seq) return res();
        const J=B[0].J, f=B[0].face;
        tr.push({t:seq.t, w:performance.now(), таз:J.hip.x*f, перед:J.legs[0].foot.x*f, зад:J.legs[1].foot.x*f,
                 передY:FLOOR-J.legs[0].foot.y, задY:FLOOR-J.legs[1].foot.y,
                 // цели пружин: если цель стоит, а стопа едет — это скольжение
                 цП:B[0].foot[0].t*f, цЗ:B[0].foot[1].t*f});
        requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
      const s=tr[0];
      // ВПЕРЁД: первый момент, когда часть ушла к сопернику больше чем на 1.5
      const fwd=(key)=>{ for(const q of tr) if(q[key]-s[key]>1.5) return Math.round(q.t); return -1; };
      let slide=0, onFloor=0, mx=0;
      for(let i=1;i<tr.length;i++){
        for(const [kx,ky,kt] of [['перед','передY','цП'],['зад','задY','цЗ']]){
          const цельСтоит = Math.abs(tr[i][kt]-tr[i-1][kt]) < 0.05;
          if(tr[i][ky]<1.5 && tr[i-1][ky]<1.5 && цельСтоит){ onFloor++;
            // единицы в секунду: под нагрузкой кадр длиннее, и порог «за кадр» врал
            const dt=Math.max(1,tr[i].w-tr[i-1].w), v=Math.abs(tr[i][kx]-tr[i-1][kx])/dt*1000;
            if(v>15){ slide++; mx=Math.max(mx,v); } }
        }
      }
      const th=fwd('таз'), fo=fwd('перед');
      out.push({удар:id, таз:th, стопа:fo, стопа_первой:(fo>=0&&fo<=th),
                скольжение:+(slide/Math.max(1,onFloor)).toFixed(2), макс_скольж:+mx.toFixed(2)});
    }
    return out;
  });
  console.log('вперёд трогается:  таз / стопа. Скольжение = стопа едет, а цель стоит.');
  console.log('удар'.padEnd(12)+'таз, мс  стопа, мс  стопа первой  скольжение  макс, ед/с');
  let ok=true;
  // пороги из INVARIANTS.md: вертушка вперёд не шагает (стопы сходятся) — порядок не считается;
  // подшаг задней ноги у джеба и кросса частично настоящий: джеб ≤ 0.30, кросс ≤ 0.20, прочие ≤ 0.12
  const LIM={jab:0.15, crossLand:0.12};
  for(const x of r){ if((x.удар!=='spinLand' && !x.стопа_первой) || x.скольжение>(LIM[x.удар]||0.14)) ok=false;
    console.log(x.удар.padEnd(12)+String(x.таз).padStart(7)+String(x.стопа).padStart(10)+
      (x.стопа_первой?'          да':'         НЕТ')+String(x.скольжение).padStart(12)+
      String(x.макс_скольж).padStart(10)); }
  console.log(ok?'✔ стопа ведёт, опора не скользит':'✖ есть отклонения', ' ошибок:', errs.length, errs.slice(0,2));
  await b.close();
})();
