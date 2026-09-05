// Тряпичная кукла: сгибаются ли локти и колени и не выворачиваются ли —
// по ЖИВОМУ циклу, по нарисованному скелету (под физикой это ragJ).
const { chromium } = require('./pw');
const FILE = process.argv[2] || 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const r=await p.evaluate(async ()=>{
    // стаггер (тяжёлый удар, здоровья много) и нокаут (здоровье кончается)
    const CASES=[['crossLand',50,'head',100],['kick',44,'head',100],['spinLand',58,'head',60],['crossLand',50,'head',48]];
    const ang=(a,b2,c)=>{ const ux=a.x-b2.x, uy=a.y-b2.y, vx=c.x-b2.x, vy=c.y-b2.y;
      return Math.acos(Math.max(-1,Math.min(1,(ux*vx+uy*vy)/(Math.hypot(ux,uy)*Math.hypot(vx,vy)+1e-9))))*180/Math.PI; };
    const out=[];
    for(const [id,dmg,lvl,hp] of CASES){
      game='box'; mode='pvp'; newFight(); resetRing();
      phase='reveal'; revealDone=false; render(); paintRing();
      const ko = hp-dmg<=0;
      const rc={round:1,choices:[{id:id,lvl:lvl},{id:'block'}],
        out:[{type:'atk',dmg:dmg,mult:1,why:'',ok:true},{type:'def',dmg:0}],
        hp:[100,Math.max(0,hp-dmg)],st:[70,80],ko:[false,ko],
        before:{hp:[100,hp],st:[100,100],pending:[null,null]}};
      const D=B[1]; let frames=0, rag=0, minE=180, maxE=0, minK=180, maxK=0, tip=0, prev=null;
      let straightE=0, straightK=0;
      playRound(rc,()=>{});
      await new Promise(res=>{ const tick=()=>{ if(!seq) return res();
        const J=D.drawJ || poseOf(D); frames++;
        // rd.t === 0: физика только что стартовала в конце этого же кадра, а нарисован ещё позный скелет
        if(D.rd && D.rd.t > 0){ rag++;
          for(let k=0;k<2;k++){
            const e=ang(J.arms[k].sh,J.arms[k].el,J.arms[k].hand), kn=ang(J.legs[k].hip,J.legs[k].knee,J.legs[k].foot);
            minE=Math.min(minE,e); maxE=Math.max(maxE,e); minK=Math.min(minK,kn); maxK=Math.max(maxK,kn);
            if(e>176) straightE++; if(kn>176) straightK++;
          }
        }
        if(prev){ for(let k=0;k<2;k++){ tip=Math.max(tip, Math.hypot(J.arms[k].hand.x-prev.arms[k].hand.x, J.arms[k].hand.y-prev.arms[k].hand.y),
                                                     Math.hypot(J.legs[k].foot.x-prev.legs[k].foot.x, J.legs[k].foot.y-prev.legs[k].foot.y)); } }
        prev=JSON.parse(JSON.stringify(J));
        requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
      out.push({удар:id, режим:ko?'нокаут':'стаггер', кадров_физики:rag, локоть_мин:+minE.toFixed(0), локоть_макс:+maxE.toFixed(0),
                колено_мин:+minK.toFixed(0), колено_макс:+maxK.toFixed(0), прямых_локтей:+(straightE/Math.max(1,rag*2)).toFixed(2),
                прямых_коленей:+(straightK/Math.max(1,rag*2)).toFixed(2), макс_скорость_конца:+tip.toFixed(1)});
    }
    return out;
  });
  console.log('углы в градусах (180 — прямая конечность); доля прямых — доля кадров физики с суставом > 176°');
  console.log('удар'.padEnd(11)+'режим    физ.кадров  локоть мин/макс  колено мин/макс  прямых Л/К  конец, ед/кадр');
  let ok=true;
  for(const x of r){
    const bend = x.локоть_мин<165 && x.колено_мин<165, safe = x.локоть_макс<=190 && x.колено_макс<=190 && x.локоть_мин>=20 && x.колено_мин>=20;
    if(x.кадров_физики>0 && !(bend&&safe)) ok=false;
    if(x.макс_скорость_конца>9) ok=false;
    console.log(x.удар.padEnd(11)+x.режим.padEnd(9)+String(x.кадров_физики).padStart(10)+
      (x.локоть_мин+'/'+x.локоть_макс).padStart(17)+(x.колено_мин+'/'+x.колено_макс).padStart(17)+
      (x.прямых_локтей+'/'+x.прямых_коленей).padStart(12)+String(x.макс_скорость_конца).padStart(10));
  }
  console.log(ok?'✔ кукла гнётся в суставах и не выворачивается':'✖ кукла: сустав не гнётся, выворачивается или конечность прыгает', ' ошибок:', errs.length, errs.slice(0,2));
  await b.close();
})();
