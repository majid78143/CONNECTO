// CONNECTO — Main App Logic
'use strict';

const App = {
  currentUser:    null,
  currentServer:  null,
  currentChannel: null,
  currentDmUid:   null,
  servers:        {},
  channels:       {},
  members:        {},
  listeners:      [],

  async init() {
    auth.onAuthStateChanged(async (user) => {
      if (!user) { window.location.href = '/auth/login'; return; }
      this.currentUser = user;
      await this.loadUserProfile();
      await this.loadServers();
      this.setupPresence();
      this.initSearch();
      // Load from URL
      const sid = window.SERVER_ID;
      if (sid) await this.selectServer(sid);
    });
  },

  async loadUserProfile() {
    const doc = await db.collection('users').doc(this.currentUser.uid).get();
    if (doc.exists) {
      const data = doc.data();
      document.getElementById('ua-name').textContent   = data.displayName || data.username || 'User';
      document.getElementById('ua-status').textContent = data.customStatus || 'Online';
      const av = document.getElementById('ua-avatar');
      if (av && data.avatarUrl) av.src = data.avatarUrl;
      // Apply theme
      if (data.settings?.theme) document.documentElement.setAttribute('data-theme', data.settings.theme);
    }
  },

  async loadServers() {
    const uid = this.currentUser.uid;
    const snap = await db.collectionGroup('members').where('uid','==',uid).get();
    const serverIds = [...new Set(snap.docs.map(d => d.ref.parent.parent.id))];
    const container = document.getElementById('server-list');
    if (!container) return;
    container.innerHTML = '';
    for (const sid of serverIds.slice(0,50)) {
      const sDoc = await db.collection('servers').doc(sid).get();
      if (!sDoc.exists) continue;
      const s = sDoc.data();
      this.servers[sid] = s;
      container.appendChild(this.buildServerIcon(sid, s));
    }
    // DM icon
    const dmIcon = document.getElementById('dm-icon');
    if (dmIcon) dmIcon.onclick = () => this.showDmList();
  },

  buildServerIcon(sid, s) {
    const btn = document.createElement('div');
    btn.className = 'server-icon-btn bounce-hover';
    btn.setAttribute('data-tooltip', s.name);
    btn.innerHTML = `<div class="server-pip"></div>`;
    if (s.iconUrl) {
      btn.innerHTML += `<img src="${s.iconUrl}" alt="${s.name}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
    } else {
      btn.innerHTML += `<span>${s.name.charAt(0).toUpperCase()}</span>`;
    }
    if (s.isVerified) btn.innerHTML += `<span style="position:absolute;bottom:-2px;right:-2px;font-size:12px">✅</span>`;
    btn.onclick = () => this.selectServer(sid);
    btn.id = `server-btn-${sid}`;
    return btn;
  },

  async selectServer(sid) {
    this.currentServer  = sid;
    this.currentChannel = null;
    // Highlight active
    document.querySelectorAll('.server-icon-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`server-btn-${sid}`);
    if (btn) btn.classList.add('active');
    // Load channels
    await this.loadChannels(sid);
    await this.loadMembers(sid);
    // Update header
    const sData = this.servers[sid] || {};
    const hdr = document.getElementById('server-header-name');
    if (hdr) hdr.textContent = sData.name || 'Server';
  },

  async loadChannels(sid) {
    const snap = await db.collection('servers').doc(sid).collection('channels').orderBy('position').get();
    const container = document.getElementById('channel-list');
    if (!container) return;
    container.innerHTML = '';
    const categories = {};
    snap.docs.forEach(d => {
      const ch = { id: d.id, ...d.data() };
      const cat = ch.category || 'TEXT CHANNELS';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(ch);
      this.channels[d.id] = ch;
    });
    Object.entries(categories).forEach(([cat, chs]) => {
      const catEl = document.createElement('div');
      catEl.className = 'channel-category';
      catEl.innerHTML = `<div class="channel-category-header"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3L5 7L8 3" stroke="currentColor" fill="none" stroke-width="1.5"/></svg>${cat}</div>`;
      chs.forEach(ch => catEl.appendChild(this.buildChannelItem(ch)));
      container.appendChild(catEl);
    });
    // Auto-select first text channel
    if (snap.docs.length > 0) {
      const first = snap.docs.find(d => d.data().type === 'text');
      if (first) this.selectChannel(first.id);
    }
  },

  buildChannelItem(ch) {
    const item = document.createElement('div');
    item.className  = 'channel-item';
    item.id         = `ch-${ch.id}`;
    const icons = { text:'#', announcement:'📢', voice:'🔊' };
    item.innerHTML  = `<span style="font-size:16px">${icons[ch.type]||'#'}</span><span class="channel-item-name">${ch.name}</span>`;
    item.onclick    = () => this.selectChannel(ch.id);
    return item;
  },

  selectChannel(cid) {
    this.currentChannel = cid;
    document.querySelectorAll('.channel-item').forEach(i => i.classList.remove('active'));
    const item = document.getElementById(`ch-${cid}`);
    if (item) item.classList.add('active');
    const ch = this.channels[cid] || {};
    const hdr = document.getElementById('chat-channel-name');
    if (hdr) hdr.textContent = (ch.type === 'announcement' ? '📢 ' : '# ') + (ch.name || 'channel');
    const placeholder = document.getElementById('msg-input');
    if (placeholder) placeholder.placeholder = `Message #${ch.name || 'channel'}`;
    // Load messages
    Messages.load(this.currentServer, cid);
    // Slow mode
    if (ch.slowMode > 0) {
      const bar = document.getElementById('slow-mode-bar');
      if (bar) { bar.classList.remove('hidden'); bar.querySelector('span').textContent = `Slow mode: ${ch.slowMode}s`; }
    } else {
      const bar = document.getElementById('slow-mode-bar');
      if (bar) bar.classList.add('hidden');
    }
  },

  async loadMembers(sid) {
    const res  = await fetch(`/s/api/${sid}/members`);
    const data = await res.json();
    const container = document.getElementById('members-list');
    if (!container || !data.members) return;
    container.innerHTML = '';
    const groups = { online: [], offline: [] };
    data.members.forEach(m => { groups[m.isOnline ? 'online' : 'offline'].push(m); });

    ['online','offline'].forEach(grp => {
      if (!groups[grp].length) return;
      const cat = document.createElement('div');
      cat.className   = 'member-category';
      cat.textContent = `${grp.toUpperCase()} — ${groups[grp].length}`;
      container.appendChild(cat);
      groups[grp].forEach(m => {
        const item = document.createElement('div');
        item.className = 'member-item';
        item.innerHTML = `
          <div class="avatar-wrapper">
            <img class="avatar avatar-sm" src="${m.avatarUrl||'/static/icons/default-avatar.svg'}" alt="">
            <div class="status-dot ${grp}"></div>
          </div>
          <div class="member-item-info">
            <div class="member-item-name">${m.displayName||m.uid.slice(0,8)}${m.isPremium?'<span class="badge badge-gold" style="margin-left:4px;font-size:9px">💎</span>':''}</div>
            <div class="member-item-status">${m.customStatus||''}</div>
          </div>`;
        item.onclick = () => window.location.href = `/u/${m.uid}`;
        container.appendChild(item);
      });
    });
  },

  setupPresence() {
    const uid = this.currentUser.uid;
    const ref = rtdb.ref(`presence/${uid}`);
    ref.set({ online: true, lastSeen: Date.now() });
    ref.onDisconnect().set({ online: false, lastSeen: Date.now() });
    // Update Firestore
    db.collection('users').doc(uid).update({ isOnline: true, lastSeen: Date.now() });
    window.addEventListener('beforeunload', () => {
      ref.set({ online: false, lastSeen: Date.now() });
      db.collection('users').doc(uid).update({ isOnline: false, lastSeen: Date.now() });
    });
  },

  initSearch() {
    window.openSearch = () => {
      document.getElementById('search-overlay')?.classList.remove('hidden');
      document.getElementById('search-input')?.focus();
    };
    window.closeSearch = () => {
      document.getElementById('search-overlay')?.classList.add('hidden');
    };
    const input = document.getElementById('search-input');
    if (input) {
      input.addEventListener('input', debounce(async (e) => {
        const q = e.target.value.trim();
        if (q.length < 2) { document.getElementById('search-results').innerHTML = ''; return; }
        const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        Servers.renderSearchResults(data.results);
      }, 300));
    }
  },

  showCreateServerModal() {
    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Create a Server</h3>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="form-group">
        <label class="form-label">Server Name</label>
        <input class="input" id="srv-name" placeholder="My Awesome Server" maxlength="100"/>
      </div>
      <div class="form-group">
        <label class="form-label">Template</label>
        <select class="select" id="srv-template">
          <option value="">No template</option>
          <option value="gaming">🎮 Gaming</option>
          <option value="study">📚 Study Group</option>
          <option value="work">💼 Work Team</option>
          <option value="music">🎵 Music</option>
          <option value="community">🌐 Community</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Server Icon</label>
        <input type="file" id="srv-icon-file" accept="image/*" style="display:none"/>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('srv-icon-file').click()">📷 Upload Icon</button>
        <span id="srv-icon-name" style="font-size:12px;color:var(--text-muted);margin-left:8px"></span>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="App.createServer()">Create Server</button>
      </div>
    `);
  },

  async createServer() {
    const name     = document.getElementById('srv-name').value.trim();
    const template = document.getElementById('srv-template').value;
    const iconFile = document.getElementById('srv-icon-file').files[0];
    if (!name) { toast('Server name required','error'); return; }

    let iconUrl = '';
    if (iconFile) {
      try {
        const up = await uploadImage(iconFile, '/api/upload/server-icon');
        iconUrl  = up.url;
      } catch(e) { toast('Icon upload failed','warning'); }
    }

    const res  = await fetch('/s/api/create', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ name, template, iconUrl, isPublic: true })
    });
    const data = await res.json();
    if (data.success) {
      toast(`Server "${name}" created!`, 'success');
      closeModal();
      location.reload();
    } else {
      toast(data.error || 'Failed', 'error');
    }
  }
};

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('app-shell')) App.init();
});
