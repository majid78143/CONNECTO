// CONNECTO — Utility functions

// ── Context Menu ─────────────────────────────────────────────
let activeContextMenu = null;

window.showContextMenu = function(items, x, y) {
  closeContextMenu();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = `${Math.min(x, window.innerWidth - 220)}px`;
  menu.style.top  = `${Math.min(y, window.innerHeight - items.length * 40 - 20)}px`;

  items.forEach(item => {
    if (item === 'divider') {
      const sep = document.createElement('div');
      sep.className = 'context-separator';
      menu.appendChild(sep);
      return;
    }
    const btn = document.createElement('button');
    btn.className = `context-item${item.danger ? ' danger' : ''}`;
    btn.innerHTML = `${item.icon ? `<span style="font-size:16px">${item.icon}</span>` : ''}<span>${item.label}</span>`;
    btn.onclick = () => { item.action(); closeContextMenu(); };
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
  activeContextMenu = menu;
  setTimeout(() => document.addEventListener('click', closeContextMenu, { once: true }), 10);
};

function closeContextMenu() {
  if (activeContextMenu) { activeContextMenu.remove(); activeContextMenu = null; }
}

// ── Ripple effect on buttons ─────────────────────────────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  const rect   = btn.getBoundingClientRect();
  const size   = Math.max(rect.width, rect.height);
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
});

// ── Modal helpers ─────────────────────────────────────────────
window.openModal = function(content) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className  = 'modal-overlay';
  overlay.id         = 'active-modal';
  overlay.innerHTML  = `<div class="modal">${content}</div>`;
  overlay.onclick    = (e) => { if (e.target === overlay) closeModal(); };
  document.body.appendChild(overlay);
  return overlay;
};

window.closeModal = function() {
  const m = document.getElementById('active-modal');
  if (m) m.remove();
};

// ── Confirm dialog ────────────────────────────────────────────
window.confirm2 = function(message, onConfirm, danger = false) {
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title">Confirm</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <p style="color:var(--text-secondary);margin-bottom:20px">${message}</p>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">Confirm</button>
    </div>
  `);
  document.getElementById('confirm-ok').onclick = () => { closeModal(); onConfirm(); };
};

// ── Debounce ─────────────────────────────────────────────────
window.debounce = function(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

// ── Sanitize HTML (for normal users) ─────────────────────────
window.sanitizeText = function(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
};

// ── Parse mentions in message text ──────────────────────────
window.parseMentions = function(text) {
  return text.replace(/@(\w+)/g, '<span class="mention-tag">@$1</span>');
};

// ── Auto-resize textarea ─────────────────────────────────────
window.autoResize = function(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
};

// ── Long press detection ─────────────────────────────────────
window.onLongPress = function(el, callback, duration = 600) {
  let timer;
  el.addEventListener('touchstart', (e) => {
    timer = setTimeout(() => callback(e), duration);
  });
  el.addEventListener('touchend',   () => clearTimeout(timer));
  el.addEventListener('touchmove',  () => clearTimeout(timer));
};

// ── Format coin count ─────────────────────────────────────────
window.formatCoins = function(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n/1000).toFixed(1) + 'K';
  return n.toString();
};

// ── Keyboard shortcut: Ctrl+K → search ───────────────────────
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    window.openSearch && window.openSearch();
  }
  if (e.key === 'Escape') {
    closeModal();
    closeContextMenu();
    window.closeSearch && window.closeSearch();
  }
});
