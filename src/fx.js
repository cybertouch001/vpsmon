
import * as THREE from 'three';
import { TYPE_INFO } from './engine.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const rand=(a,b)=>a+Math.random()*(b-a);
export const wait = ms => new Promise(r=>setTimeout(r,ms));

function makeAtlas(){
  const T=256, c=document.createElement('canvas'); c.width=T*4; c.height=T*2; const g=c.getContext('2d');
  const at=(i,fn)=>{ g.save(); g.translate((i%4)*T+T/2, Math.floor(i/4)*T+T/2); fn(); g.restore(); };
  const rg=(r0,r1,stops)=>{ const gr=g.createRadialGradient(0,0,r0,0,0,r1); stops.forEach(([o,c])=>gr.addColorStop(o,c)); return gr; };
  // 0 glow
  at(0,()=>{ g.fillStyle=rg(0,128,[[0,'rgba(255,255,255,1)'],[0.25,'rgba(255,255,255,0.75)'],[0.6,'rgba(255,255,255,0.18)'],[1,'rgba(255,255,255,0)']]); g.fillRect(-128,-128,256,256); });
  // 1 smoke: lumpy blobs
  at(1,()=>{ for(let i=0;i<26;i++){ const a=Math.random()*6.28, d=Math.random()*55, x=Math.cos(a)*d, y=Math.sin(a)*d, r=rand(30,62);
     g.fillStyle=rg(0,r,[[0,`rgba(255,255,255,${rand(0.18,0.32)})`],[1,'rgba(255,255,255,0)']]); g.beginPath(); g.arc(x,y,r,0,7); g.fill(); } });
  // 2 spark star
  at(2,()=>{ g.fillStyle=rg(0,40,[[0,'rgba(255,255,255,1)'],[1,'rgba(255,255,255,0)']]); g.beginPath(); g.arc(0,0,40,0,7); g.fill();
     g.globalCompositeOperation='lighter'; for(const ang of [0,Math.PI/2,Math.PI/4,-Math.PI/4]){ g.save(); g.rotate(ang); const L=ang%(Math.PI/2)===0?124:70; const gr=g.createLinearGradient(-L,0,L,0); gr.addColorStop(0,'rgba(255,255,255,0)'); gr.addColorStop(0.5,'rgba(255,255,255,0.95)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(-L,-3,L*2,6); g.restore(); } });
  // 3 flame
  at(3,()=>{ for(let i=0;i<14;i++){ const y=rand(-10,40), x=rand(-18,18), r=rand(28,58); g.fillStyle=rg(0,r,[[0,'rgba(255,255,255,0.55)'],[0.5,'rgba(255,255,255,0.25)'],[1,'rgba(255,255,255,0)']]); g.beginPath(); g.ellipse(x,y-i*3,r*0.7,r*1.15,0,0,7); g.fill(); } });
  // 4 bubble / droplet
  at(4,()=>{ g.fillStyle=rg(30,100,[[0,'rgba(255,255,255,0.15)'],[0.85,'rgba(255,255,255,0.55)'],[1,'rgba(255,255,255,0)']]); g.beginPath(); g.arc(0,0,100,0,7); g.fill();
     g.fillStyle='rgba(255,255,255,0.95)'; g.beginPath(); g.ellipse(-38,-40,20,12,-0.7,0,7); g.fill(); });
  // 5 leaf
  at(5,()=>{ g.rotate(0.6); g.fillStyle='rgba(255,255,255,0.95)'; g.beginPath(); g.moveTo(0,-110); g.quadraticCurveTo(70,-20,0,110); g.quadraticCurveTo(-70,-20,0,-110); g.fill();
     g.strokeStyle='rgba(120,120,120,0.8)'; g.lineWidth=5; g.beginPath(); g.moveTo(0,-100); g.lineTo(0,105); g.stroke(); for(let i=-3;i<=3;i++){ g.beginPath(); g.moveTo(0,i*25); g.lineTo(i%2?30:-30,i*25-22); g.stroke(); } });
  // 6 shard
  at(6,()=>{ g.beginPath(); g.moveTo(0,-118); g.lineTo(42,-10); g.lineTo(0,118); g.lineTo(-42,-10); g.closePath(); const gr=g.createLinearGradient(-42,-118,42,118); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.5,'rgba(210,235,255,0.75)'); gr.addColorStop(1,'rgba(255,255,255,0.95)'); g.fillStyle=gr; g.fill(); g.strokeStyle='rgba(255,255,255,1)'; g.lineWidth=4; g.stroke(); g.beginPath(); g.moveTo(0,-118); g.lineTo(0,118); g.strokeStyle='rgba(180,210,255,0.8)'; g.stroke(); });
  // 7 ring
  at(7,()=>{ g.strokeStyle='rgba(255,255,255,1)'; g.lineWidth=14; g.shadowColor='#fff'; g.shadowBlur=20; g.beginPath(); g.arc(0,0,100,0,7); g.stroke(); });
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}

class Particles {
  constructor(scene, atlas, max, additive, renderer){
    this.max=max; this.n=0; this.renderer=renderer;
    const g=new THREE.BufferGeometry();
    this.pos=new Float32Array(max*3); this.col=new Float32Array(max*3); this.alpha=new Float32Array(max); this.size=new Float32Array(max); this.rot=new Float32Array(max); this.tile=new Float32Array(max);
    g.setAttribute('position',new THREE.BufferAttribute(this.pos,3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color',new THREE.BufferAttribute(this.col,3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha',new THREE.BufferAttribute(this.alpha,1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size',new THREE.BufferAttribute(this.size,1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('rot',new THREE.BufferAttribute(this.rot,1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('tile',new THREE.BufferAttribute(this.tile,1).setUsage(THREE.DynamicDrawUsage));
    this.p=[]; // sim records
    this.mat=new THREE.ShaderMaterial({ transparent:true, depthWrite:false, blending: additive?THREE.AdditiveBlending:THREE.NormalBlending, toneMapped:false,
      uniforms:{ map:{value:atlas}, scale:{value:600} },
      vertexShader:`attribute float alpha; attribute float size; attribute float rot; attribute float tile; uniform float scale;
        varying vec3 vC; varying float vA; varying float vR; varying float vT;
        void main(){ vC=color; vA=alpha; vR=rot; vT=tile; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=size*scale/max(0.1,-mv.z); }`,
      fragmentShader:`uniform sampler2D map; varying vec3 vC; varying float vA; varying float vR; varying float vT;
        void main(){ vec2 uv=gl_PointCoord-0.5; float c=cos(vR), s=sin(vR); uv=vec2(c*uv.x-s*uv.y, s*uv.x+c*uv.y)+0.5; if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0) discard;
          float tx=mod(vT,4.0), ty=floor(vT/4.0); vec4 t=texture2D(map, vec2((tx+uv.x)/4.0, 1.0-(ty+uv.y)/2.0)); gl_FragColor=vec4(t.rgb*vC, t.a*vA); }`,
      vertexColors:true });
    this.points=new THREE.Points(g,this.mat); this.points.frustumCulled=false; this.points.renderOrder=5; scene.add(this.points);
    this.geo=g;
  }
  spawn(o){
    if(this.p.length>=this.max) this.p.shift();
    const c1=new THREE.Color(o.color??0xffffff), c2=new THREE.Color(o.color2??o.color??0xffffff);
    this.p.push({ x:o.pos.x,y:o.pos.y,z:o.pos.z, vx:o.vel?o.vel.x:0, vy:o.vel?o.vel.y:0, vz:o.vel?o.vel.z:0, life:0, max:o.life??1, s0:o.size??0.5, s1:o.size1??(o.size??0.5),
      a0:o.alpha??1, g:o.gravity??0, drag:o.drag??0, rot:o.rot??Math.random()*6.28, spin:o.spin??0, tile:o.tile??0, c1, c2, fadeIn:o.fadeIn??0.08, follow:o.follow||null, orbit:o.orbit||null });
  }
  update(dt, camScale){
    this.mat.uniforms.scale.value=camScale;
    const P=this.p; let w=0;
    for(let i=0;i<P.length;i++){
      const q=P[i]; q.life+=dt; if(q.life>=q.max) continue;
      const k=Math.exp(-q.drag*dt); q.vx*=k; q.vy*=k; q.vz*=k; q.vy-=q.g*dt;
      if(q.orbit){ const o=q.orbit; o.a+=o.w*dt; o.y+=o.vy*dt; o.r+=o.vr*dt; q.x=o.c.x+Math.cos(o.a)*o.r; q.z=o.c.z+Math.sin(o.a)*o.r; q.y=o.c.y+o.y; }
      else { q.x+=q.vx*dt; q.y+=q.vy*dt; q.z+=q.vz*dt; }
      q.rot+=q.spin*dt; P[w++]=q;
    }
    P.length=w;
    const n=Math.min(w,this.max);
    for(let i=0;i<n;i++){ const q=P[i], t=q.life/q.max;
      this.pos[i*3]=q.x; this.pos[i*3+1]=q.y; this.pos[i*3+2]=q.z;
      this.col[i*3]=q.c1.r+(q.c2.r-q.c1.r)*t; this.col[i*3+1]=q.c1.g+(q.c2.g-q.c1.g)*t; this.col[i*3+2]=q.c1.b+(q.c2.b-q.c1.b)*t;
      const fi=Math.min(1,q.life/Math.max(0.001,q.fadeIn*q.max)); this.alpha[i]=q.a0*fi*(1-t)*(1-t*0.2);
      this.size[i]=q.s0+(q.s1-q.s0)*t; this.rot[i]=q.rot; this.tile[i]=q.tile; }
    this.geo.setDrawRange(0,n);
    for(const k of ['position','color','alpha','size','rot','tile']) this.geo.attributes[k].needsUpdate=true;
  }
}

const TC = { fire:[0xff7a1a,0xff2a00], water:[0x41b8ff,0x1a5cff], grass:[0x6dff5a,0x1f9b2a], electric:[0xffe94a,0x4ab8ff], ice:[0xbff3ff,0x5fc8ff],
  earth:[0xd9a066,0x7a4b22], shadow:[0xb066ff,0x3a0a6a], wind:[0xd8fff0,0x7fe8c0], neutral:[0xffffff,0xffd27a] };

export class FX {
  constructor(stage, audio){
    this.stage=stage; this.scene=stage.scene; this.audio=audio; this.q=stage.quality==='high'?1:0.55;
    const atlas=makeAtlas();
    this.add=new Particles(this.scene, atlas, stage.quality==='high'?2400:1200, true);
    this.norm=new Particles(this.scene, atlas, stage.quality==='high'?1200:600, false);
    this.lights=[]; for(let i=0;i<3;i++){ const l=new THREE.PointLight(0xffffff,0,9,1.6); this.scene.add(l); this.lights.push(l); }
    this.tweens=new Set();
    stage.updaters.add((dt)=>{
      const cam=stage.camera; const h=stage.renderer.domElement.height; const sc = h/(2*Math.tan(THREE.MathUtils.degToRad(cam.fov)/2));
      this.add.update(dt, sc); this.norm.update(dt, sc);
      for(const tw of [...this.tweens]){ tw.t+=dt; const k=Math.min(1,tw.t/tw.d); tw.fn(k,dt); if(k>=1){ this.tweens.delete(tw); tw.res(); } }
      for(const l of this.lights){ if(l.intensity>0) l.intensity=Math.max(0,l.intensity-dt*l.userData.decay); }
      for(const e of [...this.emitters]) { if(e(dt)===false) this.emitters.delete(e); }
    });
    this.emitters=new Set();
  }
  tween(d,fn){ return new Promise(res=>this.tweens.add({t:0,d:Math.max(0.001,d),fn,res})); }
  emitter(fn){ this.emitters.add(fn); return ()=>this.emitters.delete(fn); }
  n(c){ return Math.max(1,Math.round(c*this.q)); }
  flash(pos,color,int=30,decay=60){ const l=this.lights.find(x=>x.intensity<=0)||this.lights[0]; l.position.copy(pos); l.color.set(color); l.intensity=int; l.userData.decay=decay; }
  burst(pos,o={}){
    const sys=o.normal?this.norm:this.add; const n=this.n(o.count??24);
    for(let i=0;i<n;i++){ const dir=V(rand(-1,1),rand(o.upOnly?0:-1,1),rand(-1,1)).normalize(); const sp=rand(o.speed?o.speed*0.4:1,o.speed??4);
      sys.spawn({pos:pos.clone().addScaledVector(dir,o.spread??0.1), vel:dir.multiplyScalar(sp).add(o.vel||V()), life:rand((o.life??0.6)*0.6,o.life??0.6), size:o.size??0.35, size1:o.size1??0.05, color:o.color, color2:o.color2, tile:o.tile??0, gravity:o.gravity??0, drag:o.drag??2, spin:rand(-4,4), alpha:o.alpha??1}); }
  }
  ring(pos,color,size=3,dur=0.45,flat=false){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1), new THREE.MeshBasicMaterial({map:this.add.mat.uniforms.map.value, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, color, toneMapped:false}));
    // use ring tile (index 7): uv remap
    const uv=m.geometry.attributes.uv; for(let i=0;i<uv.count;i++){ uv.setXY(i, (3+uv.getX(i))/4, uv.getY(i)/2); }
    m.position.copy(pos); if(flat){ m.rotation.x=-Math.PI/2; } this.scene.add(m);
    return this.tween(dur,(k)=>{ if(!flat) m.quaternion.copy(this.stage.camera.quaternion); const s=0.2+size*(1-Math.pow(1-k,3)); m.scale.set(s,s,s); m.material.opacity=1-k; if(k>=1){ this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } });
  }
  head(mon){ const p=mon.holder.position.clone(); const f=this.fwd(mon); return p.add(V(0,1.45*mon.inner.scale.y,0)).addScaledVector(f,0.55); }
  chest(mon){ return mon.holder.position.clone().add(V(0,1.0*mon.inner.scale.y,0)); }
  fwd(mon){ return mon.faceDir ? mon.faceDir.clone() : V(0,0,1); }
  async projectile(from,to,o){
    const core=new THREE.Mesh(new THREE.SphereGeometry(o.radius??0.22,16,12), new THREE.MeshBasicMaterial({color:new THREE.Color(o.color).multiplyScalar(o.glow??3), toneMapped:false}));
    if(o.mesh){ core.visible=false; }
    const grp=new THREE.Group(); grp.add(core); if(o.mesh) grp.add(o.mesh); this.scene.add(grp); grp.position.copy(from);
    const mid=from.clone().lerp(to,0.5).add(V(0,o.arc??0.6,0));
    const curve=new THREE.QuadraticBezierCurve3(from,mid,to);
    let acc=0;
    await this.tween(o.dur??0.5,(k,dt)=>{ const p=curve.getPoint(k); grp.position.copy(p); if(o.mesh){ o.mesh.rotation.x+=dt*(o.spin??8); o.mesh.rotation.y+=dt*(o.spin??6); }
      acc+=dt; const per=1/(o.rate??70); while(acc>per){ acc-=per; if(o.trail) o.trail(p.clone()); }
      const l=this.lights[2]; l.position.copy(p); l.color.set(o.color); l.intensity=o.light??6; l.userData.decay=0; });
    this.lights[2].intensity=0; this.lights[2].userData.decay=60;
    this.scene.remove(grp); core.geometry.dispose(); core.material.dispose(); if(o.mesh){ o.mesh.geometry.dispose(); }
  }
  bolt(from,to,color,width=0.12,jag=0.5,segs=12){
    const pts=[]; for(let i=0;i<=segs;i++){ const p=from.clone().lerp(to,i/segs); if(i>0&&i<segs) p.add(V(rand(-jag,jag),rand(-jag,jag)*0.6,rand(-jag,jag))); pts.push(p); }
    const geo=new THREE.BufferGeometry(); const cam=this.stage.camera.position; const verts=[];
    for(let i=0;i<pts.length-1;i++){ const a=pts[i], b=pts[i+1]; const dir=b.clone().sub(a); const side=dir.clone().cross(cam.clone().sub(a)).normalize().multiplyScalar(width);
      verts.push(...a.clone().add(side).toArray(), ...a.clone().sub(side).toArray(), ...b.clone().add(side).toArray(), ...a.clone().sub(side).toArray(), ...b.clone().sub(side).toArray(), ...b.clone().add(side).toArray()); }
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    const core=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(4), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, toneMapped:false}));
    this.scene.add(core);
    const glowPts=pts; glowPts.forEach(p=>this.add.spawn({pos:p, life:0.18, size:0.9, color, alpha:0.6}));
    this.tween(0.22,(k)=>{ core.material.opacity=(1-k)*(Math.random()>0.3?1:0.3); if(k>=1){ this.scene.remove(core); geo.dispose(); core.material.dispose(); } });
    return pts;
  }
  beam(from,to,color,dur=0.6,width=0.35){
    const len=from.distanceTo(to); const geo=new THREE.CylinderGeometry(width,width*0.7,len,16,1,true); geo.translate(0,len/2,0); geo.rotateX(Math.PI/2);
    const mat=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(3), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false});
    const m=new THREE.Mesh(geo,mat); m.position.copy(from); m.lookAt(to); this.scene.add(m);
    const inner=new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false})); inner.scale.set(0.4,0.4,1); m.add(inner);
    return this.tween(dur,(k)=>{ const s=k<0.2?k/0.2:(k>0.8?(1-k)/0.2:1); m.scale.set(s*(1+Math.sin(k*60)*0.08),s*(1+Math.sin(k*60)*0.08),1); mat.opacity=s; inner.material.opacity=s;
      if(Math.random()<0.6) this.add.spawn({pos:from.clone().lerp(to,Math.random()), vel:V(rand(-1,1),rand(-1,1),rand(-1,1)), life:0.4, size:0.3, color, size1:0});
      if(k>=1){ this.scene.remove(m); geo.dispose(); mat.dispose(); inner.geometry.dispose(); inner.material.dispose(); } });
  }
  async lunge(att,tgt,dist=0.62,dur=0.22){
    const start=att.holder.position.clone(); const end=start.clone().lerp(tgt.holder.position,dist);
    await this.tween(dur,(k)=>{ const e=k*k*(3-2*k); att.holder.position.lerpVectors(start,end,e); att.holder.position.y=Math.sin(k*Math.PI)*0.35; });
    return async()=>{ await this.tween(0.32,(k)=>{ const e=k*k*(3-2*k); att.holder.position.lerpVectors(end,start,e); att.holder.position.y=Math.sin(k*Math.PI)*0.2; }); att.holder.position.copy(start); };
  }
  // ---- per-move visuals; resolves at the moment of impact ----
  async attack(att,tgt,mv,opts={}){
    const type=mv.mtype||mv.type, [c1,c2]=TC[type]||TC.neutral, A=this.audio, from=this.head(att), to=this.chest(tgt);
    const fx=mv.fx;
    if(fx==='melee'){
      att.play('Run',{once:false,fade:0.1,speed:1.6}); A&&A.whoosh(0.25);
      const back=await this.lunge(att,tgt,0.62,0.28);
      const d=att.play(att.actions.Weapon && mv.name.match(/Club|Trident/)?'Weapon':'Punch',{once:true,speed:1.5,back:'Idle'});
      await wait(Math.min(320,d*500));
      this.burst(to,{count:30,color:0xffffff,color2:c1,tile:2,speed:6,size:0.5,life:0.4});
      back(); return {impact:to};
    }
    if(fx==='buff'||fx==='shield'||fx==='heal'){
      att.play(fx==='heal'?'Yes':'Wave',{once:true,speed:1.2}); A&&A.chime(fx==='heal'?1:0);
      const p=att.holder.position.clone();
      if(fx==='shield'){
        const sh=new THREE.Mesh(new THREE.SphereGeometry(1.35,32,24), new THREE.ShaderMaterial({transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, uniforms:{c:{value:new THREE.Color(c1)},o:{value:0}},
          vertexShader:`varying float f; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vec3 n=normalize(normalMatrix*normal); f=pow(1.0-abs(dot(n,normalize(-mv.xyz))),2.2); gl_Position=projectionMatrix*mv; }`,
          fragmentShader:`uniform vec3 c; uniform float o; varying float f; void main(){ gl_FragColor=vec4(c*2.0, (0.12+f)*o); }`}));
        sh.position.copy(p).add(V(0,1.05,0)); this.scene.add(sh);
        this.tween(1.4,(k)=>{ sh.material.uniforms.o.value=Math.sin(k*Math.PI); sh.scale.setScalar(0.8+k*0.3); if(k>=1){ this.scene.remove(sh); sh.geometry.dispose(); sh.material.dispose(); } });
        for(let i=0;i<this.n(40);i++) this.add.spawn({pos:p, orbit:{c:p.clone(),a:Math.random()*6.28,w:rand(2,4),r:1.25,vr:0,y:rand(0,2.2),vy:0.3}, life:1.2, size:0.18, color:c1, tile:6});
      } else {
        for(let i=0;i<this.n(60);i++){ const a=Math.random()*6.28, r=rand(0.4,1.2); this.add.spawn({pos:p.clone().add(V(Math.cos(a)*r,rand(0,0.6),Math.sin(a)*r)), vel:V(0,rand(1.5,3.5),0), life:rand(0.8,1.4), size:rand(0.15,0.35), color: fx==='heal'?0x8dff9a:c1, color2: fx==='heal'?0xffffff:c2, tile: fx==='heal'?2:0, drag:0.5}); }
        this.ring(p.clone().add(V(0,0.05,0)), fx==='heal'?0x8dff9a:c1, 3.2, 0.7, true);
      }
      this.flash(p.clone().add(V(0,1.5,0)), fx==='heal'?0x8dff9a:c1, 25, 25);
      await wait(700); return {impact:null, self:true};
    }
    if(fx==='debuff'||fx==='spores'){
      att.play('Wave',{once:true,speed:1.3}); A&&A.whoosh(0.6,true);
      const n=this.n(fx==='spores'?70:50);
      for(let i=0;i<n;i++){ const t=i/n; setTimeout(()=>{ const dir=to.clone().sub(from); this.norm.spawn({pos:from.clone().add(V(rand(-.2,.2),rand(-.2,.2),rand(-.2,.2))), vel:dir.multiplyScalar(rand(0.9,1.3)).add(V(rand(-.4,.4),rand(-.2,.6),rand(-.4,.4))), life:1.0, size:rand(0.18,0.32), size1:0.45, color: fx==='spores'?(Math.random()<0.5?0xffd3f0:0xfff09a):0x9b5cff, color2:fx==='spores'?0xffffff:0x2a0a4a, tile:1, alpha:0.8, drag:0.8}); }, t*500); }
      await wait(900); this.burst(to,{count:30,color:fx==='spores'?0xffc2ea:0x9b5cff,tile:0,speed:2,size:0.5,life:0.8}); return {impact:to};
    }
    // ranged: caster animation first
    const cast = att.actions.Weapon ? 'Weapon' : 'Punch';
    att.play(cast,{once:true,speed:1.4});
    await wait(260);
    switch(fx){
      case 'fireball': A&&A.fire(0.5);
        await this.projectile(from,to,{color:0xff8a2a,radius:0.26,dur:0.5,arc:0.5,trail:p=>{ this.add.spawn({pos:p,vel:V(rand(-.3,.3),rand(.2,.8),rand(-.3,.3)),life:0.45,size:0.55,size1:0.1,color:0xffb347,color2:0xff2a00,tile:3}); if(Math.random()<0.3) this.norm.spawn({pos:p,vel:V(0,0.6,0),life:0.8,size:0.3,size1:0.9,color:0x8a8078,alpha:0.28,tile:1}); }});
        break;
      case 'firestorm': A&&A.fire(1.1);
        for(let w=0;w<3;w++){ setTimeout(()=>this.projectile(from.clone().add(V(0,w*0.15-0.15,0)),to.clone().add(V(rand(-.4,.4),rand(-.2,.4),rand(-.4,.4))),{color:0xff6a00,radius:0.3,dur:0.55,arc:0.9-w*0.3,rate:90,trail:p=>{ this.add.spawn({pos:p,vel:V(rand(-.5,.5),rand(.3,1),rand(-.5,.5)),life:0.5,size:0.8,size1:0.15,color:0xffc04a,color2:0xff1a00,tile:3}); this.norm.spawn({pos:p,vel:V(0,0.8,0),life:1,size:0.4,size1:1.3,color:0x857a70,alpha:0.25,tile:1}); }}), w*120); }
        await wait(700);
        for(let i=0;i<this.n(40);i++) this.add.spawn({pos:to.clone().add(V(rand(-.6,.6),rand(-1,.5),rand(-.6,.6))), vel:V(rand(-.5,.5),rand(1.5,3.5),rand(-.5,.5)), life:rand(0.5,0.9), size:rand(0.6,1.1), size1:0.1, color:0xffd27a, color2:0xff2000, tile:3});
        break;
      case 'waterjet': case 'wave': {
        A&&A.splash(fx==='wave'?1.2:0.6);
        const n=fx==='wave'?this.n(150):this.n(80), dur=fx==='wave'?0.75:0.45;
        for(let i=0;i<n;i++){ setTimeout(()=>{ const s=from.clone().add(fx==='wave'?V(rand(-.8,.8),rand(-1.2,.2),rand(-.8,.8)):V()); const d=to.clone().add(V(rand(-.3,.3),rand(-.3,.3),rand(-.3,.3))).sub(s); this.add.spawn({pos:s,vel:d.multiplyScalar(1/0.35).add(V(0,fx==='wave'?rand(0,2):0,0)),life:0.35,size:rand(0.2,0.42),size1:0.25,color:0x8ad8ff,color2:0x2a7bff,tile:4,gravity:2}); }, (i/n)*dur*1000); }
        await wait(380); break; }
      case 'needles': A&&A.zap(0.3,600);
        for(let i=0;i<this.n(26);i++){ setTimeout(()=>{ const d=to.clone().add(V(rand(-.4,.4),rand(-.4,.4),rand(-.4,.4))).sub(from); this.add.spawn({pos:from.clone(),vel:d.multiplyScalar(4),life:0.25,size:0.22,size1:0.18,color:0xc8ff7a,color2:0x3fc75a,tile:6,rot:Math.atan2(d.y,d.x)+1.57}); }, i*14); }
        await wait(260); break;
      case 'vines': { A&&A.whoosh(0.5);
        const pts=[from.clone().setY(0.05), from.clone().lerp(to,0.4).setY(1.6), to.clone()];
        const curve=new THREE.CatmullRomCurve3([att.holder.position.clone().setY(0.05), from.clone().lerp(to,0.35).add(V(0,1.4,0)), from.clone().lerp(to,0.7).add(V(0,1.0,0.3)), to]);
        const geo=new THREE.TubeGeometry(curve,64,0.09,8,false); const mat=new THREE.MeshStandardMaterial({color:0x2f9b3a, roughness:0.6, emissive:0x0a3a10});
        const m=new THREE.Mesh(geo,mat); m.castShadow=true; this.scene.add(m); const total=geo.index.count;
        await this.tween(0.35,(k)=>{ geo.setDrawRange(0, Math.floor(total*k)); if(Math.random()<0.5) this.norm.spawn({pos:curve.getPoint(k),vel:V(rand(-1,1),rand(0,1),rand(-1,1)),life:0.8,size:0.22,color:0x6dff5a,color2:0x1f6b2a,tile:5,gravity:1.5,spin:rand(-5,5)}); });
        A&&A.thud(0.5);
        this.tween(0.5,(k)=>{ if(k>0.4){ geo.setDrawRange(Math.floor(total*(k-0.4)/0.6),total); } if(k>=1){ this.scene.remove(m); geo.dispose(); mat.dispose(); } });
        break; }
      case 'spark': A&&A.zap(0.4);
        for(let i=0;i<3;i++){ setTimeout(()=>{ this.bolt(from,to,0xffe94a,0.06,0.35,8); },i*70); }
        await wait(180); break;
      case 'lightning': { A&&A.thunder();
        const sky=to.clone().add(V(rand(-.5,.5),9,0)); this.stage.shakeCam(0.12);
        for(let i=0;i<4;i++){ setTimeout(()=>{ this.bolt(sky,to.clone().add(V(0,-0.6,0)),0xfff59a,0.16,0.9,14); this.flash(to.clone().add(V(0,2,0)),0xbfe0ff,60,90); },i*90); }
        await wait(260); break; }
      case 'frostbreath': A&&A.whoosh(0.7,true);
        for(let i=0;i<this.n(90);i++){ setTimeout(()=>{ const d=to.clone().add(V(rand(-.4,.4),rand(-.3,.3),rand(-.4,.4))).sub(from); this.add.spawn({pos:from.clone(),vel:d.multiplyScalar(rand(1.8,2.4)),life:0.55,size:0.15,size1:0.9,color:0xdffaff,color2:0x5fc8ff,tile:Math.random()<0.25?6:1,alpha:0.7,drag:0.6}); }, i*6); }
        await wait(480); break;
      case 'iceshards': { A&&A.crack();
        const shards=[]; for(let i=0;i<5;i++){ const g=new THREE.OctahedronGeometry(0.18,0); g.scale(0.6,1.8,0.6); const m=new THREE.Mesh(g,new THREE.MeshPhysicalMaterial({color:0xcff6ff,roughness:0.05,metalness:0.1,transmission:0.0,transparent:true,opacity:0.88,emissive:0x2a7bbf,emissiveIntensity:0.6})); shards.push(m); }
        shards.forEach((m,i)=>setTimeout(()=>this.projectile(from.clone().add(V(rand(-.5,.5),rand(0,.8),rand(-.5,.5))),to.clone().add(V(rand(-.3,.3),rand(-.3,.3),rand(-.3,.3))),{color:0x9fe8ff,radius:0.05,glow:1,dur:0.4,arc:0.8,mesh:m,spin:12,trail:p=>this.add.spawn({pos:p,life:0.3,size:0.25,size1:0,color:0xdffaff,tile:2})}),i*60));
        await wait(560); break; }
      case 'shadoworb': case 'nightmare': case 'drain': {
        A&&A.dark(fx==='nightmare'?1:0.6);
        if(fx==='nightmare'){ this.stage.flashScreen && this.stage.flashScreen('#200040',0.5); }
        await this.projectile(from,to,{color:0x8a3cff,radius:fx==='nightmare'?0.4:0.28,dur:0.6,arc:0.4,glow:2,trail:p=>{ this.add.spawn({pos:p.clone().add(V(rand(-.15,.15),rand(-.15,.15),rand(-.15,.15))),life:0.5,size:0.6,size1:0.1,color:0xb066ff,color2:0x2a0050,tile:0}); this.norm.spawn({pos:p,vel:V(rand(-.4,.4),rand(-.2,.4),rand(-.4,.4)),life:0.9,size:0.35,size1:0.9,color:0x1a0628,alpha:0.6,tile:1}); }});
        if(fx==='drain'){ setTimeout(()=>{ for(let i=0;i<this.n(30);i++){ const s=to.clone().add(V(rand(-.4,.4),rand(-.4,.4),rand(-.4,.4))); const d=this.chest(att).sub(s); this.add.spawn({pos:s,vel:d.multiplyScalar(1.4),life:0.7,size:0.25,size1:0.1,color:0xd08cff,color2:0x8dff9a,tile:2}); } }, 250); }
        break; }
      case 'rock': { A&&A.whoosh(0.4);
        const g=new THREE.IcosahedronGeometry(0.32,1); const pa=g.attributes.position; for(let i=0;i<pa.count;i++){ const v=V().fromBufferAttribute(pa,i); v.multiplyScalar(rand(0.8,1.2)); pa.setXYZ(i,v.x,v.y,v.z); } g.computeVertexNormals();
        const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x8a6a4a,roughness:0.95,flatShading:true})); m.castShadow=true;
        await this.projectile(from.clone().add(V(0,0.4,0)),to,{color:0xc08a4a,radius:0.05,glow:1,dur:0.55,arc:1.4,mesh:m,light:0,trail:p=>{ if(Math.random()<0.4) this.norm.spawn({pos:p,vel:V(0,0.3,0),life:0.6,size:0.2,size1:0.6,color:0xb89a7a,alpha:0.5,tile:1}); }});
        A&&A.thud(0.8); break; }
      case 'quake': { A&&A.quake();
        att.play('Jump',{once:true,speed:1.4}); await wait(450);
        this.stage.shakeCam(0.35);
        const start=att.holder.position.clone().setY(0.05), end=tgt.holder.position.clone().setY(0.05);
        for(let i=0;i<=12;i++){ setTimeout(()=>{ const p=start.clone().lerp(end,i/12); this.norm.spawn({pos:p.clone().add(V(0,0.2,0)),vel:V(rand(-1,1),rand(2,4),rand(-1,1)),life:0.8,size:0.5,size1:1.3,color:0xa88a6a,alpha:0.7,tile:1,gravity:3});
          for(let j=0;j<3;j++) this.norm.spawn({pos:p.clone(),vel:V(rand(-1.5,1.5),rand(3,6),rand(-1.5,1.5)),life:0.9,size:0.14,size1:0.12,color:0x6b4a2a,tile:6,gravity:12,spin:rand(-8,8)}); this.ring(p,0xd9a066,1.2,0.4,true); }, i*30); }
        await wait(380); break; }
      case 'windslash': A&&A.whoosh(0.35);
        for(let i=0;i<3;i++){ setTimeout(()=>{ const s=from.clone(); const d=to.clone().sub(s); for(let j=0;j<this.n(14);j++){ const off=(j-7)*0.06; this.add.spawn({pos:s.clone().add(V(0,off,off*0.5)),vel:d.clone().multiplyScalar(3),life:0.33,size:0.3,size1:0.15,color:0xe8fff6,color2:0x7fe8c0,tile:0,alpha:0.8}); } }, i*80); }
        await wait(300); break;
      case 'tornado': case 'feathers': { A&&A.whoosh(1.0,true);
        const c=tgt.holder.position.clone();
        for(let i=0;i<this.n(fx==='tornado'?140:60);i++){ setTimeout(()=>{ (fx==='feathers'?this.norm:this.add).spawn({pos:c, orbit:{c:c.clone(),a:Math.random()*6.28,w:rand(6,10),r:rand(0.3,0.6),vr:0.9,y:rand(0,0.5),vy:rand(1.5,3)}, life:0.9, size: fx==='feathers'?0.28:rand(0.25,0.55), size1: fx==='feathers'?0.25:0.9, color: fx==='feathers'?0xffffff:0xd8fff0, color2: fx==='feathers'?0xdfeee8:0x7fe8c0, tile: fx==='feathers'?5:1, alpha:fx==='feathers'?1:0.55, spin:8}); }, i*4); }
        await wait(500); break; }
      default: {
        // ultimates: big cinematic versions
        if(fx && fx.startsWith('ult_')) return this.ultimate(att,tgt,type);
        await this.projectile(from,to,{color:c1,dur:0.45});
      }
    }
    return {impact:to};
  }
  async ultimate(att,tgt,type){
    const [c1,c2]=TC[type]||TC.neutral, A=this.audio, st=this.stage;
    const to=this.chest(tgt), ap=att.holder.position.clone();
    // charge up close-up
    const f=this.fwd(att); const side=V(-f.z,0,f.x);
    st.camOverride={pos:ap.clone().addScaledVector(f,3.6).addScaledVector(side,1.5).add(V(0,1.6,0)), look:ap.clone().add(V(0,1.2,0)), speed:5};
    A&&A.charge(); att.play('Jump',{once:true,speed:0.8});
    const stop=this.emitter(()=>{ for(let i=0;i<Math.ceil(4*this.q);i++){ const a=Math.random()*6.28, r=rand(1.2,2.2); const s=ap.clone().add(V(Math.cos(a)*r,rand(0.2,2.4),Math.sin(a)*r)); const d=ap.clone().add(V(0,1.2,0)).sub(s); this.add.spawn({pos:s,vel:d.multiplyScalar(2.2),life:0.45,size:0.25,size1:0.05,color:c1,color2:0xffffff,tile:2}); } });
    this.ring(ap.clone().add(V(0,0.05,0)),c1,4,1.0,true);
    await wait(1100); stop();
    this.flash(ap.clone().add(V(0,1.5,0)),c1,80,40); this.burst(ap.clone().add(V(0,1.2,0)),{count:60,color:0xffffff,color2:c1,tile:2,speed:7,size:0.6,life:0.6});
    st.camOverride={pos:st.camTarget.pos.clone().multiplyScalar(1.12).add(V(0,0.6,0)), look:to.clone().lerp(ap,0.3), speed:3};
    att.play(att.actions.Weapon?'Weapon':'Punch',{once:true,speed:1.1});
    await wait(250);
    const tp=tgt.holder.position.clone();
    switch(type){
      case 'fire': { A&&A.fire(1.5);
        const sky=ap.clone().add(V(0,4.5,0));
        await this.projectile(this.head(att),sky,{color:0xff6a00,radius:0.4,dur:0.35,arc:0,trail:p=>this.add.spawn({pos:p,life:0.4,size:1,size1:0.2,color:0xffc04a,color2:0xff2a00,tile:3})});
        const ball=new THREE.Mesh(new THREE.SphereGeometry(0.9,24,16),new THREE.MeshBasicMaterial({color:new THREE.Color(0xff7a1a).multiplyScalar(3),toneMapped:false})); ball.position.copy(sky); this.scene.add(ball);
        await this.tween(0.55,(k)=>{ ball.scale.setScalar(0.4+k*0.9); for(let i=0;i<4;i++) this.add.spawn({pos:sky.clone().add(V(rand(-1,1),rand(-1,1),rand(-1,1))),vel:V(rand(-1,1),rand(-1,1),rand(-1,1)),life:0.4,size:1.3,size1:0.3,color:0xffd27a,color2:0xff2000,tile:3}); });
        const s0=sky.clone(); await this.tween(0.32,(k)=>{ ball.position.lerpVectors(s0,to,k*k); this.add.spawn({pos:ball.position.clone(),life:0.5,size:1.6,size1:0.3,color:0xffc04a,color2:0xff2a00,tile:3}); });
        this.scene.remove(ball); ball.geometry.dispose(); ball.material.dispose();
        for(let i=0;i<this.n(120);i++) this.add.spawn({pos:to.clone(),vel:V(rand(-1,1),rand(-0.2,1),rand(-1,1)).normalize().multiplyScalar(rand(2,8)),life:rand(0.6,1.1),size:rand(0.8,1.6),size1:0.2,color:0xffe0a0,color2:0xff1a00,tile:3,drag:2.5});
        for(let i=0;i<this.n(40);i++) this.norm.spawn({pos:to.clone(),vel:V(rand(-1,1),rand(0.3,1.5),rand(-1,1)).multiplyScalar(2.5),life:1.6,size:0.8,size1:2.4,color:0x6a6058,alpha:0.4,tile:1,drag:1.5});
        break; }
      case 'water': { A&&A.splash(2);
        await this.tween(1.0,(k)=>{ for(let i=0;i<Math.ceil(10*this.q);i++) this.add.spawn({pos:tp.clone(), orbit:{c:tp.clone(),a:Math.random()*6.28,w:rand(5,8),r:rand(0.6,1.1)*(1+k),vr:0.3,y:rand(0,0.3),vy:rand(3,6)}, life:0.8, size:rand(0.3,0.6), size1:0.3, color:0x9ae0ff, color2:0x1a5cff, tile:4}); });
        for(let i=0;i<this.n(140);i++) this.add.spawn({pos:to.clone(),vel:V(rand(-1,1),rand(0,1.5),rand(-1,1)).multiplyScalar(5),life:1,size:0.4,size1:0.2,color:0xbfeaff,color2:0x2a7bff,tile:4,gravity:9});
        break; }
      case 'grass': { A&&A.whoosh(1.4);
        for(let v=0;v<6;v++){ const a=v/6*6.28; const base=tp.clone().add(V(Math.cos(a)*1.6,0,Math.sin(a)*1.6)); const curve=new THREE.CatmullRomCurve3([base, base.clone().lerp(tp,0.3).add(V(0,2.4,0)), to]);
          const geo=new THREE.TubeGeometry(curve,48,0.12,8,false); const mat=new THREE.MeshStandardMaterial({color:0x2f9b3a,roughness:0.6,emissive:0x0a3a10}); const m=new THREE.Mesh(geo,mat); this.scene.add(m); const tot=geo.index.count;
          this.tween(1.2,(k)=>{ geo.setDrawRange(0,Math.floor(tot*Math.min(1,k*2))); if(k>=1){ this.scene.remove(m); geo.dispose(); mat.dispose(); } }); }
        await this.tween(0.8,(k)=>{ for(let i=0;i<Math.ceil(6*this.q);i++) this.norm.spawn({pos:tp.clone(), orbit:{c:tp.clone(),a:Math.random()*6.28,w:rand(4,7),r:rand(1,2.2),vr:-0.8,y:rand(0,0.5),vy:rand(1,3)}, life:0.9, size:0.3, color:0x7dff6a, color2:0x1f8b2a, tile:5, spin:6}); });
        this.beam(tp.clone().add(V(0,9,0)),tp.clone(),0x8dff7a,0.5,0.7);
        break; }
      case 'electric': { A&&A.thunder(); A&&setTimeout(()=>A.thunder(),300);
        for(let i=0;i<9;i++){ setTimeout(()=>{ this.bolt(to.clone().add(V(rand(-2,2),10,rand(-2,2))),to.clone().add(V(rand(-.5,.5),-0.8,rand(-.5,.5))),0xfff59a,0.2,1.0,16); this.flash(to.clone().add(V(0,2,0)),0xcfe6ff,80,80); st.shakeCam(0.15); },i*80); }
        await wait(820);
        const orb=new THREE.Mesh(new THREE.SphereGeometry(1.2,24,16),new THREE.MeshBasicMaterial({color:new THREE.Color(0x9fd8ff).multiplyScalar(2.5),transparent:true,opacity:0.7,blending:THREE.AdditiveBlending,toneMapped:false})); orb.position.copy(to); this.scene.add(orb);
        this.tween(0.5,(k)=>{ orb.scale.setScalar(0.3+k*1.4); orb.material.opacity=0.7*(1-k); if(k>=1){ this.scene.remove(orb); orb.geometry.dispose(); orb.material.dispose(); } });
        break; }
      case 'ice': { A&&A.crack();
        const crys=[]; for(let i=0;i<10;i++){ const g=new THREE.OctahedronGeometry(0.35,0); g.scale(0.5,rand(2,3.5),0.5); const m=new THREE.Mesh(g,new THREE.MeshPhysicalMaterial({color:0xd8f8ff,roughness:0.05,metalness:0.1,transparent:true,opacity:0.85,emissive:0x2a7bbf,emissiveIntensity:0.7})); const a=i/10*6.28; m.position.copy(tp).add(V(Math.cos(a)*1.1,-1.5,Math.sin(a)*1.1)); m.rotation.set(rand(-.4,.4),0,rand(-.4,.4)); m.lookAt(tp.clone().add(V(0,3,0))); m.rotateX(Math.PI/2); this.scene.add(m); crys.push(m); }
        await this.tween(0.7,(k)=>{ crys.forEach(m=>{ m.position.y=-1.5+k*1.7; }); });
        await wait(250); A&&A.crack();
        crys.forEach(m=>{ this.burst(m.position.clone().add(V(0,0.5,0)),{count:12,color:0xdffaff,color2:0x5fc8ff,tile:6,speed:6,size:0.3,size1:0.2,life:0.8,gravity:9,normal:true}); this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
        break; }
      case 'earth': { A&&A.quake();
        for(let i=0;i<5;i++){ setTimeout(()=>{ const g=new THREE.IcosahedronGeometry(rand(0.4,0.7),1); const pa=g.attributes.position; for(let j=0;j<pa.count;j++){ const v=V().fromBufferAttribute(pa,j).multiplyScalar(rand(0.8,1.2)); pa.setXYZ(j,v.x,v.y,v.z);} g.computeVertexNormals();
          const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x7a5a3a,roughness:0.95,flatShading:true,emissive:0x3a1000})); m.castShadow=true;
          const dst=to.clone().add(V(rand(-.6,.6),-0.5,rand(-.6,.6)));
          this.projectile(dst.clone().add(V(rand(2,4),11,rand(-2,2))),dst,{color:0xff7a2a,radius:0.05,glow:1,dur:0.5,arc:0,mesh:m,trail:p=>{ this.add.spawn({pos:p,life:0.4,size:0.8,size1:0.2,color:0xffa040,color2:0xff2000,tile:3}); this.norm.spawn({pos:p,life:1,size:0.5,size1:1.4,color:0x3a3028,alpha:0.5,tile:1}); }}).then(()=>{ A&&A.thud(1); st.shakeCam(0.25); this.ring(dst.clone().setY(0.05),0xd9a066,2.5,0.5,true); this.burst(dst,{count:30,color:0x8a6a4a,tile:1,speed:4,size:0.6,size1:1.2,life:1,normal:true,upOnly:true,gravity:2}); });
        },i*170); }
        await wait(1150); break; }
      case 'shadow': { A&&A.dark(1.5); st.flashScreen && st.flashScreen('#0a0014',0.9);
        const orb=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshBasicMaterial({color:0x05000a})); orb.position.copy(tp).add(V(0,3.2,0)); this.scene.add(orb);
        const halo=()=>{ for(let i=0;i<Math.ceil(5*this.q);i++){ const a=Math.random()*6.28; this.add.spawn({pos:orb.position.clone().add(V(Math.cos(a)*1.05*orb.scale.x,Math.sin(a)*1.05*orb.scale.x,0)),vel:V(Math.cos(a),Math.sin(a),0).multiplyScalar(0.6),life:0.5,size:0.5,size1:0.1,color:0xc080ff,color2:0x4a00a0,tile:0}); } };
        await this.tween(0.8,(k)=>{ orb.scale.setScalar(0.2+k); orb.quaternion.copy(st.camera.quaternion); halo(); });
        this.beam(orb.position.clone(),to.clone().add(V(0,-0.5,0)),0x9b5cff,0.6,0.55);
        await wait(300); this.tween(0.4,(k)=>{ orb.scale.setScalar(1.2*(1-k)+0.01); if(k>=1){ this.scene.remove(orb); orb.geometry.dispose(); orb.material.dispose(); } });
        break; }
      case 'wind': default: { A&&A.whoosh(1.6,true);
        await this.tween(1.1,(k)=>{ for(let i=0;i<Math.ceil(14*this.q);i++) this.add.spawn({pos:tp.clone(), orbit:{c:tp.clone(),a:Math.random()*6.28,w:rand(7,11),r:rand(0.4,0.8)+k*0.6,vr:1.2,y:rand(0,0.3),vy:rand(3,6)}, life:0.8, size:rand(0.4,0.8), size1:1.2, color:0xe8fff6, color2:0x7fe8c0, tile:1, alpha:0.5}); });
        break; }
    }
    this.flash(to,c1,90,40); st.shakeCam(0.45); A&&A.boom(1.2);
    this.ring(to,c1,5,0.6); this.burst(to,{count:80,color:0xffffff,color2:c1,tile:2,speed:9,size:0.7,life:0.7});
    setTimeout(()=>{ st.camOverride=null; }, 900);
    return {impact:to, ult:true};
  }
  impact(tgt,type,strength=1,crit=false){
    const [c1,c2]=TC[type]||TC.neutral; const p=this.chest(tgt);
    this.flash(p,c1,25+30*strength,50);
    this.burst(p,{count:20+30*strength,color:0xffffff,color2:c1,tile:2,speed:4+4*strength,size:0.45,life:0.45});
    this.burst(p,{count:10+10*strength,color:c1,color2:c2,tile:0,speed:2,size:0.7,size1:0.1,life:0.5});
    if(type==='fire') this.burst(p,{count:20,color:0xffd27a,color2:0xff2000,tile:3,speed:3,size:0.8,life:0.6,vel:V(0,1.5,0)});
    if(type==='water'||type==='ice') this.burst(p,{count:24,color:0xcff2ff,color2:c2,tile:type==='ice'?6:4,speed:5,size:0.3,life:0.7,gravity:9});
    if(type==='earth') this.burst(p,{count:16,color:0x8a6a4a,tile:6,speed:5,size:0.22,size1:0.2,life:0.8,gravity:12,normal:true});
    if(type==='grass') this.burst(p,{count:16,color:0x7dff6a,color2:0x1f8b2a,tile:5,speed:4,size:0.3,size1:0.25,life:0.9,gravity:3,normal:true});
    if(type==='shadow') this.burst(p,{count:14,color:0x1a0628,tile:1,speed:2,size:0.6,size1:1.4,life:0.9,normal:true,alpha:0.7});
    this.ring(p,c1,1.6+strength*1.2,0.35);
    this.stage.shakeCam(0.08+0.14*strength+(crit?0.12:0));
  }
  statusPuff(mon,status){
    const p=this.chest(mon); const col={burn:0xff6a1a,paralyze:0xffe94a,sleep:0xcfd8ff,freeze:0xaeeaff,curse:0x9b5cff}[status]||0xffffff;
    if(status==='sleep'){ for(let i=0;i<6;i++) this.add.spawn({pos:this.head(mon),vel:V(rand(-.3,.3),0.8,rand(-.3,.3)),life:1.4,size:0.25,size1:0.45,color:col,tile:7,alpha:0.7}); return; }
    this.burst(p,{count:26,color:col,color2:0xffffff,tile:status==='burn'?3:(status==='freeze'?6:(status==='curse'?1:2)),speed:2.5,size:0.45,life:0.8,vel:V(0,1,0)});
    if(status==='paralyze') for(let i=0;i<3;i++) setTimeout(()=>this.bolt(p.clone().add(V(rand(-.6,.6),rand(-.6,.6),0)),p.clone().add(V(rand(-.6,.6),rand(-.6,.6),0)),0xfff59a,0.04,0.25,5),i*90);
  }
  statArrows(mon,up,type){
    const p=mon.holder.position.clone(); const col=up?(TC[type]||TC.neutral)[0]:0x8888ff;
    for(let i=0;i<this.n(36);i++){ const a=Math.random()*6.28, r=rand(0.3,1); this.add.spawn({pos:p.clone().add(V(Math.cos(a)*r,up?rand(0,0.5):rand(1.8,2.4),Math.sin(a)*r)),vel:V(0,up?rand(2,3.5):-rand(1.5,2.5),0),life:0.8,size:0.25,size1:0.1,color:col,color2:0xffffff,tile:2}); }
    this.ring(p.clone().add(V(0,up?0.1:2.2,0)),col,2.5,0.6,true);
  }
  aura(mon,type){
    const [c1,c2]=TC[type]||TC.neutral;
    return this.emitter(()=>{ if(!mon.alive) return false; if(Math.random()<0.55*this.q+0.2){ const a=Math.random()*6.28, r=rand(0.5,0.95)*mon.inner.scale.x; const p=mon.holder.position.clone().add(V(Math.cos(a)*r,rand(0,0.4),Math.sin(a)*r)); this.add.spawn({pos:p,vel:V(0,rand(1.2,2.4),0),life:rand(0.6,1.1),size:rand(0.25,0.45),size1:0.05,color:c1,color2:c2,tile:type==='fire'?3:0,alpha:0.85}); } });
  }
  statusLoop(mon,status){
    if(!status) return ()=>{};
    return this.emitter((dt)=>{ if(!mon.alive) return false; if(Math.random()>dt*6) return; const p=this.chest(mon).add(V(rand(-.5,.5),rand(-.4,.6),rand(-.5,.5)));
      if(status==='burn') this.add.spawn({pos:p,vel:V(0,1.2,0),life:0.6,size:0.35,size1:0.05,color:0xffb347,color2:0xff2000,tile:3});
      else if(status==='paralyze'){ if(Math.random()<0.4) this.bolt(p,p.clone().add(V(rand(-.4,.4),rand(-.4,.4),rand(-.3,.3))),0xfff59a,0.03,0.2,4); }
      else if(status==='freeze') this.add.spawn({pos:p,vel:V(0,0.3,0),life:0.8,size:0.18,color:0xdffaff,tile:6});
      else if(status==='curse') this.norm.spawn({pos:p,vel:V(0,0.5,0),life:1,size:0.3,size1:0.8,color:0x3a0a5a,alpha:0.6,tile:1});
      else if(status==='sleep'){ if(Math.random()<0.25) this.add.spawn({pos:this.head(mon),vel:V(0.2,0.6,0),life:1.3,size:0.2,size1:0.4,color:0xcfd8ff,tile:7,alpha:0.6}); }
    });
  }
  summon(mon,type){
    const [c1]=TC[type]||TC.neutral; const p=mon.holder.position.clone();
    this.ring(p.clone().add(V(0,0.05,0)),c1,3,0.6,true); this.flash(p.clone().add(V(0,1,0)),c1,40,40);
    for(let i=0;i<this.n(50);i++){ const a=Math.random()*6.28; this.add.spawn({pos:p.clone().add(V(Math.cos(a)*0.8,0.1,Math.sin(a)*0.8)),vel:V(0,rand(2,5),0),life:0.7,size:0.3,size1:0.05,color:0xffffff,color2:c1,tile:2}); }
    this.audio&&this.audio.summon();
  }
}
