// Нокаут: падение должно быть ВИДНО — начинаться после панели, а не под ней.
const { chromium } = require('./pw');
const FILE = process.argv[2] || 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const r=await p.evaluate(async ()=>{
    const ang=(a,b2,c)=>{ const ux=a.x-b2.x, uy=a.y-b2.y, vx=c.x-b2.x, vy=c.y-b2.y;
      return Math.acos(Math.max(-1,Math.min(1,(ux*vx+uy*vy)/(Math.hypot(ux,uy)*Math.hypot(vx,vy)+1e-9))))*180/Math.PI; };
    game='box'; mode='pvp'; newFight(); resetRing();
    phase='reveal'; revealDone=false; render(); paintRing();
    const rc={round:1,choices:[{id:'crossLand',lvl:'head'},{id:'step'}],
      out:[{type:'atk',dmg:50,mult:1,why:'',ok:true},{type:'def',dmg:0}],
      hp:[100,0],st:[70,20],ko:[false,true],before:{hp:[100,49],st:[100,40],pending:[null,null]}};
    const D=B[1], tr=[];
    playRound(rc,()=>{});
    await new Promise(res=>{ const tick=()=>{ if(!seq) return res();
      const J=D.drawJ||poseOf(D);
      let e=180; for(let k=0;k<2;k++) e=Math.min(e, ang(J.arms[k].sh,J.arms[k].el,J.arms[k].hand), ang(J.legs[k].hip,J.legs[k].knee,J.legs[k].foot));
      tr.push({t:seq.t, cut:cut?cut.id:'', rd:!!D.rd, wait:!!D.koWait, down:!!D.down, hurt:!!D.hurt, ang:e, hipY:FLOOR-J.hip.y});
      requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    const firstRd=tr.findIndex(q=>q.rd), lastPanel=tr.map((q,i)=>q.cut?i:-1).filter(i=>i>=0).pop();
    const visible=tr.filter(q=>!q.cut && q.rd).length, hidden=tr.filter(q=>q.cut && q.rd).length;
    const waitFrames=tr.filter(q=>q.wait).length, hurtUnderPanel=tr.filter(q=>q.cut && q.wait && q.hurt).length;
    const minAng=Math.min(...tr.filter(q=>!q.cut && q.rd).map(q=>q.ang), 180);
    const last=tr[tr.length-1];
    return {кадров:tr.length, панель_до_кадра:lastPanel, физика_с_кадра:firstRd, падение_видно_кадров:visible, падение_под_панелью_кадров:hidden,
            ждал_кадров:waitFrames, реакция_под_панелью:hurtUnderPanel, мин_угол_в_падении:+minAng.toFixed(0), лежит_в_конце:last.down && last.hipY<8, таз_в_конце:+last.hipY.toFixed(1)};
  });
  console.log(JSON.stringify(r));
  const ok = r.физика_с_кадра>r.панель_до_кадра && r.падение_видно_кадров>=20 && r.падение_под_панелью_кадров===0 && r.реакция_под_панелью>0 && r.лежит_в_конце;
  console.log(ok?'✔ нокаут: падение после панели, на виду':'✖ нокаут: падение скрыто панелью или не состоялось', ' ошибок:', errs.length, errs.slice(0,2));
  await b.close();
})();
