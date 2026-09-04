const { chromium } = require('./pw');
const FILE = 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch();
  const VPS = [[320,568,'iPhone SE'],[360,640,'Android'],[390,844,'iPhone 14'],[412,915,'Pixel'],
               [1366,768,'ноутбук'],[1920,1080,'десктоп'],[3440,1440,'ультраширокий']];
  const CASES = [['stand',-1,0],['clinch',0,0],['guard',1,0],['guard',1,1],['side',1,0],['side',1,1],
                 ['mount',1,0],['mount',1,1],['back',1,0],['back',1,1],['sub',1,0],['sub',1,1]];
  let bad = 0;
  for (const [w,h,nm] of VPS){
    const p = await (await b.newContext({viewport:{width:w,height:h}})).newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(''+e));
    await p.goto(FILE);
    const rows = [];
    // экран выбора бойца
    await p.evaluate(()=>{ game='mma'; mode='pvp'; pick=['allrnd','allrnd']; newFight(); active=0; phase='pick'; render(); });
    rows.push(await p.evaluate(()=>({ c:'выбор бойца', n:document.querySelectorAll('[data-arch]').length,
      ov:document.documentElement.scrollWidth>window.innerWidth,
      cut:[...document.querySelectorAll('[data-arch]')].some(e=>{const r=e.getBoundingClientRect();
           return r.right>window.innerWidth+1||r.width<40;}) })));
    for (const [pos,top,who] of CASES){
      const r = await p.evaluate(([pos,top,who])=>{
        game='mma'; mode='pvp'; pick=['wrestler','striker']; newFight();
        if(pos==='sub'){ GR.pos='mount'; GR.top=1; GR.sub={by:1,kind:'armbar',tight:2}; }
        else { GR.pos=pos; GR.top=top; }
        setRP(GR.pos,GR.top); active=who; phase='choose'; render();
        const want = legal(who);
        const got = [...document.querySelectorAll('[data-pick]')].map(e=>e.dataset.pick);
        const btn = [...document.querySelectorAll('.act')];
        const panel = document.getElementById('panel').getBoundingClientRect();
        let clipped = 0, narrow = 0;
        btn.forEach(e=>{ const q=e.getBoundingClientRect();
          if(q.right>window.innerWidth+1||q.left<-1) clipped++;
          if(q.width<40||q.height<28) narrow++; });
        return { c:pos+'/'+(top===who?'верх':'низ'), want:want.length, got:got.length,
                 miss:want.filter(x=>got.indexOf(x)<0).join(','),
                 ov:document.documentElement.scrollWidth>window.innerWidth,
                 clipped, narrow,
                 scroll:document.getElementById('panel').scrollHeight>Math.ceil(panel.height)+1 };
      }, [pos,top,who]);
      rows.push(r);
    }
    const fails = rows.filter(r=>r.ov||r.clipped||r.narrow||r.cut||(r.miss&&r.miss.length));
    bad += fails.length;
    console.log(`${nm} ${w}x${h}: ${fails.length?'✖ '+JSON.stringify(fails):'✔ все ' + rows.length + ' экранов чисто'}` +
                (errs.length?'  ОШИБКИ '+errs.join('|'):''));
    await p.close();
  }
  console.log(bad? '=== ПРОБЛЕМ: '+bad : '=== ВЁРСТКА ЧИСТА НА ВСЕХ ЭКРАНАХ');
  await b.close();
})();
