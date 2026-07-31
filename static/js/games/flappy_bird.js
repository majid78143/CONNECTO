// CONNECTO — Flappy Bird
(function(){
'use strict';
const canvas=document.getElementById('game-canvas');
const ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height;
const GRAVITY=0.4,JUMP=-8,PIPE_W=52,GAP=150,PIPE_SPEED=2.5;
let bird,pipes,score,best,frame,running,raf;

function init(){
  bird={x:80,y:H/2,vy:0,r:14};
  pipes=[];score=0;frame=0;running=true;
  best=parseInt(localStorage.getItem('flappy_best')||'0');
  document.getElementById('score').textContent='0';
  document.getElementById('best').textContent=best;
  cancelAnimationFrame(raf);
  raf=requestAnimationFrame(loop);
  document.getElementById('restart-btn')?.classList.add('hidden');
}

function loop(){
  if(!running)return;
  update();draw();
  raf=requestAnimationFrame(loop);
}

function update(){
  frame++;
  bird.vy+=GRAVITY;bird.y+=bird.vy;
  if(bird.y-bird.r<=0||bird.y+bird.r>=H){gameOver();return;}
  // Spawn pipes
  if(frame%90===0){
    const top=60+Math.random()*(H-GAP-120);
    pipes.push({x:W,top,bottom:top+GAP,passed:false});
  }
  // Move pipes
  pipes.forEach(p=>p.x-=PIPE_SPEED);
  pipes=pipes.filter(p=>p.x>-PIPE_W);
  // Collision & score
  for(const p of pipes){
    if(bird.x+bird.r>p.x&&bird.x-bird.r<p.x+PIPE_W){
      if(bird.y-bird.r<p.top||bird.y+bird.r>p.bottom){gameOver();return;}
    }
    if(!p.passed&&bird.x>p.x+PIPE_W){p.passed=true;score++;document.getElementById('score').textContent=score;if(score>best){best=score;localStorage.setItem('flappy_best',best);document.getElementById('best').textContent=best;}}
  }
}

function draw(){
  // Sky
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#1a1a2e');sky.addColorStop(1,'#16213e');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  // Ground
  ctx.fillStyle='#2d4a2d';ctx.fillRect(0,H-30,W,30);
  ctx.fillStyle='#3d6b3d';ctx.fillRect(0,H-32,W,4);
  // Pipes
  pipes.forEach(p=>{
    ctx.fillStyle='#3d6b3d';
    ctx.fillRect(p.x,0,PIPE_W,p.top);
    ctx.fillRect(p.x,p.bottom,PIPE_W,H-p.bottom);
    // Pipe caps
    ctx.fillStyle='#4d8b4d';
    ctx.fillRect(p.x-4,p.top-18,PIPE_W+8,18);
    ctx.fillRect(p.x-4,p.bottom,PIPE_W+8,18);
  });
  // Bird
  ctx.save();
  ctx.translate(bird.x,bird.y);
  const tilt=Math.max(-30,Math.min(60,bird.vy*4));
  ctx.rotate(tilt*Math.PI/180);
  // Body
  ctx.fillStyle='#fee75c';ctx.beginPath();ctx.ellipse(0,0,bird.r,bird.r*.8,0,0,Math.PI*2);ctx.fill();
  // Wing
  ctx.fillStyle='#ffd700';ctx.beginPath();ctx.ellipse(-4,2,8,5,-.5,0,Math.PI*2);ctx.fill();
  // Eye
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(5,-2,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#000';ctx.beginPath();ctx.arc(6,-2,2.5,0,Math.PI*2);ctx.fill();
  // Beak
  ctx.fillStyle='#ff9500';ctx.beginPath();ctx.moveTo(bird.r-2,0);ctx.lineTo(bird.r+8,3);ctx.lineTo(bird.r-2,5);ctx.fill();
  ctx.restore();
}

async function gameOver(){
  running=false;cancelAnimationFrame(raf);
  ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff';ctx.font='bold 26px Inter';ctx.textAlign='center';
  ctx.fillText('Game Over!',W/2,H/2-20);
  ctx.font='16px Inter';ctx.fillStyle='#aaa';
  ctx.fillText(`Score: ${score} · Best: ${best}`,W/2,H/2+10);
  const coins=Math.max(1,Math.floor(score*1.5)+1);
  try{await fetch('/games/api/earn-coins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'flappy_bird',score,coins})});}catch(e){}
  if(typeof toast==='function')toast(`+${coins} coins!`,'success',3000);
  document.getElementById('restart-btn')?.classList.remove('hidden');
}

function jump(){if(running){bird.vy=JUMP;}}
canvas.addEventListener('click',jump);
canvas.addEventListener('touchstart',e=>{e.preventDefault();jump();},{passive:false});
document.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();jump();}});

window.startGame=init;
window.restartGame=init;
init();
})();
