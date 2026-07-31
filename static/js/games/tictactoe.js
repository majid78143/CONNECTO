// CONNECTO — Tic-Tac-Toe
(function(){
'use strict';
let board,turn,gameOver;

function init(){
  board=['','','','','','','','',''];
  turn='X'; gameOver=false;
  render(); setStatus("Your turn — X");
  document.getElementById('restart-btn')?.classList.add('hidden');
}

function render(){
  const grid=document.getElementById('ttt-grid');
  if(!grid)return;
  grid.innerHTML=board.map((cell,i)=>`
    <div class="ttt-cell" onclick="window._tttClick(${i})" style="width:100px;height:100px;background:var(--bg-card);border:2px solid var(--border);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;cursor:pointer;transition:all .15s;color:${cell==='X'?'#5865f2':'#fe3c3c'}">
      ${cell==='X'?'×':cell==='O'?'○':''}
    </div>`).join('');
}

window._tttClick=function(i){
  if(gameOver||board[i])return;
  board[i]='X'; render();
  const w=checkWinner();
  if(w){end(w);return;}
  if(board.every(c=>c)){end('draw');return;}
  turn='O'; setStatus("Computer thinking...");
  setTimeout(()=>{aiMove();},400);
};

function aiMove(){
  // Minimax
  let best=-Infinity,move=-1;
  board.forEach((_,i)=>{
    if(!board[i]){
      board[i]='O';
      const v=minimax(board,'X',false,0);
      board[i]='';
      if(v>best){best=v;move=i;}
    }
  });
  if(move!==-1){board[move]='O';render();}
  const w=checkWinner();
  if(w){end(w);return;}
  if(board.every(c=>c)){end('draw');return;}
  turn='X'; setStatus("Your turn — X");
}

function minimax(b,p,isMax,depth){
  const w=checkWinner();
  if(w==='O')return 10-depth;
  if(w==='X')return depth-10;
  if(b.every(c=>c))return 0;
  if(isMax){
    let best=-Infinity;
    b.forEach((_,i)=>{if(!b[i]){b[i]='O';best=Math.max(best,minimax(b,'X',false,depth+1));b[i]='';}});
    return best;
  }else{
    let best=Infinity;
    b.forEach((_,i)=>{if(!b[i]){b[i]='X';best=Math.min(best,minimax(b,'O',true,depth+1));b[i]='';}});
    return best;
  }
}

function checkWinner(){
  const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for(const [a,b,c] of lines){
    if(board[a]&&board[a]===board[b]&&board[a]===board[c])return board[a];
  }
  return null;
}

async function end(result){
  gameOver=true;
  if(result==='draw'){setStatus("It's a draw! 🤝");}
  else if(result==='X'){
    setStatus("You won! 🎉");
    try{await fetch('/games/api/earn-coins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'tictactoe',score:1,coins:5})});}catch(e){}
    if(typeof toast==='function')toast('+5 coins!','success');
  }else{setStatus("Computer won! 🤖");}
  document.getElementById('restart-btn')?.classList.remove('hidden');
}

function setStatus(msg){const el=document.getElementById('ttt-status');if(el)el.textContent=msg;}

window.startGame=init;
window.restartGame=init;
init();
})();
