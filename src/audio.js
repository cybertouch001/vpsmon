
// Synthesised sound effects + music (no audio files needed)
export class Audio {
  constructor(){ this.ctx=null; this.muted = localStorage.getItem('ff_mute')==='1'; this.musicOn = localStorage.getItem('ff_music')!=='0'; this.vibe = localStorage.getItem('ff_vibe')!=='0'; this.track=null; }
  unlock(){ if(this.ctx){ if(this.ctx.state==='suspended') this.ctx.resume(); return; }
    const C = window.AudioContext||window.webkitAudioContext; if(!C) return; this.ctx=new C();
    this.master=this.ctx.createGain(); this.master.gain.value=this.muted?0:0.9; this.master.connect(this.ctx.destination);
    this.sfx=this.ctx.createGain(); this.sfx.gain.value=0.8; this.sfx.connect(this.master);
    this.mus=this.ctx.createGain(); this.mus.gain.value=this.musicOn?0.22:0; this.mus.connect(this.master);
    const len=this.ctx.sampleRate*2; this.noiseBuf=this.ctx.createBuffer(1,len,this.ctx.sampleRate); const d=this.noiseBuf.getChannelData(0); for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    if(this.pendingTrack) this.music(this.pendingTrack);
  }
  setMuted(m){ this.muted=m; localStorage.setItem('ff_mute',m?'1':'0'); if(this.master) this.master.gain.setTargetAtTime(m?0:0.9,this.ctx.currentTime,0.05); }
  setMusic(on){ this.musicOn=on; localStorage.setItem('ff_music',on?'1':'0'); if(this.mus) this.mus.gain.setTargetAtTime(on?0.22:0,this.ctx.currentTime,0.1); }
  vibrate(p){ if(this.vibe && navigator.vibrate) try{ navigator.vibrate(p); }catch(e){} }
  get ok(){ return this.ctx && !this.muted; }
  t(){ return this.ctx.currentTime; }
  noise(dur, {type='bandpass', f0=1000, f1=1000, q=1, gain=0.5, attack=0.01, out}={}){
    if(!this.ok) return; const c=this.ctx, s=c.createBufferSource(); s.buffer=this.noiseBuf; s.loop=true;
    const f=c.createBiquadFilter(); f.type=type; f.Q.value=q; f.frequency.setValueAtTime(f0,this.t()); f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),this.t()+dur);
    const g=c.createGain(); g.gain.setValueAtTime(0.0001,this.t()); g.gain.exponentialRampToValueAtTime(gain,this.t()+attack); g.gain.exponentialRampToValueAtTime(0.0001,this.t()+dur);
    s.connect(f); f.connect(g); g.connect(out||this.sfx); s.start(this.t(), Math.random()); s.stop(this.t()+dur+0.05);
  }
  tone(freq, dur, {type='sine', f1, gain=0.3, attack=0.005, delay=0, out}={}){
    if(!this.ok) return; const c=this.ctx, o=c.createOscillator(), g=c.createGain(); const t0=this.t()+delay;
    o.type=type; o.frequency.setValueAtTime(freq,t0); if(f1) o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
    g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(gain,t0+attack); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g); g.connect(out||this.sfx); o.start(t0); o.stop(t0+dur+0.05);
  }
  click(){ this.tone(900,0.06,{type:'triangle',gain:0.15}); this.tone(1400,0.05,{type:'sine',gain:0.08,delay:0.03}); }
  select(){ this.tone(660,0.08,{type:'triangle',gain:0.15}); this.tone(990,0.12,{type:'triangle',gain:0.12,delay:0.06}); }
  whoosh(s=0.5, wide){ this.noise(0.25+s*0.4,{f0:wide?400:300,f1:wide?2500:3000,q:wide?0.7:1.5,gain:0.35*Math.min(1.2,0.6+s)}); }
  fire(s=0.6){ this.noise(0.4+s*0.5,{type:'lowpass',f0:3000,f1:300,q:0.5,gain:0.5}); this.noise(0.3+s*0.4,{f0:600,f1:1800,q:2,gain:0.25}); this.tone(90,0.4+s*0.3,{type:'sawtooth',f1:45,gain:0.12}); }
  splash(s=0.6){ for(let i=0;i<3;i++) this.noise(0.25+s*0.3,{f0:2500-i*500,f1:400,q:1.5,gain:0.3}); this.tone(300,0.2,{f1:1200,gain:0.08}); }
  zap(s=0.4,base=900){ if(!this.ok) return; for(let i=0;i<6;i++) this.tone(base*(0.5+Math.random()),0.05,{type:'square',gain:0.07,delay:i*0.035}); this.noise(0.2+s*0.2,{type:'highpass',f0:3000,f1:6000,gain:0.15}); }
  thunder(){ this.noise(0.12,{type:'highpass',f0:2000,f1:8000,gain:0.5}); this.noise(1.3,{type:'lowpass',f0:900,f1:60,q:0.7,gain:0.7,attack:0.02}); this.tone(55,0.9,{type:'sawtooth',f1:30,gain:0.15}); }
  crack(){ this.noise(0.08,{type:'highpass',f0:3000,f1:5000,gain:0.5}); for(let i=0;i<4;i++) this.tone(2000+Math.random()*2500,0.15,{type:'triangle',gain:0.06,delay:i*0.04}); }
  dark(s=1){ this.tone(110,0.6+s*0.4,{type:'sawtooth',f1:55,gain:0.12}); this.tone(116,0.6+s*0.4,{type:'sawtooth',f1:58,gain:0.1}); this.noise(0.6+s*0.4,{f0:200,f1:900,q:3,gain:0.2}); }
  thud(s=0.7){ this.tone(120,0.25+s*0.2,{f1:40,gain:0.5*s+0.2}); this.noise(0.2,{type:'lowpass',f0:600,f1:80,gain:0.4*s}); }
  boom(s=1){ this.tone(90,0.8*s,{f1:28,gain:0.6}); this.noise(0.9*s,{type:'lowpass',f0:1500,f1:50,q:0.6,gain:0.6}); }
  quake(){ this.noise(1.1,{type:'lowpass',f0:200,f1:60,q:1,gain:0.7,attack:0.05}); this.tone(45,1.0,{type:'sawtooth',f1:30,gain:0.2}); }
  chime(kind=0){ const base=kind?660:523; [0,4,7,12].forEach((st,i)=>this.tone(base*Math.pow(2,st/12),0.5,{type:'sine',gain:0.14,delay:i*0.07})); }
  charge(){ this.tone(150,1.1,{type:'sawtooth',f1:900,gain:0.12}); this.noise(1.1,{f0:300,f1:4000,q:4,gain:0.2}); }
  summon(){ this.tone(440,0.25,{type:'triangle',f1:880,gain:0.15}); this.noise(0.3,{f0:1500,f1:6000,q:1,gain:0.12}); }
  hit(s=1,crit){ this.noise(0.12,{type:'lowpass',f0:4000,f1:300,gain:0.55}); this.tone(crit?220:160,0.18,{type:'square',f1:60,gain:0.18}); this.vibrate(crit?[40,30,60]:30+s*20); }
  miss(){ this.noise(0.3,{f0:1200,f1:3000,q:2,gain:0.18}); }
  faint(){ this.tone(400,0.9,{type:'triangle',f1:80,gain:0.2}); }
  super_(){ this.tone(523,0.12,{type:'square',gain:0.08}); this.tone(784,0.2,{type:'square',gain:0.08,delay:0.08}); }
  win(){ [0,4,7,12,16,19,24].forEach((s,i)=>this.tone(523*Math.pow(2,s/12),0.4,{type:'triangle',gain:0.15,delay:i*0.09})); }
  lose(){ [7,4,0,-5].forEach((s,i)=>this.tone(392*Math.pow(2,s/12),0.5,{type:'triangle',gain:0.14,delay:i*0.18})); }
  tick(){ this.tone(1200,0.03,{type:'square',gain:0.04}); }
  // --- music: tiny step sequencer ---
  music(name){
    if(!this.ctx){ this.pendingTrack=name; return; }
    if(this.track===name) return; this.track=name; clearInterval(this._seq);
    if(!name) return;
    const c=this.ctx; const bpm = name==='battle'?132:92; const step=60/bpm/2; let next=c.currentTime+0.1, i=0;
    const prog = name==='battle' ? [[45,52,57],[41,48,53],[43,50,55],[40,47,52]] : [[57,60,64],[53,57,60],[55,59,62],[52,55,59]];
    const midi=m=>440*Math.pow(2,(m-69)/12);
    const play=(f,t,d,type,g)=>{ const o=c.createOscillator(), gn=c.createGain(); o.type=type; o.frequency.value=f; gn.gain.setValueAtTime(0.0001,t); gn.gain.exponentialRampToValueAtTime(g,t+0.01); gn.gain.exponentialRampToValueAtTime(0.0001,t+d); o.connect(gn); gn.connect(this.mus); o.start(t); o.stop(t+d+0.05); };
    const hat=(t,g)=>{ const s=c.createBufferSource(); s.buffer=this.noiseBuf; const f=c.createBiquadFilter(); f.type='highpass'; f.frequency.value=7000; const gn=c.createGain(); gn.gain.setValueAtTime(g,t); gn.gain.exponentialRampToValueAtTime(0.0001,t+0.05); s.connect(f); f.connect(gn); gn.connect(this.mus); s.start(t,Math.random()); s.stop(t+0.06); };
    const kick=(t)=>{ const o=c.createOscillator(), gn=c.createGain(); o.frequency.setValueAtTime(140,t); o.frequency.exponentialRampToValueAtTime(40,t+0.15); gn.gain.setValueAtTime(0.9,t); gn.gain.exponentialRampToValueAtTime(0.0001,t+0.2); o.connect(gn); gn.connect(this.mus); o.start(t); o.stop(t+0.25); };
    this._seq=setInterval(()=>{
      while(next < c.currentTime+0.25){
        const bar=Math.floor(i/16)%4, s=i%16, ch=prog[bar];
        if(name==='battle'){
          if(s%4===0) kick(next); if(s%2===1) hat(next,0.25);
          play(midi(ch[0]-12),next,step*0.9,'sawtooth',s%2?0.18:0.28);
          if(s%2===0) play(midi(ch[(s/2)%3]+12),next,step*1.6,'square',0.06);
          if(s===0) ch.forEach(m=>play(midi(m),next,step*15,'triangle',0.05));
        } else {
          if(s===0) ch.forEach(m=>play(midi(m),next,step*16,'sine',0.09));
          if(s%3===0) play(midi(ch[(s/3)%3]+12),next,step*2.5,'triangle',0.05);
          if(s%8===0) play(midi(ch[0]-24),next,step*7,'sine',0.16);
        }
        next+=step; i++;
      }
    },60);
  }
}
