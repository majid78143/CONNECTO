// CONNECTO — Number Guess
(function(){
'use strict';
let secret,attempts,maxAttempts=7,gameOver;

function init(){
  secret=Math.floor(Math.random()*100)+1;
  attempts=0;gameOver=false;
  document.getElementById('guess-history').innerHTML='';
  document.getElementById('guess-input').value='';
  document.getElementById('guess-input').disabled=false;
  document.getElementById('guess-btn').disabled=false;
  setMsg('Guess a number between 1 and 100!','');
  document.getElementById('attempts-left').textContent=maxAttempts;
  document.getElementById('restart-btn')?.classList.add('hidden');
}

window.makeGuess=async function(){
  if(gameOver)return;
  const input=document.getElementById('guess-input');
  const g=parseInt(input.value);
  if(!g||g<1||g>100){setMsg('Enter a number between 1–100','error');return;}
  attempts++;
  const left=maxAttempts-attempts;
  document.getElementById('attempts-left').textContent=left;
  const hist=document.getElementById('guess-history');
  const el=document.createElement('div');
  el.style.cssText='padding:8px 12px;border-radius:var(--radius-sm);margin-bottom:6px;font-size:14px;animation:slideIn .3s ease-out;display:flex;align-items:center;gap:10px';
  if(g===secret){
    el.style.background='rgba(87,242,135,.1)';el.style.border='1px solid var(--accent-green)';
    el.innerHTML=`✅ <strong>${g}</strong> — Correct! You got it in ${attempts} tries!`;
    hist.prepend(el);setMsg('🎉 You won!','success');
    document.getElementById('guess-input').disabled=true;
    document.getElementById('guess-btn').disabled=true;
    document.getElementById('restart-btn')?.classList.remove('hidden');
    const coins=Math.max(1,10-attempts+1);
    try{await fetch('/games/api/earn-coins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'number_guess',score:attempts,coins})});}catch(e){}
    if(typeof toast==='function')toast(`+${coins} coins!`,'success');
    gameOver=true;
  } else if(left<=0){
    el.style.background='rgba(237,66,69,.1)';el.style.border='1px solid var(--accent-red)';
    el.innerHTML=`❌ <strong>${g}</strong> — No attempts left! Answer was <strong>${secret}</strong>`;
    hist.prepend(el);setMsg('Game over!','error');
    document.getElementById('guess-input').disabled=true;
    document.getElementById('guess-btn').disabled=true;
    document.getElementById('restart-btn')?.classList.remove('hidden');
    gameOver=true;
  } else {
    const hint=g<secret?'📈 Too low!':'📉 Too high!';
    el.style.background='var(--bg-card)';el.style.border='1px solid var(--border)';
    el.innerHTML=`${hint} <strong>${g}</strong> — ${left} attempts left`;
    hist.prepend(el);
  }
  input.value='';input.focus();
};

function setMsg(msg,type){
  const el=document.getElementById('guess-msg');
  if(!el)return;
  el.textContent=msg;
  el.style.color=type==='success'?'var(--accent-green)':type==='error'?'var(--accent-red)':'var(--text-secondary)';
}

document.getElementById('guess-input')?.addEventListener('keydown',e=>{if(e.key==='Enter')window.makeGuess();});
window.startGame=init;
window.restartGame=init;
init();
})();
