const { chromium } = require('./pw');
const FILE = 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
  const p=await (await b.newContext({viewport:{width:307,height:557},deviceScaleFactor:3,isMobile:true})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  await p.evaluate(()=>{audioTouch(); phase='reveal';revealDone=false;paintRing();});
  await p.waitForTimeout(700);
  const out={};
  for (const [name, tier] of [['выключено',0],['ступень_1_без_свечения',1],['ступень_2_полная',2]]){
    out[name] = await p.evaluate(async (t)=>{
      FW_MS = 1e9;                                  // сторож не мешает замеру
      film = t > 0; filmTier = t;
      resetRing();
      const rec={round:1,choices:[{id:'crossLand'},{id:'block'}],
        out:[{type:'atk',dmg:50,mult:1,why:''},{type:'def',dmg:0}],
        hp:[100,0],st:[10,10],ko:[false,true],before:{hp:[100,50],st:[10,10],pending:[true,false]}};
      B[0].charge=true; for(let i=0;i<20;i++){driveIdle();settle(1/60);}
      const fr=[]; let last=performance.now();
      playRound(rec,()=>{});
      await new Promise(res=>{const c=()=>{const n=performance.now(); fr.push(n-last); last=n;
        if(!seq) return res(); requestAnimationFrame(c);}; requestAnimationFrame(c);});
      fr.sort((a,b)=>a-b);
      return {медиана:+fr[fr.length>>1].toFixed(1), p95:+fr[Math.floor(fr.length*.95)].toFixed(1),
              fps:Math.round(1000/fr[fr.length>>1])};
    }, tier);
  }
  console.log('нокдаун-раунд со звуком, 307x557@3x (программный растеризатор, GPU нет):');
  console.log(JSON.stringify(out,null,1));
  console.log('ошибок:', errs.length, errs);
  await b.close();
})();
