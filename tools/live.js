// ЖИВАЯ проверка: настоящий playRound через frame() и requestAnimationFrame,
// без settle(). Меряет ровно то, на что жаловался пользователь.
const { chromium } = require('./pw');
const FILE = process.argv[2] || 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const r=await p.evaluate(async ()=>{
    const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
    const rec=(a,bId,dmgA,dmgB,extra)=>Object.assign({round:1,
      choices:[{id:a,lvl:'head'},{id:bId,lvl:'head'}],
      out:[{type:'atk',dmg:dmgA,mult:1,why:'',ok:true},
           dmgB>0?{type:'atk',dmg:dmgB,mult:1,why:'',ok:true}:{type:'def',dmg:0}],
      hp:[80,70],st:[70,80],ko:[false,false],
      before:{hp:[100,100],st:[100,100],pending:[null,null]}}, extra||{});
    const play=(rc)=>new Promise(res=>{ playRound(rc,()=>{});
      const tick=()=>{ if(!seq) return res(); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    const out={};
    // --- удар ногой в голову: стопа в момент попадания ---
    game='box'; mode='pvp'; newFight(); resetRing(); phase='reveal'; revealDone=false; render(); paintRing();
    { const rc=rec('kick','jab',32,20); const IMP=impactMs(rc);
      let footImp=null, head=null, footMax=0;
      playRound(rc,()=>{});
      await new Promise(res=>{ const tick=()=>{ if(!seq) return res();
        const f=B[0].J.legs[1].foot; footMax=Math.max(footMax, FLOOR-f.y);
        if(footImp===null && seq.t>=IMP){ footImp=FLOOR-f.y; head=FLOOR-B[1].J.head.y; }
        requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
      out.удар_ногой={стопа_при_попадании:+footImp.toFixed(1), голова_соперника:+head.toFixed(1),
                     макс_подъём:+footMax.toFixed(1), ок: footImp >= head - HEAD_R - 2}; }
    // --- зазор передних стоп на тяжёлых разменах ---
    const gaps={};
    for(const [a,c] of [['jab','jab'],['crossLand','jab'],['spinLand','jab'],['kick','kick']]){
      newFight(); resetRing(); phase='reveal'; revealDone=false; render(); paintRing();
      let mn=1e9;
      playRound(rec(a,c,ACT[a].dmg,ACT[c].dmg),()=>{});
      await new Promise(res=>{ const tick=()=>{ if(!seq) return res();
        const g=(B[1].J.legs[0].foot.x-B[0].J.legs[0].foot.x)*B[0].face; mn=Math.min(mn,g);
        requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
      gaps[a+'/'+c]=+mn.toFixed(1);
    }
    out.мин_зазор_передних_стоп=gaps;
    out.ноги_не_скрещиваются=Object.values(gaps).every(v=>v>0);
    // --- победные позы ---
    for(const [pose,name] of [[0,'foot_arm'],[1,'foot_shrug']]){
      newFight(); resetRing(); phase='reveal'; revealDone=false; render(); paintRing();
      playRound(rec('cross','jab',60,0,{hp:[100,0],st:[10,10],ko:[false,true],win:{i:0,pose:pose},
                                       before:{hp:[100,60],st:[10,10],pending:[true,false]}}),()=>{});
      await wait(3400);
      const J=B[0].J, sh=Math.min(J.sh[0].y,J.sh[1].y);
      out[name]={поза:WIN_POSE[B[0].win?B[0].win.pose:pose].id,
        кисть1_выше_головы:+(J.head.y-J.arms[1].hand.y).toFixed(1),
        кисть0_выше_плеч:+(sh-J.arms[0].hand.y).toFixed(1),
        кисть1_выше_плеч:+(sh-J.arms[1].hand.y).toFixed(1)};
    }
    out.foot_arm.ок = out.foot_arm.кисть1_выше_головы > 0;
    out.foot_shrug.ок = out.foot_shrug.кисть0_выше_плеч > 0 && out.foot_shrug.кисть1_выше_плеч > 0;
    return out;
  });
  console.log(JSON.stringify(r,null,1));
  const ok = r.удар_ногой.ок && r.ноги_не_скрещиваются && r.foot_arm.ок && r.foot_shrug.ок;
  console.log(ok ? '✔ ЖИВОЙ ЦИКЛ ЧИСТ' : '✖ ЕСТЬ ДЕФЕКТЫ', ' ошибок:', errs.length, errs.slice(0,2));
  await b.close();
})();
