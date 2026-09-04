// Реакция на пропущенный удар: замер по ЖИВОМУ циклу.
const { chromium } = require('./pw');
const FILE = process.argv[2] || 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const r=await p.evaluate(async ()=>{
    const CASES=[['jab',20,'head'],['uppercut',32,'head'],['crossLand',50,'head'],
                 ['spinLand',58,'head'],['kick',32,'body'],['jab',20,'body']];
    const out=[];
    for(const [id,dmg,lvl] of CASES){
      game='box'; mode='pvp'; newFight(); resetRing();
      phase='reveal'; revealDone=false; render(); paintRing();
      const rc={round:1,choices:[{id:id,lvl:lvl},{id:'block'}],
        out:[{type:'atk',dmg:dmg,mult:1,why:'',ok:true},{type:'def',dmg:0}],
        hp:[100,100-dmg],st:[70,80],ko:[false,false],
        before:{hp:[100,100],st:[100,100],pending:[null,null]}};
      const D=B[1]; let h0=null, ln0=null, away=0, toward=0, lean=0, rag=false;
      playRound(rc,()=>{});
      await new Promise(res=>{ const tick=()=>{ if(!seq) return res();
        const J=D.drawJ || poseOf(D);        // НАРИСОВАННЫЙ скелет: под физикой это ragJ
        if(h0===null){ h0=J.head.x; ln0=D.lean.x; }
        if(D.rd) rag=true;
        const a=(J.head.x-h0)*B[0].face;
        away=Math.max(away,a); toward=Math.min(toward,a);
        lean=Math.max(lean, Math.abs(D.lean.x-ln0));
        requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
      out.push({удар:id, уровень:lvl, урон:dmg, голова_от:+away.toFixed(1),
                голова_навстречу:+toward.toFixed(1), наклон:+lean.toFixed(2), рагдолл:rag});
    }
    return out;
  });
  console.log('удар'.padEnd(20)+'урон  голова ОТ  навстречу  наклон  рагдолл');
  for(const x of r) console.log((x.удар+'/'+x.уровень).padEnd(20)+String(x.урон).padStart(4)+
    String(x.голова_от).padStart(11)+String(x.голова_навстречу).padStart(11)+
    String(x.наклон).padStart(8)+(x.рагдолл?'   да':'   нет'));
  console.log('ошибок:', errs.length, errs.slice(0,2));
  await b.close();
})();
