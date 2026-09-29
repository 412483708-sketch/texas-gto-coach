(function(){'use strict';
  var storageKey='poker-tournament-draft-v1';
  function $(id){return document.getElementById(id);}
  function defaultDraft(){return {name:'我的锦标赛',players:18,plan:[[100,200,200],[200,400,400],[300,600,600],[400,800,800],[500,1000,1000],[600,1200,1200]].map(function(l){return {small:l[0],big:l[1],ante:l[2],minutes:20};})};}
  var draft=defaultDraft();try{var stored=JSON.parse(localStorage.getItem(storageKey));if(stored&&Array.isArray(stored.plan)&&stored.plan.length&&stored.plan.length<=60)draft=stored;}catch(e){}
  function message(t){$('draftMessage').textContent=t;}
  function read(){return {name:$('draftName').value.trim(),players:Number($('draftPlayers').value),plan:Array.prototype.map.call($('draftLevels').children,function(row){var l={};['small','big','ante','minutes'].forEach(function(k){var value=row.querySelector('[data-field="'+k+'"]').value;l[k]=value.trim()===''?null:Number(value);});return l;})};}
  function save(){draft=read();try{localStorage.setItem(storageKey,JSON.stringify(draft));message('草稿已保存在此手机。扫码后再点击发送。');}catch(e){message('草稿未能保存，请勿关闭页面。');}return draft;}
  function render(){
    $('draftName').value=draft.name;$('draftPlayers').value=draft.players;$('draftLevels').textContent='';
    draft.plan.forEach(function(l,index){var row=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent='第 '+(index+1)+' 级';row.appendChild(legend);
      ['small','big','ante','minutes'].forEach(function(k,i){var label=document.createElement('label'),input=document.createElement('input');label.textContent=['小盲','大盲','大盲前注','分钟'][i];input.type='number';input.inputMode='numeric';input.min=k==='minutes'?'1':'0';input.max=k==='minutes'?'180':'1000000000';input.step='1';input.setAttribute('data-field',k);input.value=l[k];label.appendChild(input);row.appendChild(label);});
      var remove=document.createElement('button');remove.type='button';remove.textContent='删除本级';remove.onclick=function(){if(draft.plan.length<=1){message('至少保留一个级别');return;}draft=read();draft.plan.splice(index,1);render();save();};row.appendChild(remove);$('draftLevels').appendChild(row);
    });
  }
  function validate(d){if(!d.name||d.name.length>40)return '请输入不超过 40 字的比赛名称';if(!Number.isInteger(d.players)||d.players<1||d.players>9999)return '参赛人数需要是 1 至 9999 的整数';
    for(var i=0;i<d.plan.length;i++){var l=d.plan[i];if(!['small','big','ante'].every(function(k){return Number.isInteger(l[k])&&l[k]>=0&&l[k]<=1000000000;})||l.big<=0||l.small>l.big)return '请检查第 '+(i+1)+' 级盲注：大盲须大于零，且不小于小盲';if(!Number.isInteger(l.minutes)||l.minutes<1||l.minutes>180)return '第 '+(i+1)+' 级时长须为 1 至 180 分钟';}return null;
  }
  render();$('draft').addEventListener('input',save);$('saveDraft').onclick=save;
  $('addLevel').onclick=function(){draft=read();if(draft.plan.length>=60){message('最多 60 级');return;}var last=draft.plan[draft.plan.length-1];draft.plan.push({small:last.small,big:last.big,ante:last.ante,minutes:last.minutes});render();save();};
  $('sendTournament').onclick=function(){var d=save(),error=validate(d);if(error){message(error);return;}if(!window.sendTournament){message('请先扫码连接电视');return;}if(confirm('将「'+d.name+'」的 '+d.plan.length+' 个级别发送到电视并立即开始？这会替换电视上的当前比赛。'))window.sendTournament(d);};
})();
