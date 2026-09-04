// Вход в клинч и выход из него — шагом, а не телепортом. ЖИВОЙ цикл.
// Порядок: стопа трогается раньше таза; нарисованный таз едет не быстрее 2 ед./кадр;
// стопа не дальше длины ноги от таза; приходит точно на метку.
const { chromium } = require('./pw');
const FILE = process.argv[2] || 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const r=await p.evaluate(async ()=>{
    const CASES=[['stand',-1,'clinchIn','clinch',0,0,'перед'],['clinch',0,'breakout','stand',-1,1,'зад']];
    const out=[];
    for(const [pos,top,id,pos2,top2,lead,name] of CASES){
      game='mma'; mode='pvp'; pick=['wrestler','striker']; newFight(); resetRing();
      GR.pos=pos; GR.top=top; setRP(pos,top);
      phase='reveal'; revealDone=false; render(); paintRing();
      for(let n=0;n<200;n++){ driveIdle(); settle(1/60); }
      const A=ACT[id];
      const rec={round:1,choices:[{id:id},{id:'hold'}],
        out:[{type:A.kind==='attack'?'atk':(A.kind==='grap'?'grap':'def'),dmg:0,mult:1,why:'',tired:false,ok:true,note:''},{type:'def',dmg:0}],
        tired:[false,false],before:{hp:[100,100],st:[100,100],pending:[null,null],winded:[false,false],pos:pos,top:top,ctrl:0,sub:null,turned:[false,false]},
        hp:[100,100],st:[80,90],winded:[false,false],ko:[false,false],mma:true,after:{pos:pos2,top:top2,ctrl:0,sub:null}};
      rec._air=[airPoint(0,rec),airPoint(1,rec)];
      const tr=[]; const F0=B[0], f=F0.face;
      playRound(rc=rec,()=>{});
      await new Promise(res=>{ const tick=()=>{ if(!seq) return res();
        const J=F0.drawJ||poseOf(F0), o=F0.J;
        let reach=0; for(let k=0;k<2;k++) reach=Math.max(reach, Math.hypot(J.legs[k].foot.x-J.legs[k].hip.x, J.legs[k].foot.y-J.legs[k].hip.y));
        tr.push({t:seq.t, tk:RP.tk, pos:RP.pos, base:F0.base, таз:J.hip.x, стопа:J.legs[lead].foot.x*f, стопаY:FLOOR-J.legs[lead].foot.y, reach});
        requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
      const s=tr[0]; let tFoot=-1, tBase=-1, dBase=0, mReach=0, lift=0;
      for(let i=1;i<tr.length;i++){ const q=tr[i];
        if(tFoot<0 && Math.abs(q.стопа-s.стопа)>1.5) tFoot=Math.round(q.t);
        if(tBase<0 && Math.abs(q.таз-s.таз)>1.5) tBase=Math.round(q.t);   // нарисованный таз, как и стопа
        dBase=Math.max(dBase, Math.abs(q.таз-tr[i-1].таз));   // нарисованный таз: база — внутренняя величина
        mReach=Math.max(mReach,q.reach); lift=Math.max(lift,q.стопаY); }
      const target = pos2==='clinch' ? GCX-11*f : POS[0];
      out.push({переход:pos+'>'+pos2, ведёт:name, стопа_мс:tFoot, таз_мс:tBase, таз_макс_за_кадр:+dBase.toFixed(2),
                таз_стопа_макс:+mReach.toFixed(1), нога:LEG_REACH, подъём:+lift.toFixed(1), база_в_конце:+F0.base.toFixed(1), цель:+target.toFixed(1), сдвиг:+(F0.base-s.base).toFixed(1)});
    }
    return out;
  });
  let ok=true;
  for(const x of r){ console.log(JSON.stringify(x));
    if(!(x.стопа_мс>=0 && x.стопа_мс<=x.таз_мс) || x.таз_макс_за_кадр>2 || x.таз_стопа_макс>x.нога+0.5 || Math.abs(x.база_в_конце-x.цель)>0.5) ok=false; }
  console.log(ok?'✔ клинч: шаг навстречу и назад, база едет за стопой':'✖ клинч: телепорт или стопа за пределом ноги', ' ошибок:', errs.length, errs.slice(0,2));
  await b.close();
})();
