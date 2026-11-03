
// local dev server: runs site/_worker.js with a node:sqlite-backed D1 shim
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const root = path.resolve(process.argv[2]||'site'); const port = Number(process.argv[3]||18432);
const sq = new DatabaseSync(':memory:');
const DB = { prepare(sql){ let args=[]; const st = { bind(...a){ args=a; return st; },
  async run(){ const s=sq.prepare(sql); const r=s.run(...args); return {meta:{changes:Number(r.changes)}}; },
  async first(){ const s=sq.prepare(sql); return s.get(...args)||null; } }; return st; } };
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.json':'application/json','.apk':'application/vnd.android.package-archive','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const ASSETS = { async fetch(req){ const u=new URL(req.url); let p=decodeURIComponent(u.pathname); if(p.endsWith('/')) p+='index.html';
  const f=path.join(root,p); if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()) { const idx=path.join(root,'index.html'); return new Response(fs.readFileSync(idx),{headers:{'content-type':'text/html'}}); }
  return new Response(fs.readFileSync(f),{headers:{'content-type':types[path.extname(f)]||'application/octet-stream'}}); } };
const mod = await import(path.join(root,'_worker.js')+'?t='+Date.now());
http.createServer(async (req,res)=>{
  const chunks=[]; for await (const c of req) chunks.push(c);
  const body = chunks.length? Buffer.concat(chunks) : undefined;
  const r = new Request('http://localhost:'+port+req.url,{method:req.method,headers:req.headers,body:(req.method==='GET'||req.method==='HEAD')?undefined:body});
  const out = await mod.default.fetch(r,{DB,ASSETS});
  res.writeHead(out.status, Object.fromEntries(out.headers)); res.end(Buffer.from(await out.arrayBuffer()));
}).listen(port, ()=>console.log('dev on',port));
