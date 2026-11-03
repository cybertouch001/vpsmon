
import * as E from './engine.js';
function duel(l0,l1,N){ let w=[0,0,0]; for(let n=0;n<N;n++){ const ids=E.MONSTER_IDS.slice().sort(()=>Math.random()-0.5); const b=E.createBattle(ids.slice(0,3),ids.slice(3,6),n*7+3); let g=0; while(b.winner===null&&g++<300) E.resolveTurn(b,[E.cpuAction(b,0,Math.random,l0),E.cpuAction(b,1,Math.random,l1)]); w[b.winner<0?2:b.winner]++; } return w; }
console.log('hard vs normal',duel('hard','normal',1000)); console.log('normal vs easy',duel('normal','easy',1000)); console.log('hard vs easy',duel('hard','easy',1000));
