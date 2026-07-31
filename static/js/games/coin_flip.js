// CONNECTO — Coin Flip
(function(){
'use strict';
let balance,bet,spinning=false;

async function init(){
  try{const res=await fetch('/games/api/balance');const d=await res.json();balance=d.balance||0;}catch(e){balance=10;}
  updateUI();
  document.getElementById('restart-btn')?.classList.add('hidden');
}

function updateUI(){
  document.getElementById('coin-balance-display').textContent=balance+' coins';
  document.getElementById('bet-amount').max=Math.min(balance,50);
}

window.flipCoin=async function(choice){
  if(spinning)return;
  bet=parseInt(document.getElementById('bet-amount').value)||5;
  if(bet>balance){if(typeof toast==='function')toast('Not enough coins!','error');return;}
  spinning=true;
  // Animate coin
  const coin=document.getElementById('coin-display');
  coin.style.animation='spin3d 1s ease-in-out';
  setTimeout(()=>coin.style.animation='',1000);
  await new Promise(r=>setTimeout(r,1000));
  const result=Math.random()<.5?'heads':'tails';
  coin.textContent=result==='heads'?'🪙':'💿';
  if(result===choice){
    balance+=bet;
    try{await fetch('/games/api/earn-coins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'coin_flip',score:1,coins:bet})});}catch(e){}
    if(typeof toast==='function')toast(`✅ ${result.toUpperCase()}! +${bet} coins!`,'success');
  }else{
    balance-=bet;
    try{await fetch('/games/api/earn-coins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'coin_flip',score:0,coins:-bet})});}catch(e){}
    if(typeof toast==='function')toast(`❌ ${result.toUpperCase()}! -${bet} coins`,'error');
  }
  document.getElementById('result-text').textContent=`Result: ${result.toUpperCase()} — You ${result===choice?'WON':'LOST'} ${bet} coins`;
  spinning=false;updateUI();
};

window.startGame=init;
window.restartGame=init;
init();
})();
