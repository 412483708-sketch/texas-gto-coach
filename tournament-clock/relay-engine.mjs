// Portable relay state machine. Persistence and HTTPS belong to the caller.
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;};
export function initial(){return {owner:null,lastSeen:0,state:null,pair:null,sessions:[]};}
export function processRelay(saved,route,body,auth,tvKey,now=Date.now()){
let {owner,lastSeen,state,pair}=saved;
const sessions=new Map(saved.sessions.map(([k,s])=>[k,{...s,pending:new Map(s.pending),results:new Map(s.results)}]));
const reply=(status,body)=>({status,body});
try{
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
    return reply(404,{error:'not_found'});
}finally{Object.assign(saved,{owner,lastSeen,state,pair,sessions:[...sessions].map(([k,s])=>[k,{...s,pending:[...s.pending],results:[...s.results]}])});}
}
