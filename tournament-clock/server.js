'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const token=()=>crypto.randomBytes(24).toString('hex');
function createRelay({tvKey,origin,dev=false}){
  if(!/^[a-f0-9]{48,128}$/.test(tvKey||''))throw Error('TV_KEY must be 48+ lowercase hex characters');
  const sessions=new Map();let owner=null,lastSeen=0,state=null,pair=null;
  const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);};
  const server=http.createServer(async(req,res)=>{
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'"};
    const o=req.headers.origin;
    if(o===origin||o==='null'){headers['Access-Control-Allow-Origin']=o;headers.Vary='Origin';headers['Access-Control-Allow-Headers']='Content-Type, Authorization';headers['Access-Control-Allow-Methods']='POST, GET, OPTIONS';}
    function reply(code,data){res.writeHead(code,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify(data));}
    if(req.method==='OPTIONS'){res.writeHead(204,headers);return res.end();}
    if(o && o!==origin && o!=='null')return reply(403,{error:'origin'});
    let url;try{url=new URL(req.url,'http://local');}catch{return reply(400,{error:'url'});}
    const route=url.pathname;
    if(req.method==='GET' && !route.startsWith('/api/')){
      let file=route==='/'||route==='/index.html'?'public/index.html':route.slice(1);
      const allowed=['public/index.html','public/phone.js','public/style.css','public/draft.js','public/jsQR.js','public/scan.js','public/manifest.json','public/icon.png'];
      if(dev)allowed.push('tv/index.html','tv/app.js','tv/core.js','tv/style.css','tv/qrcode.js','tv/config.js');
      if(route==='/health')return reply(200,{ok:true});
      if(!allowed.includes(file))return reply(404,{error:'not_found'});
      res.writeHead(200,{...headers,'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.json')?'application/json':'application/javascript'});
      return res.end(fs.readFileSync(path.join(__dirname,file)));
    }
    if(req.method!=='POST')return reply(405,{error:'method'});
    let body='';try{for await(const chunk of req){body+=chunk;if(body.length>16384){reply(413,{error:'size'});req.destroy();return;}}body=JSON.parse(body||'{}');}catch{return reply(400,{error:'json'});}
    if(!body||typeof body!=='object'||Array.isArray(body))return reply(400,{error:'json'});
    const now=Date.now(),auth=(req.headers.authorization||'').replace(/^Bearer /,'');
    for(const [k,s] of sessions)if(s.expiry<now)sessions.delete(k);
    if(route==='/api/tv/sync'||route==='/api/tv/pair'){
      if(!equal(auth,tvKey))return reply(401,{error:'unauthorized'});
      if(typeof body.boot!=='string'||body.boot.length>100)return reply(400,{error:'boot'});
      if(owner!==body.boot && owner && now-lastSeen<7000)return reply(409,{error:'another_tv'});
      if(owner!==body.boot){owner=body.boot;pair=null;for(const s of sessions.values())s.pending.clear();}
      if(route==='/api/tv/pair'){
        sessions.clear();pair={key:token(),expiry:now+120000};return reply(200,{pair:pair.key,expiresIn:120});
      }
      if(!body.state||!Number.isFinite(body.state.now)||!Number.isInteger(body.state.revision))return reply(400,{error:'state'});
      state=body.state;lastSeen=now;
      for(const s of sessions.values())for(const ack of (Array.isArray(body.acks)?body.acks:[])){
        if(ack&&s.pending.has(ack.id)){s.pending.delete(ack.id);s.results.set(ack.id,ack.result);}
      }
      const commands=[];
      for(const s of sessions.values())for(const [id,c] of s.pending){if(c.expires<now){s.pending.delete(id);s.results.set(id,'expired');}else commands.push(c.command);}
      return reply(200,{commands:commands,paired:sessions.size>0,connected:[...sessions.values()].some(s=>now-s.lastSeen<4000)});
    }
    if(route==='/api/pair'){
      if(!pair||pair.expiry<now||!equal(body.key,pair.key))return reply(401,{error:'pair_expired'});
      if(now-lastSeen>4000)return reply(409,{error:'tv_offline'});
      const key=token();sessions.set(key,{expiry:now+12*3600000,lastSeen:now,pending:new Map(),results:new Map()});pair=null;return reply(200,{token:key});
    }
    const session=sessions.get(auth);if(!session)return reply(401,{error:'unauthorized'});
    if(route==='/api/state'){session.lastSeen=now;return reply(200,{state,online:now-lastSeen<4000,age:now-lastSeen,results:Object.fromEntries(session.results)});}
    if(route==='/api/command'){
      if(now-lastSeen>=4000)return reply(409,{error:'tv_offline'});
      if(!/^[a-f0-9]{32}$/.test(body.id||''))return reply(400,{error:'id'});
      if(session.results.has(body.id)||session.pending.has(body.id))return reply(200,{accepted:true,duplicate:true});
      if(session.pending.size>=1)return reply(429,{error:'pending'});
      if(!['start','pause','reset','time','level','players','name','tournament'].includes(body.action)||body.revision!==state.revision)return reply(409,{error:'stale'});
      if(session.results.size>256)session.results.delete(session.results.keys().next().value);
      session.pending.set(body.id,{expires:now+8000,command:{id:body.id,action:body.action,value:body.value,revision:body.revision,notAfter:state.now+10000}});
      return reply(200,{accepted:true});
    }
    reply(404,{error:'not_found'});
  });
  server.requestTimeout=10000;server.headersTimeout=10000;
  return server;
}
if(require.main===module){const port=Number(process.env.PORT||8080);createRelay({tvKey:process.env.TV_KEY,origin:process.env.PUBLIC_ORIGIN||process.env.RENDER_EXTERNAL_URL||'http://localhost:'+port,dev:process.env.DEV==='1'}).listen(port,process.env.HOST||(process.env.RENDER==='true'?'0.0.0.0':'127.0.0.1'),()=>console.log('Poker relay listening on port '+port));}
module.exports={createRelay};
