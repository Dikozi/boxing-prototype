const { chromium } = require('./pw');
const FILE = 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const r = await p.evaluate(() => {
    game='klinch'; mode='pvp'; newFight(); resetRing();
    const acts=[['jab','head'],['jab','body'],['uppercut','head'],['kick','head'],['kick','body'],
                ['spin','head'],['spinLand','head'],['spinLand','body'],['cross',null],['crossLand',null],
                ['block',null],['slip',null],['step',null],['bblock',null]];
    const out=[]; let worstW=0, worstTop=1e9, worstBot=-1e9;
    for(const [id,lvl] of acts){
      newFight(); resetRing();
      const rec={round:1,choices:[{id,lvl},{id:'block'}],
        out:[{type:ACT[id].kind==='attack'?'atk':'def',dmg:ACT[id].kind==='attack'?30:0,mult:1,why:'',tired:false},{type:'def',dmg:0}],
        tired:[false,false],before:{hp:[100,100],st:[100,100],pending:[null,null],winded:[false,false]},
        hp:[100,70],st:[80,90],winded:[false,false],ko:[false,false]};
      rec._air=[airPoint(0,rec),airPoint(1,rec)];
      let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
      for(let t=0;t<=SEQ_END;t+=20){
        driveActor(0,t,rec); driveActor(1,t,rec); settle(1/60);
        const J=B[0].J, pts=[J.head,J.hip,J.neck];
        for(const k of [0,1]){ pts.push(J.arms[k].hand,J.arms[k].el,J.legs[k].foot,J.legs[k].knee); }
        for(const q of pts){ mnx=Math.min(mnx,q.x); mxx=Math.max(mxx,q.x); mny=Math.min(mny,q.y); mxy=Math.max(mxy,q.y); }
      }
      out.push({id:id+(lvl?'/'+lvl:''), w:+(mxx-mnx).toFixed(1), top:+mny.toFixed(1), bot:+mxy.toFixed(1)});
      worstW=Math.max(worstW,mxx-mnx); worstTop=Math.min(worstTop,mny); worstBot=Math.max(worstBot,mxy);
    }
    return {out, worstW:+worstW.toFixed(1), worstTop:+worstTop.toFixed(1), worstBot:+worstBot.toFixed(1),
            visW:125, stageH:STAGE_H, floor:FLOOR};
  });
  console.log('видимое поле: ширина', r.visW, ' высота сцены', r.stageH, ' настил', r.floor);
  console.log('самое размашистое движение: ширина', r.worstW, r.worstW<r.visW*0.62?'✔ помещается':'✖ ШИРОКО');
  console.log('верхняя точка', r.worstTop, r.worstTop>2?'✔ не срезается':'✖ ВЫШЕ КАДРА');
  console.log('нижняя точка', r.worstBot, r.worstBot<=r.floor+1.5?'✔ не проваливается':'✖ ПОД НАСТИЛОМ');
  r.out.sort((a,c)=>c.w-a.w).slice(0,5).forEach(x=>console.log('  ',x.id.padEnd(14),'ширина',x.w,'верх',x.top));
  console.log('ERRORS:', errs.length?errs.join('\n'):'none');
  await b.close();
})();
