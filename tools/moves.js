const { chromium } = require('./pw');
const FILE = 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const r = await p.evaluate(() => {
    game='mma'; mode='pvp';
    const CASES = [
      ['guard',1,0,'sweep'],['guard',1,0,'standup'],['guard',1,0,'tri'],['guard',1,0,'upkick'],
      ['guard',1,1,'pass'],['guard',1,1,'kimura'],['guard',1,1,'gpunch'],
      ['side',1,1,'tomount'],['side',1,1,'takeback'],['side',1,0,'reguard'],
      ['mount',1,0,'bridge'],['mount',1,0,'toguard'],['mount',1,1,'pound'],['mount',1,1,'armbar'],
      ['back',1,0,'shed'],['back',1,0,'spinout'],['back',1,1,'rnc'],
      ['clinch',0,0,'throw'],['clinch',0,0,'cknee'],['stand',-1,0,'shoot'],['stand',-1,0,'sprawl'],['stand',-1,0,'hook']
    ];
    const out = [];
    for(const [pos,top,who,id] of CASES){
      pick=['wrestler','striker']; newFight(); resetRing();
      GR.pos=pos; GR.top=top; setRP(pos,top);
      for(let n=0;n<200;n++){ driveIdle(); settle(1/60); }
      const A=ACT[id];
      const rec={round:1,choices:[{id:id},{id:'hold'}],
        out:[{type:A.kind==='attack'?'atk':(A.kind==='grap'?'grap':'def'),
              dmg:A.kind==='attack'?14:0, mult:1, why:'', tired:false, ok:true, note:''},{type:'def',dmg:0}],
        tired:[false,false],before:{hp:[100,100],st:[100,100],pending:[null,null],winded:[false,false],
                                    pos:pos,top:top,ctrl:0,sub:null,turned:[false,false]},
        hp:[100,90],st:[80,90],winded:[false,false],ko:[false,false],mma:true,
        after:{pos:pos,top:top,ctrl:0,sub:null}};
      if(who===1){ rec.choices=[{id:'hold'},{id:id}];
                   rec.out=[{type:'def',dmg:0}, rec.out[0]]; }
      rec._air=[airPoint(0,rec),airPoint(1,rec)];
      const b0=B[who];
      let hy0=b0.hy.x, hx0=b0.hx.x, ln0=b0.lean.x;
      let dHy=0,dHx=0,dLn=0,dTw=0,foot=0,hand=0;
      const h0=[b0.J.arms[0].hand.x,b0.J.arms[0].hand.y];
      for(let t=0;t<=SEQ_END;t+=16){
        driveActor(0,t,rec); driveActor(1,t,rec); settle(1/60);
        dHy=Math.max(dHy,Math.abs(b0.hy.x-hy0)); dHx=Math.max(dHx,Math.abs(b0.hx.x-hx0));
        dLn=Math.max(dLn,Math.abs(b0.lean.x-ln0)); dTw=Math.max(dTw,Math.abs(b0.twist.x));
        foot=Math.max(foot, FLOOR-Math.min(b0.J.legs[0].foot.y,b0.J.legs[1].foot.y));
        hand=Math.max(hand, Math.hypot(b0.J.arms[0].hand.x-h0[0], b0.J.arms[0].hand.y-h0[1]));
      }
      out.push({k:pos+'/'+(top===who?'верх':(top<0?'-':'низ'))+' '+id,
                таз:+dHy.toFixed(1), сдвиг:+dHx.toFixed(1), наклон:+dLn.toFixed(2),
                скрутка:+dTw.toFixed(2), нога:+foot.toFixed(1), рука:+hand.toFixed(1)});
    }
    return out;
  });
  const hdr='движение'.padEnd(24)+'таз  сдвиг наклон скрутка нога  рука';
  console.log(hdr); console.log('-'.repeat(hdr.length));
  const sig=new Set();
  for(const x of r){
    console.log(x.k.padEnd(24)+String(x.таз).padStart(4)+String(x.сдвиг).padStart(6)+
      String(x.наклон).padStart(7)+String(x.скрутка).padStart(8)+String(x.нога).padStart(6)+String(x.рука).padStart(6));
    sig.add([x.таз,x.сдвиг,x.наклон,x.скрутка,x.нога,x.рука].join(','));
  }
  console.log('различимых движений:', sig.size, 'из', r.length, sig.size===r.length?'✔ ни одно не повторяет другое':'✖ есть одинаковые');
  console.log('ERRORS:', errs.length?errs.slice(0,4).join('\n'):'none');
  await b.close();
})();
