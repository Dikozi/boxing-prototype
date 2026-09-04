const { chromium } = require('./pw');
const tag = process.argv[2] || 'before';
const FILE = process.argv[3] || 'file://' + require('path').resolve(__dirname, '..', 'index.html');
const OUT = require('path').join(__dirname, '.out'); require('fs').mkdirSync(OUT, {recursive:true});
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const CASES = [['stand',-1],['clinch',0],['guard',1],['side',1],['mount',1],['back',1]];
  for (const [pos,top] of CASES){
    await p.evaluate(([pos,top])=>{
      game='mma'; mode='pvp'; pick=['wrestler','striker']; newFight(); resetRing();
      GR.pos=pos; GR.top=top; setRP(pos,top);
      phase='reveal'; revealDone=false; lastRec=null; render(); paintRing();
      for(let n=0;n<220;n++){ driveIdle(); settle(1/60); }
    },[pos,top]);
    await p.waitForTimeout(420);
    const y = (pos==='stand'||pos==='clinch') ? 150 : 230;
    await p.screenshot({path:`${OUT}/${tag}-${pos}.png`, clip:{x:0,y:y,width:390,height:300}});
  }
  // победная поза
  await p.evaluate(()=>{
    game='mma'; mode='pvp'; pick=['wrestler','striker']; newFight(); resetRing();
    setRP('stand',-1); phase='reveal'; revealDone=false; lastRec=null; render(); paintRing();
    B[1].down=true; drawOrder=[1,0];
    for(let n=0;n<160;n++){ driveIdle(); settle(1/60); }
    B[0].win={pose:0,t:900};
    for(let n=0;n<260;n++){ driveIdle(); settle(1/60); }
  });
  await p.waitForTimeout(420);
  await p.screenshot({path:`${OUT}/${tag}-win.png`, clip:{x:0,y:150,width:390,height:340}});
  console.log(tag, 'снято, ошибок:', errs.length||0);
  await b.close();
})();
