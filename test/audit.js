const fs=require('fs');
const path=require('path');
const HTML=path.join(__dirname,'..','index.html');
const html=fs.readFileSync(HTML,'utf8');
const code=html.match(/<script>([\s\S]*)<\/script>/)[1];

function makeCtx(){const s={fillStyle:'',strokeStyle:'',lineWidth:1,globalAlpha:1,globalCompositeOperation:'',font:'',textAlign:'',textBaseline:'',filter:''};const g={addColorStop(){}};
  return new Proxy(s,{get(t,p){if(p in t)return t[p];if(p==='createRadialGradient'||p==='createLinearGradient')return()=>g;if(p==='measureText')return()=>({width:8});if(p==='getImageData')return()=>({data:new Uint8ClampedArray(4)});return()=>{};},set(t,p,v){t[p]=v;return true;}});}
let cn=0;
function makeEl(id){const handlers={};let _text='',_html='';const el={id:id||('el'+cn++),style:{},dataset:{},_h:handlers,_attrs:{},_children:[],value:'',
  get textContent(){return _text;}, set textContent(v){_text=String(v);},
  get innerHTML(){return _html;}, set innerHTML(v){_html=v; el._children=[];},
  classList:{_s:new Set(),add(c){this._s.add(c);},remove(c){this._s.delete(c);},toggle(c,f){if(f===undefined){this._s.has(c)?this._s.delete(c):this._s.add(c);}else f?this._s.add(c):this._s.delete(c);},contains(c){return this._s.has(c);}},
  setAttribute(n,v){el._attrs[n]=String(v);}, getAttribute(n){return el._attrs[n]||null;}, appendChild(c){el._children.push(c);},
  addEventListener(t,fn){(handlers[t]||(handlers[t]=[])).push(fn);}, dispatch(t,e){(handlers[t]||[]).forEach(fn=>fn(e||{}));}, hasH(t){return!!(handlers[t]&&handlers[t].length);},
  setPointerCapture(){}, getContext(){if(!el._ctx)el._ctx=makeCtx();return el._ctx;}, width:300,height:150};
  return el;}
const byId={};
const segButtons=['fp32','fp16','int8','int4'].map(k=>{const b=makeEl('seg-'+k);b.dataset.k=k;return b;});
const document={getElementById(id){return byId[id]||(byId[id]=makeEl(id));},createElement(){return makeEl();},
  querySelectorAll(sel){const a=sel==='#seg button'?segButtons.slice():[];a.forEach=Array.prototype.forEach.bind(a);return a;},body:makeEl('body')};
let t=0;const raf=[];
global.requestAnimationFrame=cb=>{raf.push(cb);return raf.length;};
global.performance={now:()=>t}; global.devicePixelRatio=2; global.innerWidth=1280; global.innerHeight=800;
global.addEventListener=()=>{}; global.setTimeout=fn=>{fn();return 0;}; global.clearTimeout=()=>{}; global.document=document;
function step(n){for(let i=0;i<n;i++){t+=16;const cb=raf.shift();if(cb)cb(t);}}

try{eval(code);}catch(e){console.log('INIT ERROR:',e.message);process.exit(1);}
step(30);

const R=[]; const ok=(n,c)=>R.push([c?'PASS':'FAIL',n]);
function click(id){byId[id]&&byId[id].dispatch('click',{});}
function aria(id){return byId[id]&&byId[id]._attrs['aria-pressed'];}

// 1) existence + handler for every interactive control
const buttons=['introTour','introExplore','causal','head','attn','zout','zin','lbl','focus','tour-btn','about','glow','pause','reset','help','helpclose','aboutclose','tprev','tnext','texit'];
buttons.forEach(id=>ok('exists+click: '+id, byId[id] && byId[id].hasH('click')));
['prompt','rate','dens','temp'].forEach(id=>ok('exists+input: '+id, byId[id] && byId[id].hasH('input')));
segButtons.forEach(b=>ok('seg click: '+b.dataset.k, b.hasH('click')));

// 2) toggles flip aria-pressed coherently
[['attn'],['causal'],['lbl'],['glow']].forEach(([id])=>{
  click(id); const a1=aria(id); click(id); const a2=aria(id);
  ok('toggle flips true/false: '+id, (a1==='true'&&a2==='false')||(a1==='false'&&a2==='true'));
  // initial markup default must match JS default (all true)
  ok('initial aria default: '+id, new RegExp('id=\\"'+id+'\\"[^>]*aria-pressed=\\"true\\"').test(fs.readFileSync(HTML,'utf8')));
});
// focus toggle also opens/closes fpanel
click('focus'); const fOn=aria('focus')==='true' && byId['fpanel'].classList.contains('on');
click('focus'); const fOff=aria('focus')==='false' && !byId['fpanel'].classList.contains('on');
ok('focus toggles + fpanel sync', fOn && fOff);

