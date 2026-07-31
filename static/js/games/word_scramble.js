// CONNECTO — Word Scramble
(function(){
'use strict';
const WORDS=['python','javascript','firebase','developer','community','keyboard','monitor','network','browser','software','database','frontend','backend','protocol','security','algorithm','function','variable','template','component'];
let word,scrambled,score,timer,seconds,streak;

function init(){
  score=0;streak=0;seconds=0;
  document.getElementById('score').textContent='0';
  clearInterval(timer);
  timer=setInterval(()=>{seconds++;document.getElementById('timer').textContent=seconds+'s';},1000);
  nextWord();
  document.getElementById('restart-btn')?.classList.add('hidden');
}

function nextWord(){
  word=WORDS[Math.floor(Math.random()*WORDS.length)];
  scrambled=word.split('').sort(()=>Math.random()-.5).join('');
  while(scrambled===word)scrambled=word.split('').sort(()=>Math.random()-.5).join('');
  document.getElementById('scrambled-word').textContent=scrambled.toUpperCase();
  document.getElementById('word-input').value='';
  document.getElementById('word-input').focus();
  document.getElementById('hint-area').textContent=`${word.length} letters`;
  document.getElementById('feedback').textContent='';
}

window.checkWord=async function(){
  const ans=document.getElementById('word-input').value.trim().toLowerCase();
  const fb=document.getElementById('feedback');
  if(ans===word){
    streak++;score+=Math.max(3,8-Math.floor(seconds/10));
    document.getElementById('score').textContent=score;
    fb.textContent=`✅ Correct! ${streak>1?`🔥 ${streak} streak!`:''}`;
    fb.style.color='var(--accent-green)';
    setTimeout(nextWord,800);
  }else{
    streak=0;
    fb.textContent='❌ Wrong! Try again.';
    fb.style.color='var(--accent-red)';
  }
};

window.showHint=function(){
  document.getElementById('hint-area').textContent=`Hint: ${word[0]}${'_'.repeat(word.length-2)}${word.slice(-1)}`;
};

window.skipWord=function(){streak=0;nextWord();};

async function endGame(){
  clearInterval(timer);
  const coins=Math.max(1,Math.floor(score/3));
  try{await fetch('/games/api/earn-coins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'word_scramble',score,coins})});}catch(e){}
  if(typeof toast==='function')toast(`Game over! Score: ${score} — +${coins} coins`,'success',5000);
  document.getElementById('restart-btn')?.classList.remove('hidden');
}

document.getElementById('word-input')?.addEventListener('keydown',e=>{if(e.key==='Enter')window.checkWord();});
window.startGame=init;
window.restartGame=init;
init();
})();
