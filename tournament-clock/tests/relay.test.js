'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{createRelay}=require('../server'),C=require('../tv/core');
test('relay auth, pairing, TV authority, idempotency, stale rejection and revocation',async()=>{
 const key='a'.repeat(64),relay=createRelay({tvKey:key,origin:'http://localhost'});await new Promise(r=>relay.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+relay.address().port;
 async function post(route,body,auth){const r=await fetch(url+route,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(auth||'')},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
 try{
 const s=C.fresh(),snap=()=>C.snapshot(s,Date.now());
 assert.equal((await post('/api/state',{})).status,401);
 assert.equal((await fetch(url+'/tv/config.js')).status,404);
 assert.equal((await fetch(url+'/.env')).status,404);
 assert.equal((await post('/api/tv/sync',{boot:'one',state:snap()},'bad')).status,401);
 assert.equal((await post('/api/tv/sync',null,key)).status,400);
 await post('/api/tv/sync',{boot:'one',state:snap()},key);
 assert.equal((await post('/api/tv/sync',{boot:'two',state:snap()},key)).status,409);
 const pair=(await post('/api/tv/pair',{boot:'one'},key)).body.pair;
 assert.equal((await post('/api/pair',{key:'wrong'})).status,401);
 assert.equal((await post('/api/pair',{key:'界'.repeat(48)})).status,401);
 const phone=(await post('/api/pair',{key:pair})).body.token;
 assert.equal((await post('/api/pair',{key:pair})).status,401);
 const command={id:'b'.repeat(32),revision:0,action:'start'};
 assert.equal((await post('/api/command',command,phone)).status,200);
 assert.equal((await post('/api/command',command,phone)).body.duplicate,true);
 assert.equal((await post('/api/state',{},phone)).body.state.running,false);
 const sync=(await post('/api/tv/sync',{boot:'one',state:snap()},key)).body;
 assert.equal(sync.commands.length,1);const result=C.apply(s,sync.commands[0],Date.now());assert.equal(result,'applied');
 assert.equal((await post('/api/tv/sync',{boot:'one',state:snap()},key)).body.commands.length,1);
 await post('/api/tv/sync',{boot:'one',state:snap(),acks:[{id:command.id,result}]},key);
 const got=(await post('/api/state',{},phone)).body;assert.equal(got.state.running,true);assert.equal(got.results[command.id],'applied');
 assert.equal((await post('/api/command',{...command,id:'c'.repeat(32)},phone)).status,409);
 await post('/api/tv/pair',{boot:'one'},key);assert.equal((await post('/api/state',{},phone)).status,401);
 }finally{await new Promise(r=>relay.close(r));}
});
test('offline television refuses commands',async()=>{const key='d'.repeat(64),relay=createRelay({tvKey:key,origin:'http://localhost'});await new Promise(r=>relay.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+relay.address().port;async function post(p,b,k){return fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(k||'')},body:JSON.stringify(b)});}try{await post('/api/tv/sync',{boot:'a',state:C.snapshot(C.fresh(),Date.now())},key);const p=await(await post('/api/tv/pair',{boot:'a'},key)).json();const f=await(await post('/api/pair',{key:p.pair})).json();await new Promise(r=>setTimeout(r,4100));assert.equal((await(await post('/api/state',{},f.token)).json()).online,false);assert.equal((await post('/api/command',{id:'e'.repeat(32),revision:0,action:'start'},f.token)).status,409);}finally{await new Promise(r=>relay.close(r));}});
