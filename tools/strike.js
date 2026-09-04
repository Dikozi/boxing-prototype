// Замер дуги, замаха и скорости суставов на всех ударах.
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
    const CASES=[['box','jab',0],['box','crossLand',0],['box','uppercut',0],['box','kick',1],['box','spinLand',1],
                 ['mma','gpunch',0],['mma','elbow',0],['mma','pound',0],['mma','cknee',1],['mma','upkick',1]];
    const out=[];
    for(const [g,id,limb] of CASES){
      game=g; mode='pvp'; pick=['wrestler','striker']; newFight(); resetRing();
      const A=ACT[id], gr=A.ground, cl=(id==='cknee');
      const pos = gr?'mount':(cl?'clinch':'stand'), top = gr?0:(cl?0:-1);
      setRP(pos, top, null);
      for(let n=0;n<160;n++){ driveIdle(); settle(1/60); }
      const rec={round:1,choices:[{id:id,lvl:'head'},{id:'block'}],
        out:[{type:'atk',dmg:A.dmg,mult:1,why:'',ok:true,note:''},{type:'def',dmg:0}],
        tired:[false,false],
        before:{hp:[100,100],st:[100,100],pending:[null,null],winded:[false,false],
                pos:pos,top:top,ctrl:0,sub:null,turned:[false,false]},
        hp:[100,80],st:[80,90],winded:[false,false],ko:[false,false],mma:(g==='mma'),
        after:{pos:pos,top:top,ctrl:0,sub:null}};
      rec._air=[airPoint(0,rec),airPoint(1,rec)];
      const B0=B[0];
      const IMP = (typeof impactMs==='function') ? impactMs(rec) : T_IMPACT;
      const pt=()=> limb ? B0.J.legs[1].foot : B0.J.arms[1].hand;
      const aim=()=> ({x:B[1].J.head.x, y:B[1].J.head.y});
      const path=[]; let prev=null, flips=0, maxRate=0, d0=null, back=0;
      for(let t=0;t<=IMP+40;t+=16){
        driveActor(0,t,rec); driveActor(1,t,rec); settle(1/60);
        const q=pt(); path.push({x:q.x,y:q.y});
        // замах меряем честно: насколько конечность УДАЛИЛАСЬ от цели против старта
        const a=aim(), dd=Math.hypot(q.x-a.x, q.y-a.y);
        if(d0===null) d0=dd; else back=Math.max(back, dd-d0);
        const J=B0.J;
        const cur=[ang(J.arms[0].sh,J.arms[0].el,J.arms[0].hand),
                   ang(J.arms[1].sh,J.arms[1].el,J.arms[1].hand),
                   ang(J.legs[0].hip,J.legs[0].knee,J.legs[0].foot),
                   ang(J.legs[1].hip,J.legs[1].knee,J.legs[1].foot)];
        if(prev) for(let k=0;k<4;k++){
          if(Math.sign(prev[k])!==Math.sign(cur[k]) && Math.abs(prev[k])>0.12 && Math.abs(cur[k])>0.12) flips++;
          maxRate=Math.max(maxRate, Math.abs(cur[k]-prev[k])*180/Math.PI);
        }
        prev=cur;
      }
      const s=path[0], e=path[path.length-1];
      const L=Math.hypot(e.x-s.x,e.y-s.y)||1, ux=(e.x-s.x)/L, uy=(e.y-s.y)/L;
      let dev=0, plen=0;
      for(let q=0;q<path.length;q++){ const px=path[q].x-s.x, py=path[q].y-s.y;
        dev=Math.max(dev, Math.abs(px*uy-py*ux));
        if(q) plen+=Math.hypot(path[q].x-path[q-1].x, path[q].y-path[q-1].y); }
      out.push({бой:g, удар:id, урон:A.dmg, имп:IMP, путь:+L.toFixed(1),
                извив:+(plen/L).toFixed(2), дуга:+(dev/L).toFixed(3), замах:+back.toFixed(1),
                перескоки:flips, макс:+maxRate.toFixed(0)});
    }
    return out;
  });
  console.log('извив = длина пути / прямое расстояние (1.0 = линейка)');
  console.log('удар'.padEnd(18)+'урон  имп   путь  извив   дуга  замах  скачки  °/кадр');
  for(const x of r) console.log((x.бой+'/'+x.удар).padEnd(18)+String(x.урон).padStart(4)+
    String(x.имп).padStart(5)+String(x.путь).padStart(7)+String(x.извив).padStart(7)+
    String(x.дуга).padStart(7)+String(x.замах).padStart(7)+String(x.перескоки).padStart(7)+
    String(x.макс).padStart(8));
  console.log('ошибок:', errs.length, errs.slice(0,2));
  await b.close();
})();
