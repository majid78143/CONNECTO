// CONNECTO — Memory Cards
(function(){
'use strict';
const EMOJIS=['🎮','🎯','🏆','🎨','🚀','⭐','🔥','💎','🎵','🌈','🦄','💡'];
let cards,flipped,matched,moves,timer,seconds,canFlip;

function init(){
  const pairs=EMOJIS.slice(0,8);
  cards=[...pairs,...pairs].sort(()=>Math.random()-.5).map((e,i)=>({id:i,emoji:e,flippd:false,matched:false}));
  flipped=[];matched=0;moves=0;seconds=0;canFlip=true;
  clearInterval(timer);
  timer=setInterval(()=>{seconds++;document.getElementById('timer').textContent=seconds+'s';},1000);
  render();
  document.getElementById('moves').textContent='0';
  document.getElementById('restart-btn')?.classList.add('hidden');
}

function render(){
  const grid=document.getElementById('memory-grid');
  if(!grid)return;
  grid.innerHTML=cards.map(c=>`
    <div class="memory-card${c.flippd||c.matched?' flipped':''}" onclick="window._memFlip(${c.id})" style="width:80px;height:80px;cursor:pointer;perspective:600px">
      <div style="position:relative;width:100%;height:100%;transition:transform .5s;transform-style:preserve-3d;transform:${c.flippd||c.matched?'rotateY(180deg)':'none'}">
        <div style="position:absolute;inset:0;background:linear-gradient(135deg,#5865f2,#9b59b6);border-radius:var(--radius-lg);backface-visibility:hidden;display:flex;align-items:center;justify-content:center;font-size:28px">❓</div>
        <div style="position:absolute;inset:0;background:${c.matched?'rgba(87,242,135,.2)':'var(--bg-card)'};border:2px solid ${c.matched?'var(--accent-green)':'var(--border)'};border-radius:var(--radius-lg);backface-visibility:hidden;transform:rotateY(180deg);display:flex;align-items:center;justify-content:center;font-size:32px">${c.emoji}</div>
      </div>
    </div>`).join('');
}

window._memFlip=function(id){
  if(!canFlip)return;
  const card=cards[id];
  if(card.flippd||card.matched||flipped.length>=2)return;
  card.flippd=true;flipped.push(id);render();
  if(flipped.length===2){
    moves++;document.getElementById('moves').textContent=moves;
    canFlip=false;
    const [a,b]=flipped.map(i=>cards[i]);
    if(a.emoji===b.emoji){
      a.matched=b.matched=true;matched+=2;flipped=[];canFlip=true;render();
      if(matched===cards.length){clearInterval(timer);endGame();}
    } else {
      setTimeout(()=>{a.flippd=b.flippd=false;flipped=[];canFlip=true;render();},900);
    }
  }
};

async function endGame(){
  const coins=Math.max(5,15-Math.floor(moves/4));
  try{await fetch('/games/api/earn-coins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'memory_cards',score:moves,coins})});}catch(e){}
  if(typeof toast==='function')toast(`🎉 Completed in ${moves} moves & ${seconds}s! +${coins} coins`,'success',5000);
  document.getElementById('restart-btn')?.classList.remove('hidden');
}

window.startGame=init;
window.restartGame=init;
init();
})();
