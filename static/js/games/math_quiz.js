// CONNECTO — Math Quiz
(function(){
'use strict';
let q,ans,score,streak,total,timer,seconds;

function init(){
  score=0;streak=0;total=0;seconds=0;
  document.getElementById('score').textContent='0';
  clearInterval(timer);
  timer=setInterval(()=>{seconds++;},1000);
  next();
  document.getElementById('restart-btn')?.classList.add('hidden');
}

function next(){
  if(total>=15){endGame();return;}
  const diff=Math.min(3,1+Math.floor(total/5));
  let a,b,op,result;
  do{
    a=Math.floor(Math.random()*(diff===1?10:diff===2?20:50))+1;
    b=Math.floor(Math.random()*(diff===1?10:diff===2?20:50))+1;
    op=['+','-','×'][Math.floor(Math.random()*(diff===1?2:3))];
    result=op==='+'?a+b:op==='-'?a-b:a*b;
  }while(result<0);
  q={a,b,op,result};ans=result;
  document.getElementById('math-question').textContent=`${a} ${op} ${b} = ?`;
  // Choices
  const choices=[ans,...new Set([ans+Math.floor(Math.random()*5+1),ans-Math.floor(Math.random()*5+1),ans+Math.floor(Math.random()*10+5)])].slice(0,4).sort(()=>Math.random()-.5);
  const grid=document.getElementById('math-choices');
  if(!grid)return;
  grid.innerHTML=choices.map(c=>`<button class="btn btn-secondary" onclick="window._mathAnswer(${c})" style="font-size:20px;padding:16px;border-radius:var(--radius-lg)">${c}</button>`).join('');
  document.getElementById('math-feedback').textContent='';
}

window._mathAnswer=async function(v){
  total++;
  const fb=document.getElementById('math-feedback');
  if(v===ans){
    streak++;score+=Math.max(2,6-Math.floor(seconds/20));
    document.getElementById('score').textContent=score;
    fb.textContent=`✅ Correct! ${streak>1?`🔥×${streak}`:''}`;
    fb.style.color='var(--accent-green)';
  }else{
    streak=0;
    fb.textContent=`❌ Wrong! Answer was ${ans}`;
    fb.style.color='var(--accent-red)';
  }
  // Disable buttons
  document.querySelectorAll('#math-choices button').forEach(b=>b.disabled=true);
  setTimeout(next,900);
};

async function endGame(){
  clearInterval(timer);
  const coins=Math.max(1,Math.floor(score/3));
  try{await fetch('/games/api/earn-coins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'math_quiz',score,coins})});}catch(e){}
  document.getElementById('math-question').textContent=`Done! Score: ${score}`;
  document.getElementById('math-choices').innerHTML='';
  if(typeof toast==='function')toast(`+${coins} coins!`,'success');
  document.getElementById('restart-btn')?.classList.remove('hidden');
}

window.startGame=init;
window.restartGame=init;
init();
})();
