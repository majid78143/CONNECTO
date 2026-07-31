// CONNECTO — Reaction Time
(function(){
'use strict';
let state='wait',startTime,timeout,results=[];

function init(){
  results=[];state='wait';
  render('wait');
  document.getElementById('restart-btn')?.classList.add('hidden');
}

function render(st){
  const box=document.getElementById('reaction-box');
  const msg=document.getElementById('reaction-msg');
  if(!box||!msg)return;
  if(st==='wait'){
    box.style.background='var(--bg-card)';
    box.style.borderColor='var(--border)';
    msg.textContent='Click / tap to start';
  }else if(st==='ready'){
    box.style.background='rgba(237,66,69,.15)';
    box.style.borderColor='var(--accent-red)';
    msg.textContent='Wait for green...';
  }else if(st==='go'){
    box.style.background='rgba(87,242,135,.2)';
    box.style.borderColor='var(--accent-green)';
    msg.textContent='CLICK NOW!';
  }else if(st==='result'){
    box.style.background='rgba(88,101,242,.15)';
    box.style.borderColor='var(--accent-blue)';
  }
}

window._reactionClick=async function(){
  if(state==='wait'){
    state='ready';render('ready');
    const delay=1000+Math.random()*4000;
    timeout=setTimeout(()=>{state='go';startTime=Date.now();render('go');},delay);
  }else if(state==='ready'){
    clearTimeout(timeout);state='wait';render('wait');
    document.getElementById('reaction-msg').textContent='Too early! Try again.';
  }else if(state==='go'){
    const ms=Date.now()-startTime;
    results.push(ms);
    state='result';render('result');
    const msg=document.getElementById('reaction-msg');
    const rating=ms<200?'🚀 Superhuman!':ms<300?'⚡ Excellent!':ms<400?'✅ Good':ms<500?'😊 Average':'🐢 Slow';
    msg.textContent=`${ms}ms — ${rating} (${results.length}/5)`;
    if(results.length>=5){
      const avg=Math.round(results.reduce((a,b)=>a+b,0)/results.length);
      const coins=Math.max(1,Math.min(5,Math.round((600-avg)/100)));
      try{await fetch('/games/api/earn-coins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'reaction_time',score:avg,coins})});}catch(e){}
      if(typeof toast==='function')toast(`Avg: ${avg}ms — +${coins} coins!`,'success',5000);
      document.getElementById('restart-btn')?.classList.remove('hidden');
      state='wait';
    }else{
      setTimeout(()=>{state='wait';render('wait');},1200);
    }
  }
};

window.startGame=init;
window.restartGame=init;
init();
})();
