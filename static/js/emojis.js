// CONNECTO — Emoji Picker
'use strict';

const EmojiPicker = {
  categories: {
    '😊 Smileys': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
    '❤️ Hearts': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','✡️','🔯','🕎','☯️','☦️','🛐','⛎'],
    '👍 Gestures': ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏'],
    '🎮 Fun': ['🎮','🕹️','🎲','🎯','🎳','🏆','🥇','🥈','🥉','🎖️','🏅','🎗️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎷','🎸','🎹','🎺','🎻','🥁','🪘','🎙️'],
    '🔥 Reactions': ['🔥','⚡','💫','✨','🌟','⭐','💥','❄️','🌈','☀️','🌙','🌊','💨','🌸','🌺','🌻','🌹','💐','🍀','🎄','🎃','🎁','🎉','🎊','🎈','🎀','🎆','🎇','🧨','✅','❌','⚠️','🚫','💯','♾️','🔑','🪄'],
    '🐱 Animals': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦅','🦆','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊'],
    '🍕 Food': ['🍕','🍔','🍟','🌭','🌮','🌯','🥙','🧆','🥚','🍳','🥘','🍲','🥗','🥣','🧁','🎂','🍰','🍫','🍬','🍭','🍮','🍯','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧃','🧋','☕','🍵','🧊','🍦','🍧','🍨','🍩','🍪'],
  },

  init() {
    const btn = document.getElementById('emoji-btn');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
  },

  toggle() {
    const existing = document.getElementById('emoji-picker-popup');
    if (existing) { existing.remove(); return; }
    this.render();
  },

  render() {
    const picker = document.createElement('div');
    picker.id    = 'emoji-picker-popup';
    picker.style.cssText = `
      position:fixed;bottom:80px;right:20px;
      width:360px;height:440px;
      background:var(--bg-card);
      border:1px solid var(--border);
      border-radius:var(--radius-xl);
      box-shadow:var(--shadow-lg);
      display:flex;flex-direction:column;
      z-index:8000;
      overflow:hidden;
      animation:slideUp .2s var(--ease-out);
    `;

    picker.innerHTML = `
      <div style="padding:10px 12px;border-bottom:1px solid var(--border)">
        <input class="input" id="emoji-search" placeholder="Search emojis..." style="width:100%;padding:7px 12px;font-size:13px"/>
      </div>
      <div style="display:flex;padding:6px 8px;gap:4px;border-bottom:1px solid var(--border);overflow-x:auto" id="emoji-cats">
        ${Object.keys(this.categories).map((cat,i)=>`
          <button class="emoji-cat-btn" data-cat="${cat}" onclick="EmojiPicker.showCat('${cat}')"
            style="padding:5px 10px;border-radius:var(--radius-sm);border:none;background:${i===0?'var(--bg-active)':'none'};cursor:pointer;font-size:12px;white-space:nowrap;color:var(--text-secondary)">
            ${cat.split(' ')[0]}
          </button>`).join('')}
      </div>
      <div style="flex:1;overflow-y:auto;padding:8px" id="emoji-grid"></div>
      <div style="padding:8px 12px;border-top:1px solid var(--border);display:flex;gap:8px;font-size:12px;color:var(--text-muted)" id="emoji-preview">
        <span id="ep-icon" style="font-size:24px"></span>
        <span id="ep-name">Hover an emoji</span>
      </div>
    `;

    document.body.appendChild(picker);
    this.showCat(Object.keys(this.categories)[0]);

    // Search
    document.getElementById('emoji-search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const all = Object.values(this.categories).flat();
      const res = q ? all.slice(0, 100) : null;
      this.renderGrid(res || this.categories[Object.keys(this.categories)[0]]);
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!picker.contains(e.target) && e.target.id !== 'emoji-btn') {
          picker.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 100);
  },

  showCat(cat) {
    document.querySelectorAll('.emoji-cat-btn').forEach(b => {
      b.style.background = b.dataset.cat === cat ? 'var(--bg-active)' : 'none';
    });
    this.renderGrid(this.categories[cat] || []);
  },

  renderGrid(emojis) {
    const grid = document.getElementById('emoji-grid');
    if (!grid) return;
    grid.innerHTML = emojis.map(e => `
      <button class="emoji-btn" style="width:36px;height:36px;font-size:20px;border:none;background:none;cursor:pointer;border-radius:var(--radius-sm);transition:background var(--transition)"
        onmouseover="this.style.background='var(--bg-hover)';document.getElementById('ep-icon').textContent='${e}';document.getElementById('ep-name').textContent='${e}'"
        onmouseout="this.style.background='none'"
        onclick="EmojiPicker.insert('${e}')">${e}</button>`).join('');
  },

  insert(emoji) {
    const input = document.getElementById('msg-input');
    if (!input) return;
    const start = input.selectionStart;
    const end   = input.selectionEnd;
    input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
    input.selectionStart = input.selectionEnd = start + emoji.length;
    input.focus();
    autoResize(input);
    document.getElementById('emoji-picker-popup')?.remove();
  }
};

document.addEventListener('DOMContentLoaded', () => EmojiPicker.init());
