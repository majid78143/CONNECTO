// CONNECTO — Firebase helpers & session management

// ── Session sync ─────────────────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      const idToken = await user.getIdToken();
      await fetch('/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      // Presence — set online
      const presRef = rtdb.ref(`presence/${user.uid}`);
      presRef.set({ online: true, lastSeen: Date.now() });
      presRef.onDisconnect().set({ online: false, lastSeen: Date.now() });
    } catch (e) {
      console.warn('Session sync error:', e);
    }
  }
});

// ── Toast notifications ──────────────────────────────────────
window.toast = function(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span style="font-size:18px">${icons[type]||'ℹ️'}</span><span style="flex:1">${message}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:18px;padding:0 0 0 8px">×</button>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 300ms ease forwards';
    setTimeout(() => el.remove(), 300);
  }, duration);
};

// ── Upload image via backend proxy ───────────────────────────
window.uploadImage = async function(file, endpoint = '/api/upload/image') {
  const formData = new FormData();
  formData.append('image', file);
  const res  = await fetch(endpoint, { method: 'POST', body: formData });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Upload failed');
  return data; // { url, display, thumb, delete }
};

// ── Unique message link ──────────────────────────────────────
window.getMessageLink = function(messageId) {
  return `${location.origin}/m/${messageId}`;
};

// ── Copy to clipboard ────────────────────────────────────────
window.copyToClipboard = async function(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard!', 'success', 2000);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    ta.remove();
    toast('Copied!', 'success', 2000);
  }
};

// ── Format timestamp ─────────────────────────────────────────
window.formatTime = function(ts) {
  const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  if (diff < 604800000) return d.toLocaleDateString([],{weekday:'short',hour:'2-digit',minute:'2-digit'});
  return d.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'});
};

window.formatTimeShort = function(ts) {
  const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts);
  return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
};

// ── Theme toggle ─────────────────────────────────────────────
window.toggleTheme = function() {
  const html   = document.documentElement;
  const current= html.getAttribute('data-theme') || 'dark';
  const next   = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
};

// Apply saved theme
(function() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

// ── Scroll reveal observer ───────────────────────────────────
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
