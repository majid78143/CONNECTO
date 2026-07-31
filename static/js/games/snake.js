// CONNECTO — Snake Game
(function(){
'use strict';
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
const GRID   = 20, COLS = canvas.width/GRID, ROWS = canvas.height/GRID;
let snake, dir, nextDir, food, score, best, interval, running=false, paused=false;

function init(){
  snake   = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
  dir     = {x:1,y:0}; nextDir={x:1,y:0};
  food    = randomFood();
  score   = 0; running=true; paused=false;
  best    = parseInt(localStorage.getItem('snake_best')||'0');
  document.getElementById('score').textContent='0';
  document.getElementById('best').textContent=best;
  clearInterval(interval);
  interval=setInterval(tick,120);
}

function randomFood(){
  let pos;
  do{pos={x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)}}
  while(snake.some(s=>s.x===pos.x&&s.y===pos.y));
  return pos;
}

function tick(){
  if(paused||!running)return;
  dir={...nextDir};
  const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
  if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||snake.some(s=>s.x===head.x&&s.y===head.y)){
    gameOver(); return;
  }
  snake.unshift(head);
  if(head.x===food.x&&head.y===food.y){
    score+=10; document.getElementById('score').textContent=score;
    if(score>best){best=score;localStorage.setItem('snake_best',best);document.getElementById('best').textContent=best;}
    food=randomFood();
    // Spawn special food occasionally
  } else snake.pop();
  draw();
}

function draw(){
  ctx.fillStyle='#0e0e10'; ctx.fillRect(0,0,canvas.width,canvas.height);
  // Grid dots
  ctx.fillStyle='rgba(255,255,255,.04)';
  for(let x=0;x<COLS;x++)for(let y=0;y<ROWS;y++)ctx.fillRect(x*GRID+GRID/2-1,y*GRID+GRID/2-1,2,2);
  // Food
  ctx.fillStyle='#fe3c3c';
  ctx.beginPath();ctx.arc(food.x*GRID+GRID/2,food.y*GRID+GRID/2,GRID/2-2,0,Math.PI*2);ctx.fill();
  // Snake
  snake.forEach((s,i)=>{
    const g=ctx.createLinearGradient(s.x*GRID,s.y*GRID,s.x*GRID+GRID,s.y*GRID+GRID);
    g.addColorStop(0,i===0?'#57f287':'#3ba55d');
    g.addColorStop(1,i===0?'#3ba55d':'#2d7d4d');
    ctx.fillStyle=g;
    ctx.beginPath();ctx.roundRect(s.x*GRID+1,s.y*GRID+1,GRID-2,GRID-2,4);ctx.fill();
    if(i===0){ctx.fillStyle='#0e0e10';ctx.fillRect(s.x*GRID+GRID*.3,s.y*GRID+GRID*.3,3,3);ctx.fillRect(s.x*GRID+GRID*.6,s.y*GRID+GRID*.3,3,3);}
  });
}

async function gameOver(){
  running=false; clearInterval(interval);
  ctx.fillStyle='rgba(0,0,0,.7)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#fff'; ctx.font='bold 28px Inter'; ctx.textAlign='center';
  ctx.fillText('Game Over!',canvas.width/2,canvas.height/2-20);
  ctx.font='16px Inter'; ctx.fillStyle='#aaa';
  ctx.fillText(`Score: ${score}`,canvas.width/2,canvas.height/2+10);
  // Award coins
  try{
    const coins=Math.floor(score/10)+1;
    await fetch('/games/api/earn-coins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'snake',score,coins})});
    if(typeof toast==='function')toast(`+${coins} coins earned!`,'success',3000);
  }catch(e){}
  document.getElementById('restart-btn')?.classList.remove('hidden');
}

document.addEventListener('keydown',e=>{
  if(!running)return;
  if(e.code==='Space'){paused=!paused;return;}
  const map={'ArrowUp':{x:0,y:-1},'ArrowDown':{x:0,y:1},'ArrowLeft':{x:-1,y:0},'ArrowRight':{x:1,y:0},'KeyW':{x:0,y:-1},'KeyS':{x:0,y:1},'KeyA':{x:-1,y:0},'KeyD':{x:1,y:0}};
  const d=map[e.code];
  if(d&&!(d.x===-dir.x&&d.y===-dir.y)){nextDir=d;e.preventDefault();}
});

// Mobile swipe
let tx,ty;
canvas.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;},{passive:true});
canvas.addEventListener('touchend',e=>{
  const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;
  if(Math.abs(dx)>Math.abs(dy)){nextDir=dx>0?{x:1,y:0}:{x:-1,y:0};}
  else{nextDir=dy>0?{x:0,y:1}:{x:0,y:-1};}
},{passive:true});

window.startGame=init;
window.restartGame=init;
init();
})();
