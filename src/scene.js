
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GroundedSkybox } from 'three/examples/jsm/objects/GroundedSkybox.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { MONSTERS, TYPE_INFO } from './engine.js';

export const ARENAS = {
  meadow:{name:'Sunny Meadow', sky:'meadow', height:7, radius:140, sun:[0.60,0.34], sunColor:0xfff1dc, sunI:2.6, env:1.0, exposure:1.0, motes:'pollen'},
  canyon:{name:'Red Canyon', sky:'canyon', height:7, radius:140, sun:[0.60,0.23], sunColor:0xffe2c0, sunI:2.8, env:1.0, exposure:0.95, motes:'dust'},
  snow:{name:'Frozen Field', sky:'snow', height:7, radius:140, sun:[0.60,0.375], sunColor:0xeef4ff, sunI:2.2, env:0.9, exposure:0.92, motes:'snow'},
  city:{name:'Neon Harbor', sky:'city', height:7, radius:140, sun:[0.25,0.20], sunColor:0xbfd4ff, sunI:1.2, env:1.4, exposure:1.15, motes:'neon'},
};
export const ARENA_IDS = Object.keys(ARENAS);

const V = (x,y,z)=>new THREE.Vector3(x,y,z);
const clock = new THREE.Clock();

export class Stage {
  constructor(canvas, quality){
    this.canvas = canvas; this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({canvas, antialias: quality!=='high', powerPreference:'high-performance', alpha:false});
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = quality==='high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.maxPR = Math.min(window.devicePixelRatio||1, quality==='high' ? (/Android|iPhone|Mobile/i.test(navigator.userAgent) ? 1.6 : 2) : 1.25); this.pr = this.maxPR;
    r.setPixelRatio(this.pr); this._adaptT = performance.now()+4000; this.lowFrames = 0;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 600);
    this.pmrem = new THREE.PMREMGenerator(r);
    this.loader = new GLTFLoader();
    this.texLoader = new THREE.TextureLoader();
    this.models = {}; this.faceInfo = {};
    this.updaters = new Set();
    this.shake = 0; this.camTarget = {pos:V(0,3,9), look:V(0,1,0)}; this.camCur = {pos:V(0,3,9), look:V(0,1,0)}; this.camOverride=null;
    this.camLerp = 2.5;
    // lights
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x404030, 0.35); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.castShadow = true; const sm = quality==='high'?2048:1024; this.sun.shadow.mapSize.set(sm,sm);
    const sc = this.sun.shadow.camera; sc.left=-7; sc.right=7; sc.top=7; sc.bottom=-7; sc.near=1; sc.far=60; this.sun.shadow.bias=-0.0005; this.sun.shadow.normalBias=0.02; this.sun.shadow.radius = 4;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.rim = new THREE.DirectionalLight(0xbfdcff, 0.9); this.rim.position.set(-4,5,-8); this.scene.add(this.rim);
    // shadow catcher
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(60,60), new THREE.ShadowMaterial({opacity:0.42}));
    this.ground.rotation.x = -Math.PI/2; this.ground.position.y = 0.002; this.ground.receiveShadow = true; this.scene.add(this.ground);
    this.ring = this.makeRing(); this.scene.add(this.ring);
    this.motes = null;
    if(quality==='high'){
      const rt = new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType, samples:4});
      this.composer = new EffectComposer(r, rt);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256,256), 0.55, 0.45, 0.92);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
    this.resize(); window.addEventListener('resize', ()=>this.resize());
    this.fps = 60; this._frames=0; this._fpsT=performance.now();
    this.running = true;
    r.setAnimationLoop(()=>this.frame());
  }
  makeRing(){
    const c = document.createElement('canvas'); c.width=c.height=1024; const g=c.getContext('2d');
    g.translate(512,512);
    const ringAt=(rad,w,a)=>{ g.beginPath(); g.arc(0,0,rad,0,Math.PI*2); g.lineWidth=w; g.strokeStyle=`rgba(255,255,255,${a})`; g.stroke(); };
    g.shadowColor='rgba(255,255,255,0.9)'; g.shadowBlur=18;
    ringAt(470,10,0.55); ringAt(440,3,0.35);
    for(let i=0;i<48;i++){ const a=i/48*Math.PI*2; g.save(); g.rotate(a); g.fillStyle='rgba(255,255,255,0.35)'; g.fillRect(452,-2,14,4); g.restore(); }
    g.beginPath(); g.moveTo(-440,0); g.lineTo(440,0); g.lineWidth=4; g.strokeStyle='rgba(255,255,255,0.25)'; g.stroke();
    ringAt(90,6,0.45);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(9,9), new THREE.MeshBasicMaterial({map:t, transparent:true, depthWrite:false, opacity:0.55, toneMapped:false}));
    m.rotation.x = -Math.PI/2; m.position.y = 0.01; m.renderOrder = 1;
    return m;
  }
  resize(){
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w,h,false); this.camera.aspect = w/h; this.portrait = h > w*1.05; this.camera.fov = this.portrait ? 56 : 40; this.camera.updateProjectionMatrix();
    if(this.composer){ this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(w,h); }
    this.portrait = h > w*1.05;
    if(this.onResize) this.onResize();
  }
  async loadArena(id){
    const A = ARENAS[id] || ARENAS.meadow; this.arenaId = id;
    const url = `assets/arenas/${A.sky}-${this.quality==='high'?'hi':'lo'}.jpg`;
    const tex = await this.texLoader.loadAsync(url);
    tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
    if(this.sky){ this.scene.remove(this.sky); this.sky.geometry.dispose(); this.sky.material.map.dispose(); }
    if(this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromEquirectangular(tex);
    this.scene.environment = this.envRT.texture; this.scene.environmentIntensity = A.env;
    this.sky = new GroundedSkybox(tex, A.height, A.radius, this.quality==='high'?96:48);
    this.sky.position.y = A.height - 0.01; this.scene.add(this.sky);
    // sun from the photo's brightest spot (u,v)
    const az = (A.sun[0]-0.5)*Math.PI*2, el = Math.max(0.35,(0.5-A.sun[1])*Math.PI);
    const d = V(Math.cos(el)*Math.cos(az), Math.sin(el), Math.cos(el)*Math.sin(az)).normalize();
    this.sun.position.copy(d.multiplyScalar(25)); this.sun.color.set(A.sunColor); this.sun.intensity = A.sunI;
    this.renderer.toneMappingExposure = A.exposure;
    this.setMotes(A.motes);
  }
  setMotes(kind){
    if(this.motes){ this.scene.remove(this.motes); this.motes.geometry.dispose(); }
    const n = this.quality==='high' ? 160 : 60;
    const g = new THREE.BufferGeometry(); const p = new Float32Array(n*3); const s=new Float32Array(n);
    for(let i=0;i<n;i++){ p[i*3]=(Math.random()-0.5)*16; p[i*3+1]=Math.random()*5; p[i*3+2]=(Math.random()-0.5)*12; s[i]=Math.random(); }
    g.setAttribute('position', new THREE.BufferAttribute(p,3)); g.setAttribute('seed', new THREE.BufferAttribute(s,1));
    const col = {pollen:0xfff3b0, dust:0xffc58a, snow:0xffffff, neon:0x7fe9ff}[kind]||0xffffff;
    const mat = new THREE.ShaderMaterial({ transparent:true, depthWrite:false, blending: kind==='snow'?THREE.NormalBlending:THREE.AdditiveBlending,
      uniforms:{ t:{value:0}, color:{value:new THREE.Color(col)}, fall:{value: kind==='snow'?1:0}, px:{value:this.renderer.getPixelRatio()} },
      vertexShader:`attribute float seed; uniform float t; uniform float fall; uniform float px; varying float vA;
        void main(){ vec3 p=position; float ph=seed*6.283;
          p.x += sin(t*0.3+ph)*0.6; p.z += cos(t*0.25+ph*1.3)*0.5;
          p.y = mod(p.y + (fall>0.5? -t*0.6 : t*0.12) + seed*5.0, 5.0);
          vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv;
          gl_PointSize = (fall>0.5? 6.0: 4.0)*px*(6.0/-mv.z)*(0.6+seed);
          vA = (0.35+0.65*abs(sin(t*0.8+ph*3.0))) * smoothstep(0.0,0.6,p.y) * smoothstep(5.0,3.8,p.y); }`,
      fragmentShader:`uniform vec3 color; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d); gl_FragColor=vec4(color*1.4, a*vA*0.8); }`
    });
    this.motes = new THREE.Points(g, mat); this.motes.frustumCulled=false; this.scene.add(this.motes);
  }
  async loadModel(id, onProgress){
    if(this.models[id]) return this.models[id];
    const gltf = await this.loader.loadAsync(`assets/monsters/${id}.glb`, onProgress);
    const root = gltf.scene;
    root.traverse(o=>{ if(o.isMesh){ o.castShadow = true; o.receiveShadow = false;
      const m = o.material; if(m && m.isMeshStandardMaterial){ m.roughness = 0.62; m.metalness = 0.0; m.envMapIntensity = 0.9; if(m.map){ m.map.anisotropy = 4; } } } });
    // normalize: height 2.1, feet at 0
    const mixer = new THREE.AnimationMixer(root); const idle = gltf.animations.find(a=>a.name==='Idle'); if(idle){ mixer.clipAction(idle).play(); mixer.update(0.01); }
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root); const size = box.getSize(V());
    const scale = 2.1 / size.y;
    mixer.stopAllAction(); root.updateMatrixWorld(true);
    this.models[id] = { gltf, scale, yOff: -box.min.y*scale, face: this.computeFace(root) };
    return this.models[id];
  }
  computeFace(root){
    // find vertices driven by the Head bone, in Head-bone space, to place a photo mask on the face
    let sk=null; root.traverse(o=>{ if(o.isSkinnedMesh && !sk) sk=o; });
    if(!sk) return null;
    root.updateMatrixWorld(true); sk.skeleton.pose(); root.updateMatrixWorld(true);
    const bones = sk.skeleton.bones; const hi = bones.findIndex(b=>/^Head$/i.test(b.name)); if(hi<0) return null;
    const pos = sk.geometry.attributes.position, si = sk.geometry.attributes.skinIndex, sw = sk.geometry.attributes.skinWeight;
    const M = new THREE.Matrix4().multiplyMatrices(sk.skeleton.boneInverses[hi], sk.bindMatrix);
    const pts=[]; const v=V();
    for(let i=0;i<pos.count;i++){
      let w=0; for(let k=0;k<4;k++){ if(si.getComponent(i,k)===hi) w+=sw.getComponent(i,k); }
      if(w>0.6){ v.fromBufferAttribute(pos,i).applyMatrix4(M); pts.push(v.clone()); }
    }
    if(pts.length<20) return null;
    const head = bones[hi]; head.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(head.matrixWorld).invert();
    const rootInv = new THREE.Matrix4().copy(root.matrixWorld); // root at identity here
    const fwd = V(0,0,1).transformDirection(inv).normalize();
    const up0 = V(0,1,0).transformDirection(inv).normalize();
    const right = new THREE.Vector3().crossVectors(up0, fwd).normalize();
    const up = new THREE.Vector3().crossVectors(fwd, right).normalize();
    const proj=(a,axis)=>pts.map(p=>p.dot(axis)).sort((x,y)=>x-y);
    const pct=(arr,q)=>arr[Math.min(arr.length-1,Math.max(0,Math.floor(q*(arr.length-1))))];
    const pf=proj(pts,fwd), pr=proj(pts,right), pu=proj(pts,up);
    const front = pct(pf,0.97);
    // centre: average of the frontmost third of head vertices
    const band = pts.filter(p=>p.dot(fwd) > pct(pf,0.7));
    const c = band.reduce((a,p)=>a.add(p), V()).multiplyScalar(1/band.length);
    const cr = c.dot(right), cu = c.dot(up);
    const width = pct(pr,0.9)-pct(pr,0.1), height = pct(pu,0.92)-pct(pu,0.08);
    const radius = Math.min(width, height)*0.6;
    const center = new THREE.Vector3().addScaledVector(right,cr).addScaledVector(up,cu).addScaledVector(fwd, front);
    return { boneName: head.name, center, fwd, up, right, radius, depth: pct(pf,0.97)-pct(pf,0.5) };
  }
  createMonster(id, faceCanvas){
    const M = this.models[MONSTERS[id].model];
    const obj = SkeletonUtils.clone(M.gltf.scene);
    // own materials per instance (hit flash, fades)
    const mats=[];
    obj.traverse(o=>{ if(o.isMesh){ o.material = o.material.clone(); o.material.emissive = new THREE.Color(0,0,0); mats.push(o.material); o.castShadow=true; } });
    const holder = new THREE.Group(); const inner = new THREE.Group();
    inner.add(obj); obj.scale.setScalar(M.scale); obj.position.y = M.yOff;
    holder.add(inner);
    const mixer = new THREE.AnimationMixer(obj); const actions = {};
    for(const clip of M.gltf.animations){ actions[clip.name] = mixer.clipAction(clip); }
    const mon = { id, holder, inner, obj, mixer, actions, mats, current:null, face:null, baseScale:1, alive:true };
    mon.play = (name, opts={})=>{
      const a = actions[name]; if(!a) return 0;
      const fade = opts.fade ?? 0.18;
      a.reset(); a.enabled = true; a.setEffectiveTimeScale(opts.speed||1); a.setEffectiveWeight(1);
      if(opts.once){ a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } else a.setLoop(THREE.LoopRepeat, Infinity);
      if(mon.current && mon.current!==a) mon.current.crossFadeTo(a, fade, false); 
      a.play(); mon.current = a;
      if(opts.once && opts.back!==false){
        const dur = a.getClip().duration/(opts.speed||1);
        clearTimeout(mon._bt); mon._bt = setTimeout(()=>{ if(mon.current===a && mon.alive) mon.play(opts.back||'Idle',{fade:0.25}); }, Math.max(50,dur*1000-250));
      }
      return a.getClip().duration/(opts.speed||1);
    };
    mon.play('Idle',{fade:0}); mixer.update(Math.random()*2);
    if(faceCanvas) this.setFace(mon, faceCanvas);
    const upd = dt=>mixer.update(dt); this.updaters.add(upd);
    mon.dispose = ()=>{ this.updaters.delete(upd); if(holder.parent) holder.parent.remove(holder); mixer.stopAllAction(); mats.forEach(m=>m.dispose()); if(mon.face){ mon.face.material.map.dispose(); mon.face.material.dispose(); mon.face.geometry.dispose(); } };
    return mon;
  }
  setFace(mon, faceCanvas){
    const M = this.models[MONSTERS[mon.id].model]; const F = M.face; if(!F) return;
    if(mon.face){ mon.face.parent.remove(mon.face); mon.face.material.map.dispose(); mon.face=null; }
    if(!faceCanvas) return;
    let bone=null; mon.obj.traverse(o=>{ if(o.isBone && o.name===F.boneName) bone=o; });
    if(!bone) return;
    const r = F.radius;
    const geo = new THREE.CircleGeometry(r, 48);
    const p = geo.attributes.position; // curve it like a face
    for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i); const d2=(x*x+y*y)/(r*r); p.setZ(i, -d2*r*0.5); }
    geo.computeVertexNormals();
    const tex = new THREE.CanvasTexture(faceCanvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy=4;
    const mat = new THREE.MeshStandardMaterial({ map:tex, transparent:true, roughness:0.55, metalness:0, emissive:0xffffff, emissiveMap:tex, emissiveIntensity:0.22, polygonOffset:true, polygonOffsetFactor:-2 });
    const mesh = new THREE.Mesh(geo, mat);
    const basis = new THREE.Matrix4().makeBasis(F.right, F.up, F.fwd);
    mesh.quaternion.setFromRotationMatrix(basis);
    mesh.position.copy(F.center).addScaledVector(F.fwd, r*0.18);
    mesh.castShadow = false; mesh.renderOrder = 2;
    bone.add(mesh); mon.face = mesh;
  }
  shakeCam(a){ this.shake = Math.max(this.shake, a); }
  worldToScreen(v){ const p = v.clone().project(this.camera); return { x:(p.x*0.5+0.5)*window.innerWidth, y:(-p.y*0.5+0.5)*window.innerHeight, behind:p.z>1 }; }
  frame(){
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    for(const u of this.updaters) u(dt, t);
    if(this.motes) this.motes.material.uniforms.t.value = t;
    // camera
    const tgt = this.camOverride || this.camTarget;
    const k = 1 - Math.exp(-dt*(this.camOverride? (this.camOverride.speed||4) : this.camLerp));
    this.camCur.pos.lerp(tgt.pos, k); this.camCur.look.lerp(tgt.look, k);
    this.camera.position.copy(this.camCur.pos);
    if(!this.camOverride){ this.camera.position.x += Math.sin(t*0.25)*0.12; this.camera.position.y += Math.sin(t*0.33)*0.05; }
    if(this.shake>0.001){ this.camera.position.x += (Math.random()-0.5)*this.shake; this.camera.position.y += (Math.random()-0.5)*this.shake; this.shake *= Math.exp(-dt*7); }
    this.camera.lookAt(this.camCur.look);
    if(this.composer) this.composer.render(dt); else this.renderer.render(this.scene, this.camera);
    this._frames++; const now=performance.now(); if(now-this._fpsT>1000){ this.fps = this._frames*1000/(now-this._fpsT); this._frames=0; this._fpsT=now; window.__fps=this.fps; this.adapt(now); }
  }
  adapt(now){
    // adaptive resolution: keep phones smooth (lower the render scale when fps drops, raise it when there is headroom)
    if(document.hidden || now < this._adaptT) return;
    let changed=false;
    if(this.fps < 38 && this.pr > 0.75){ this.pr = Math.max(0.75, this.pr-0.25); changed=true; }
    else if(this.fps > 57 && this.pr < this.maxPR){ this.pr = Math.min(this.maxPR, this.pr+0.25); changed=true; }
    if(this.fps < 22 && this.pr <= 0.75 && this.composer){ this.lowFrames++; if(this.lowFrames>=3){ this.composer=null; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; } }
    if(changed){ this.renderer.setPixelRatio(this.pr); this.resize(); this._adaptT = now+2500; }
    window.__pr = this.pr;
  }
  snapshot(id, size=256){
    // render a portrait thumbnail of a monster (used for cards)
    const sc = new THREE.Scene(); sc.environment = this.scene.environment;
    const l = new THREE.DirectionalLight(0xffffff,2.5); l.position.set(2,4,5); sc.add(l); sc.add(new THREE.HemisphereLight(0xffffff,0x555555,0.8));
    const mon = this.createMonster(id); mon.mixer.update(0.4); sc.add(mon.holder); mon.holder.rotation.y = -0.35;
    mon.holder.updateMatrixWorld(true);
    const cam = new THREE.PerspectiveCamera(30,1,0.1,50); cam.position.set(0,1.25,6.2); cam.lookAt(0,1.05,0);
    const rt = new THREE.WebGLRenderTarget(size,size,{samples:4}); rt.texture.colorSpace = THREE.SRGBColorSpace;
    const r=this.renderer; const prevT = r.toneMapping; 
    r.setRenderTarget(rt); r.setClearColor(0x000000,0); r.clear(); r.render(sc,cam); r.setRenderTarget(null); r.setClearColor(0x000000,1);
    const px = new Uint8Array(size*size*4); r.readRenderTargetPixels(rt,0,0,size,size,px);
    const c = document.createElement('canvas'); c.width=c.height=size; const g=c.getContext('2d'); const img=g.createImageData(size,size);
    for(let y=0;y<size;y++){ img.data.set(px.subarray((size-1-y)*size*4,(size-y)*size*4), y*size*4); }
    g.putImageData(img,0,0); rt.dispose(); mon.dispose();
    return c.toDataURL('image/png');
  }
}
export { THREE };