// 3) HEAD cycles 1->2->3->1
const h0=byId['head'].textContent; click('head'); const h1=byId['head'].textContent; click('head'); const h2=byId['head'].textContent; click('head'); const h3=byId['head'].textContent;
ok('HEAD cycles labels', h0==='HEAD 1'&&h1==='HEAD 2'&&h2==='HEAD 3'&&h3==='HEAD 1');

// 4) PAUSE alternates label
const p0=byId['pause'].textContent; click('pause'); const p1=byId['pause'].textContent; click('pause'); const p2=byId['pause'].textContent;
ok('PAUSE label alternates', p1==='RESUME'&&p2==='PAUSE');

// 5) precision buttons update readouts + single active highlight
let precOk=true;
[['fp32','FP32','4'],['int8','INT8','1'],['int4','INT4','0.5'],['fp16','FP16','2']].forEach(([k,nm,bpp])=>{
  segButtons.find(b=>b.dataset.k===k).dispatch('click',{});
  if(byId['v-prec'].textContent!==nm) precOk=false;
  if(byId['v-bpp'].textContent!==bpp) precOk=false;
  const lit=segButtons.filter(b=>b.style.background && b.style.background!=='transparent').length;
  if(lit!==1) precOk=false;
});
ok('precision updates readouts + one highlight', precOk);

// 6) temperature slider updates readout
byId['temp'].dispatch('input',{target:{value:'150'}});
ok('temp slider updates v-temp', byId['v-temp'].textContent==='1.50');

// 7) prompt produces chips matching token count
byId['prompt'].value='the quick brown fox jumps';
byId['prompt'].dispatch('input',{});
function tk(s){const p=s.toLowerCase().match(/[a-z0-9]+|[^\sa-z0-9]/g)||[];const o=[];for(const w of p){if(w.length<=4)o.push(w);else{let i=0;while(i<w.length){const l=i===0?Math.min(4,w.length-i):Math.min(3,w.length-i);o.push((i>0?'##':'')+w.slice(i,i+l));i+=l;}}}return o;}
ok('prompt -> chips count', byId['chips']._children.length===tk('the quick brown fox jumps').length);

// 8) overlays open/close
click('about'); const ao=byId['aboutov'].classList.contains('on'); click('aboutclose'); const ac=!byId['aboutov'].classList.contains('on');
ok('ABOUT opens/closes', ao&&ac);
click('help'); const ho=byId['helpov'].classList.contains('on'); click('helpclose'); const hc=!byId['helpov'].classList.contains('on');
ok('HELP opens/closes', ho&&hc);

// 9) intro buttons dismiss
click('introExplore'); ok('intro Explore dismisses', byId['intro'].classList.contains('gone'));

// 10) tour: start -> on, steps advance, exit -> off
click('tour-btn'); const tOn=byId['tour'].classList.contains('on'); const s1=byId['tstep'].textContent;
click('tnext'); const s2=byId['tstep'].textContent; click('tprev'); const s3=byId['tstep'].textContent;
click('texit'); const tOff=!byId['tour'].classList.contains('on');
ok('tour on/step/back/exit', tOn && s1==='step 1 / 8' && s2==='step 2 / 8' && s3==='step 1 / 8' && tOff);

// 11) intro Tour button also starts tour
byId['intro'].classList.remove('gone');
click('introTour'); ok('intro Tour starts tour + dismisses', byId['intro'].classList.contains('gone') && byId['tour'].classList.contains('on'));
click('texit');

// 12) zoom + reset run without throwing (no observable state, just stability)
let zErr=false; try{click('zin');click('zout');click('reset');}catch(e){zErr=true;} ok('zoom/reset stable', !zErr);

// 13) long run after all interactions
let runErr=0; for(let i=0;i<80;i++){t+=16;const cb=raf.shift();if(cb){try{cb(t);}catch(e){runErr++;}}}
ok('80 frames post-interaction, no errors', runErr===0);

// report
console.log('\n================ FEATURE / BUTTON AUDIT ================');
let fails=0; R.forEach(([s,n])=>{console.log(s.padEnd(5),n); if(s==='FAIL')fails++;});
console.log('=======================================================');
console.log(fails===0? ('ALL '+R.length+' CHECKS PASS') : (fails+' / '+R.length+' FAILED'));
process.exit(fails===0?0:1);
