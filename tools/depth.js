// Глубина: кости держат длину в пространстве, удары вокруг корпуса идут по z,
// слой бьющей конечности в контакте выше слоя корпуса. ЖИВОЙ цикл, нарисованный скелет.
const { chromium } = require('./pw');
const FILE = process.argv[2] || 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const r=await p.evaluate(async ()=>{
    const d3=(a,c)=>Math.hypot(a.x-c.x, a.y-c.y, (a.z||0)-(c.z||0));
    const out={};
    for(const id of ['jab','hook','crossLand','kick','spinLand']){
      game='box'; mode='pvp'; newFight(); resetRing();
      phase='reveal'; revealDone=false; render(); paintRing();
      const rc={round:1,choices:[{id:id,lvl:'head'},{id:'block'}],
        out:[{type:'atk',dmg:ACT[id].dmg,mult:1,why:'',ok:true},{type:'def',dmg:0}],
        hp:[100,60],st:[70,80],ko:[false,false],before:{hp:[100,100],st:[100,100],pending:[null,null]}};
      const A=B[0]; let boneErr=0, handZAtHit=null, layerOk=null, footZmin=99, footZmax=-99, shDy=null, handZmax=-99, hookLayer=null;
      const lead = (id==='jab'||id==='hook') ? 0 : 1;
      playRound(rc,()=>{});
      await new Promise(res=>{ const tick=()=>{ if(!seq) return res();
        const J=A.drawJ||poseOf(A);
        for(let k=0;k<2;k++){
          boneErr=Math.max(boneErr, Math.abs(d3(J.arms[k].sh,J.arms[k].el)-UPARM), Math.abs(d3(J.arms[k].el,J.arms[k].hand)-FOREARM),
                           Math.abs(d3(J.legs[k].hip,J.legs[k].knee)-THIGH), Math.abs(d3(J.legs[k].knee,J.legs[k].foot)-SHIN));
        }
        footZmin=Math.min(footZmin, J.legs[1].foot.z||0); footZmax=Math.max(footZmax, J.legs[1].foot.z||0);
        const hz=J.arms[lead].hand.z||0;
        if(hz>handZmax){ handZmax=hz; const l2=[]; boxerParts(A, l2); const t2=l2.find(e=>e.name==='torso'), a2=l2.find(e=>e.name==='nearArm'); hookLayer = !!(t2&&a2&&a2.z>t2.z); }
        if(shDy===null){ const PJ=projJ(J); shDy=PJ.sh[0].y-PJ.sh[1].y; }
        if(handZAtHit===null && seq.t>=seq.imp){
          handZAtHit=J.arms[lead].hand.z||0;
          const list=[]; boxerParts(A, list);
          const torso=list.find(e=>e.name==='torso'), arm=list.find(e=>e.name===(lead===0?'nearArm':'farArm')), leg=list.find(e=>e.name==='farLeg');
          layerOk = (id==='crossLand') ? (arm && torso && arm.z>torso.z) : (id==='kick' ? (leg && torso && leg.z>torso.z) : true);
        }
        requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
      out[id]={кости_макс_ошибка:+boneErr.toFixed(3), z_кулака_в_контакте:+handZAtHit.toFixed(1), слой_выше_корпуса:layerOk,
               z_стопы_мин:+footZmin.toFixed(1), z_стопы_макс:+footZmax.toFixed(1), плечи_dy_экран:+shDy.toFixed(2),
               z_кулака_макс:+handZmax.toFixed(1), рука_над_корпусом_в_размахе:hookLayer};
    }
    return out;
  });
  for(const k in r) console.log(k.padEnd(10), JSON.stringify(r[k]));
  const ok = Object.values(r).every(x=>x.кости_макс_ошибка<=0.05)
    && Math.abs(r.crossLand.z_кулака_в_контакте)<=1.5 && r.crossLand.слой_выше_корпуса===true
    && r.kick.z_стопы_макс>=4 && r.kick.слой_выше_корпуса===true
    && r.spinLand.z_стопы_мин<=-4
    && r.hook.z_кулака_макс>=4 && Math.abs(r.hook.z_кулака_в_контакте)<=2.5 && r.hook.рука_над_корпусом_в_размахе===true
    && r.jab.плечи_dy_экран>0.5;
  console.log(ok?'✔ глубина: кости целы в пространстве, кросс к линии удара, хук вокруг корпуса, нога перед корпусом, вертушка за ним':'✖ глубина: вне порогов', ' ошибок:', errs.length, errs.slice(0,2));
  await b.close();
})();
