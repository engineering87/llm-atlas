// Numeric fidelity invariants for LLM Atlas.
// Loads index.html, runs the real engine under a stubbed DOM, and asserts that
// quantization actually collapses the weight distribution (FP32 continuous, INT4 coarse).
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// expose what we need to drive and inspect the engine
const inj=";globalThis.__setPrec=setPrec;globalThis.__targ=()=>Array.from(targ);";
code=code.slice(0,code.lastIndexOf("})();"))+inj+code.slice(code.lastIndexOf("})();"));

function ctx(){return new Proxy({},{get:(t,k)=>k==='canvas'?{width:10,height:10}:(k in t?t[k]:()=>{}),set:(t,k,v)=>{t[k]=v;return true;}});}
function el(){const e={style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},value:'the cat sat on the mat',
  width:300,height:150,textContent:'',innerHTML:'',setAttribute(){},getAttribute(){return null;},
  addEventListener(){},appendChild(){},querySelectorAll(){return[];},getContext(){return this._c||(this._c=ctx());}};return e;}
const cache={};let frameFn=null,nowv=0,seed=12345>>>0;
globalThis.Math.random=()=>{seed=(1103515245*seed+12345)>>>0;return seed/4294967296;};
globalThis.devicePixelRatio=1;globalThis.innerWidth=1280;globalThis.innerHeight=720;
globalThis.addEventListener=()=>{};globalThis.requestAnimationFrame=fn=>{frameFn=fn;return 1;};
globalThis.performance={now:()=>nowv};globalThis.setTimeout=()=>0;globalThis.clearTimeout=()=>{};
globalThis.document={getElementById:id=>cache[id]||(cache[id]=el()),createElement:()=>el(),querySelectorAll:()=>[]};
(0,eval)(code);
function frames(n){for(let i=0;i<n;i++){nowv+=16;if(frameFn)frameFn(nowv);}}
const distinct=a=>new Set(a.map(x=>x.toFixed(6))).size;

let fails=0; const check=(name,cond,extra)=>{console.log((cond?'PASS ':'FAIL ')+name+(extra?'  ('+extra+')':''));if(!cond)fails++;};

globalThis.__setPrec('fp32'); frames(3); const d32=distinct(globalThis.__targ());
globalThis.__setPrec('int4'); frames(3); const d4 =distinct(globalThis.__targ());
globalThis.__setPrec('int8'); frames(3); const d8 =distinct(globalThis.__targ());

check('FP32 weights are effectively continuous', d32>=800, 'distinct='+d32);
check('INT4 collapses to a coarse set', d4<=30, 'distinct='+d4);
check('INT8 is finer than INT4 but coarser than FP32', d4<d8 && d8<d32, 'int4='+d4+' int8='+d8+' fp32='+d32);
check('INT4 is a large collapse vs FP32', d4*10 < d32, 'ratio='+(d32/d4).toFixed(1)+'x');

console.log(fails===0?('\nALL '+4+' INVARIANTS PASS'):('\n'+fails+' INVARIANT(S) FAILED'));
process.exit(fails===0?0:1);
