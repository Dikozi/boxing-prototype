// Звук числом: офлайн-рендер синтеза. Удар должен быть плотным (много низа,
// мало «щёлканья»), хруст — очередью щелчков. На слух здесь никто не проверяет.
const { chromium } = require('./pw');
const FILE = process.argv[2] || 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext()).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto(FILE);
  const r=await p.evaluate(async ()=>{
    async function render(fn, secs){
      const off=new OfflineAudioContext(1, Math.ceil(44100*secs), 44100);
      audioSetup(off); if(crowdGain) crowdGain.gain.value=0; musBus.gain.value=0;
      fn(); const buf=await off.startRendering(); return buf.getChannelData(0);
    }
    function metrics(x){
      const n=x.length; let peak=0; for(let i=0;i<n;i++) peak=Math.max(peak,Math.abs(x[i]));
      let last=0; for(let i=0;i<n;i++) if(Math.abs(x[i])>peak*.01) last=i;
      const act=x.subarray(0,last+1); let rms=0; for(let i=0;i<act.length;i++) rms+=act[i]*act[i]; rms=Math.sqrt(rms/Math.max(1,act.length));
      // однополюсный lowpass 300 Гц — доля низа
      const a=1-Math.exp(-2*Math.PI*300/44100); let y=0, lo=0; for(let i=0;i<act.length;i++){ y+=a*(act[i]-y); lo+=y*y; } lo=Math.sqrt(lo/Math.max(1,act.length));
      let zc=0; for(let i=1;i<act.length;i++) if((act[i]>=0)!==(act[i-1]>=0)) zc++;
      // огибающая для щелчков: пики выше −12 дБ, не ближе 8 мс, в первых 120 мс
      const w=Math.round(44100*.002), env=[]; for(let i=0;i<Math.min(n,44100*.12);i+=w){ let m=0; for(let j=i;j<i+w&&j<n;j++) m=Math.max(m,Math.abs(x[j])); env.push(m); }
      let peaks=0, lastP=-99; for(let i=1;i<env.length-1;i++) if(env[i]>=env[i-1]&&env[i]>env[i+1]&&env[i]>peak*.25&&(i-lastP)*w>=44100*.008){ peaks++; lastP=i; }
      return {пик:+peak.toFixed(2), длит_с:+(last/44100).toFixed(2), низ:+(lo/Math.max(1e-6,rms)).toFixed(2), zcr:Math.round(zc/Math.max(1e-3,act.length/44100)), щелчков:peaks};
    }
    const out={};
    out['удар 1.0']=metrics(await render(()=>sndHit(1), 1.2));
    out['удар 0.4']=metrics(await render(()=>sndHit(.4), 1.2));
    out['удар корпус']=metrics(await render(()=>sndHit(1,true), 1.2));
    out['хруст']=metrics(await render(()=>sndCrack(1), .8));
    out['перелом']=metrics(await render(()=>sndSnap(), .8));
    return out;
  });
  for(const k in r) console.log(k.padEnd(13), JSON.stringify(r[k]));
  const h=r['удар 1.0'], c=r['хруст'];
  const ok = h.пик>=.35 && h.пик<=.98 && h.длит_с<=.9 && h.низ>=.5 && h.zcr<=1400
          && r['удар 0.4'].пик<h.пик && r['удар корпус'].низ>=h.низ
          && c.щелчков>=3 && c.zcr>=2*h.zcr && c.длит_с<=.5 && c.пик>=.3;
  console.log(ok?'✔ звук: удар плотный, хруст — очередь щелчков':'✖ звук: вне порогов', ' ошибок:', errs.length, errs.slice(0,2));
  await b.close();
})();
