// CONNECTO — Color Match
(function(){
'use strict';
const COLORS={Red:'#e74c3c',Blue:'#3498db',Green:'#2ecc71',Yellow:'#f1c40f',Purple:'#9b59b6',Orange:'#e67e22',Pink:'#fd79a8',Cyan:'#00b894'};
const names=Object.keys(COLORS);
let score,timer,seconds,total;

function init(){
  score=0;total=0;seconds=0;
  document.getElementById('score').textContent='0';
  clearInterval(timer);
  timer=setInterval(()=>{seconds++;},1000);
  next();
  document.getElementById('restart-btn')?.classList.add('hidden');
}

function next(){
  if(total>=15){endGame();return;}
  // Show color name in a DIFFERENT color
  const wordIdx=Math.floor(Math.random()*names.length);
  const colorIdx=(wordIdx+1+Math.floor(Math.random()*(names.length-1)))%names.length;
  const word=names[wordIdx];
  const color=names[colorIdx];
  const question=document.getElementById('color-question');
  if(question){
    question.textContent=word;
    question.style.color=COLORS[color];
    question.dataset.answer=color; // The color it's displayed in
  }
  document.getElementById('color-instruction').textContent='Click the COLOR of the text (not the word)!';
  const grid=document.getElementById('color-choices');
  const choices=names.sort(()=>Math.random()-.5).slice(0,4);
  if(!choices.includes(color))choices[0]=color;
  choices.sort(()=>Math.random()-.5);
  if(!grid)return;
  grid.innerHTML=choices.map(c=>`
    <button onclick="window._colorAnswer('${c}','${color}')"
      style="background:${COLORS[c]};color:#fff;border:none;border-radius:var(--radius-lg);padding:16px 20px;cursor:pointer;font-size:14px;font-weight:700;transition:transform .15s"
      onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform=''">
      ${c}
    </button>`).join('');
  document.getElementById('color-feedback').textContent='';
}

window._colorAnswer=async function(chosen,correct){
  total++;
  const fb=document.getElementById('color-feedback');
  if(chosen===correct){
    score+=5;document.getElementById('score').textContent=score;
    fb.textContent='✅ Correct!';fb.style.color='var(--accent-green)';
  }else{
    fb.textContent=`❌ Wrong! It was ${correct}`;fb.style.color='var(--accent-red)';
  }
  document.querySelectorAll('#color-choices button').forEach(b=>b.disabled=true);
  setTimeout(next,800);
};

async function endGame(){
  clearInterval(timer);
  const coins=Math.max(1,Math.floor(score/10));
  try{await fetch('/games/api/earn-coins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'color_match',score,coins})});}catch(e){}
  if(typeof toast==='function')toast(`Score: ${score} — +${coins} coins!`,'success',5000);
  document.getElementById('restart-btn')?.classList.remove('hidden');
}

window.startGame=init;
window.restartGame=init;
init();
})();
