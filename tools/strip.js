// Покадровая лента по ЖИВОМУ циклу: настоящий playRound через frame() и rAF.
// Ленты в обход цикла (через settle) не показали бы прибитых ног.
const { chromium } = require('./pw');
const FILE = process.argv[2] || 'file://' + require('path').resolve(__dirname, '..', 'index.html');
const OUT = require('path').join(__dirname, '.out'); require('fs').mkdirSync(OUT, {recursive:true});
const ID   = process.argv[3] || 'kick';       // удар, либо win:0 / win:1 — победная поза
const TAG  = process.argv[4] || 'now';
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:900,height:900},deviceScaleFactor:1})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const info = await p.evaluate(async (id)=>{
    game='box'; mode='pvp'; newFight(); resetRing();
    phase='reveal'; revealDone=false; render(); paintRing();
    ring.classList.add('full'); fitCanvas();
    if(typeof film!=='undefined'){ film=false; filmTier=0; }
    await new Promise(r=>setTimeout(r,250));
    const win = id.indexOf('win:')===0 ? +id.slice(4) : -1;
    const A = win>=0 ? ACT.cross : ACT[id];
    const rec = win>=0
      ? {round:1,choices:[{id:'cross',lvl:'head'},{id:'jab',lvl:'head'}],
         out:[{type:'atk',dmg:60,mult:1,why:'',ok:true},{type:'def',dmg:0}],
         hp:[100,0],st:[10,10],ko:[false,true],win:{i:0,pose:win},
         before:{hp:[100,60],st:[10,10],pending:[true,false]}}
      : {round:1,choices:[{id:id,lvl:'head'},{id:'block'}],
         out:[{type:'atk',dmg:A.dmg,mult:1,why:'',ok:true},{type:'def',dmg:0}],
         hp:[100,80],st:[80,90],ko:[false,false],before:{hp:[100,100],st:[100,100],pending:[null,null]}};
    const IMP = impactMs(rec);
    const N=8, shots=[];
    // расписание снимков: удар — до попадания; победа — по ходу сцены
    const times = win>=0 ? [1500,2000,2400,2800,3200,3600,4000,4400]
                         : Array.from({length:N},(_,k)=>Math.round(k*IMP/(N-1)));
    playRound(rec,()=>{});
    let k=0;
    await new Promise(res=>{ const tick=()=>{
      while(k<times.length && (seq?seq.t:1e9)>=times[k]){ shots.push(cv.toDataURL('image/png')); k++; }
      if(k>=times.length || (!seq && win<0)) return res();
      if(!seq && win>=0){ shots.push(cv.toDataURL('image/png')); k++; if(k>=times.length) return res(); }
      requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    while(shots.length<N) shots.push(shots[shots.length-1]);
    const sheet=document.createElement('canvas'), sc=sheet.getContext('2d');
    const w=cv.width, h=cv.height; sheet.width=w*2; sheet.height=h;
    return new Promise(res=>{ let done=0;
      shots.forEach((src,i)=>{ const im=new Image(); im.onload=()=>{
        sc.drawImage(im,(i%4)*w/2,(i/4|0)*h/2,w/2,h/2);
        if(++done===shots.length){ document.body.innerHTML=''; document.body.style.margin='0';
          document.body.appendChild(sheet); res({imp:IMP,w:sheet.width,h:sheet.height}); } };
        im.src=src; }); });
  }, ID);
  await p.setViewportSize({width:Math.min(1600,info.w), height:Math.min(1200,info.h)});
  await p.screenshot({path:`${OUT}/live-${TAG}-${ID.replace(':','')}.png`});
  console.log(`${TAG}/${ID}: попадание ${info.imp}мс, лента ${info.w}x${info.h}, ошибок ${errs.length}`, errs.slice(0,1));
  await b.close();
})();
