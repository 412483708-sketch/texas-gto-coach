(function(root){
  'use strict';
  var levels=[[100,200,200],[200,400,400],[300,600,600],[400,800,800],[500,1000,1000],[600,1200,1200],[800,1600,1600],[1000,2000,2000],[1500,3000,3000],[2000,4000,4000],[3000,6000,6000],[4000,8000,8000]];
  function defaultPlan(){return levels.map(function(l){return {small:l[0],big:l[1],ante:l[2],minutes:20};});}
  function validPlan(p){return Array.isArray(p)&&p.length>0&&p.length<=60&&p.every(function(l){return l&&['small','big','ante'].every(function(k){return Number.isInteger(l[k])&&l[k]>=0&&l[k]<=1000000000;})&&l.big>0&&l.small<=l.big&&Number.isInteger(l.minutes)&&l.minutes>=1&&l.minutes<=180;});}
  function duration(s){return s.plan[s.level].minutes*60000;}
  function fresh(){return {v:1,name:'周末德州扑克锦标赛',plan:defaultPlan(),level:0,players:18,running:false,remaining:1200000,deadline:0,revision:0,seen:[]};}
  function remaining(s,now){return Math.max(0,s.running?s.deadline-now:s.remaining);}
  function tick(s,now){
    if(!s.running || now<s.deadline)return false;
    while(s.running && now>=s.deadline){
      if(s.level<s.plan.length-1){s.level++;s.deadline+=duration(s);}
      else{s.running=false;s.remaining=0;}
      s.revision++;
    }return true;
  }
  function restore(raw,now){
    try{var s=JSON.parse(raw);if(!s.plan)s.plan=defaultPlan();if(s.v!==1||typeof s.name!=='string'||s.name.length>40||!validPlan(s.plan)||!Number.isInteger(s.level)||s.level<0||s.level>=s.plan.length||!Number.isInteger(s.players)||s.players<0||s.players>9999||typeof s.running!=='boolean'||!Number.isFinite(s.remaining)||s.remaining<0||s.remaining>10800000||!Number.isFinite(s.deadline)||!Number.isInteger(s.revision)||s.revision<0||!Array.isArray(s.seen))throw Error();tick(s,now);return s;}catch(e){return fresh();}
  }
  function apply(s,c,now){
    tick(s,now);
    if(!c||typeof c.id!=='string'||c.id.length>100)return 'invalid';
    if(s.seen.indexOf(c.id)>=0)return 'duplicate';
    if(!Number.isFinite(c.notAfter)||c.notAfter<now)return 'expired';
    if(c.revision!==s.revision)return 'stale';
    var r=remaining(s,now),v=c.value;
    switch(c.action){
      case 'start':if(r===0)return 'finished';s.running=true;s.deadline=now+r;break;
      case 'pause':s.remaining=r;s.running=false;break;
      case 'reset':s.running=false;s.remaining=duration(s);s.deadline=0;break;
      case 'time':if(v!==60000&&v!==-60000)return 'invalid';r=Math.max(0,Math.min(10800000,r+v));s.remaining=r;if(s.running)s.deadline=now+r;break;
      case 'level':if(v!==1&&v!==-1)return 'invalid';s.level=Math.max(0,Math.min(s.plan.length-1,s.level+v));s.remaining=duration(s);if(s.running)s.deadline=now+s.remaining;break;
      case 'tournament':
        if(!v||typeof v.name!=='string'||!v.name.trim()||v.name.trim().length>40||!Number.isInteger(v.players)||v.players<1||v.players>9999||!validPlan(v.plan))return 'invalid';
        s.name=v.name.trim();s.players=v.players;s.plan=v.plan.map(function(l){return {small:l.small,big:l.big,ante:l.ante,minutes:l.minutes};});s.level=0;s.remaining=duration(s);s.running=true;s.deadline=now+s.remaining;break;
      case 'players':if(!Number.isInteger(v)||v<0||v>9999)return 'invalid';s.players=v;break;
      case 'name':if(typeof v!=='string'||!v.trim()||v.trim().length>40)return 'invalid';s.name=v.trim();break;
      default:return 'invalid';
    }
    s.revision++;s.seen.push(c.id);s.seen=s.seen.slice(-256);tick(s,now);return 'applied';
  }
  function snapshot(s,now){tick(s,now);function triple(l){return l?[l.small,l.big,l.ante]:null;}return {name:s.name,level:s.level,levelCount:s.plan.length,minutes:s.plan[s.level].minutes,players:s.players,running:s.running,remaining:remaining(s,now),revision:s.revision,now:now,current:triple(s.plan[s.level]),next:triple(s.plan[s.level+1])};}
  var api={fresh:fresh,restore:restore,remaining:remaining,tick:tick,apply:apply,snapshot:snapshot,levels:levels,defaultPlan:defaultPlan,validPlan:validPlan};
  if(typeof module!=='undefined')module.exports=api;else root.ClockCore=api;
})(this);
