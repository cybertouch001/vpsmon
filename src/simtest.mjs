
import * as E from './engine.js';
let wins=[0,0,0], turns=0, N=300;
for(let n=0;n<N;n++){
  const ids=E.MONSTER_IDS.slice().sort(()=>Math.random()-0.5);
  const b=E.createBattle(ids.slice(0,3),ids.slice(3,6),n+1);
  let guard=0;
  while(b.winner===null && guard++<200){ const ev=E.resolveTurn(b,[E.cpuAction(b,0),E.cpuAction(b,1)]); }
  wins[b.winner===-1?2:b.winner]++; turns+=b.turn;
}
console.log('wins',wins,'avg turns',turns/N);
// per-monster winrate in 1v1-ish
const wr={}; for(const id of E.MONSTER_IDS) wr[id]=[0,0];
for(let n=0;n<4000;n++){ const ids=E.MONSTER_IDS.slice().sort(()=>Math.random()-0.5); const b=E.createBattle(ids.slice(0,3),ids.slice(3,6),n*3+7);
  let g=0; while(b.winner===null&&g++<200) E.resolveTurn(b,[E.cpuAction(b,0),E.cpuAction(b,1)]);
  if(b.winner>=0){ ids.slice(0,3).forEach(i=>{wr[i][1]++; if(b.winner===0) wr[i][0]++;}); ids.slice(3,6).forEach(i=>{wr[i][1]++; if(b.winner===1) wr[i][0]++;}); } }
for(const k in wr) console.log(k,(wr[k][0]/wr[k][1]*100).toFixed(1));
const b=E.createBattle(['blazimp','tidefang','zaptoad'],['pricklor','voidroth','grumbash'],5); console.log(JSON.stringify(E.resolveTurn(b,[{type:'move',idx:1},{type:'move',idx:0}])));
