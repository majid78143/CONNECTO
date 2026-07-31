// CONNECTO — Servers JS
'use strict';

const Servers = {
  renderSearchResults(results) {
    const el = document.getElementById('search-results');
    if (!el) return;
    if (!results || !results.length) {
      el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:14px">No results found</div>';
      return;
    }
    el.innerHTML = results.map(r => {
      const icon = r.type === 'server'
        ? `<div style="width:36px;height:36px;border-radius:10px;background:var(--accent-blue);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff;flex-shrink:0">${r.name?.charAt(0)||'S'}</div>`
        : `<img src="${r.avatarUrl||'/static/icons/default-avatar.svg'}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0">`;
      const sub = r.type === 'server'
        ? `${r.memberCount||0} members`
        : r.customStatus || 'User';
      const href= r.type === 'server'
        ? `/app?server=${r.id}`
        : `/u/${r.uid}`;
      return `<a href="${href}" class="search-result-item" style="display:flex;align-items:center;gap:12px;padding:10px 16px;text-decoration:none;transition:background var(--transition)" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
        ${icon}
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px;truncate">${sanitizeText(r.name||r.displayName||'')}</div>
          <div style="font-size:12px;color:var(--text-muted);truncate">${sanitizeText(sub)}</div>
        </div>
        <span style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">${r.type}</span>
      </a>`;
    }).join('');
  },

  async showSettings(sid) {
    const res  = await fetch(`/s/api/${sid}/settings`);
    const data = await res.json();
    const s    = data.server || {};
    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">⚙️ Server Settings</h3>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:0">
        ${[
          ['#general','🏠 Overview','General'],
          ['#roles','🎭 Roles','Roles'],
          ['#channels','#️⃣ Channels','Channels'],
          ['#invites','🔗 Invites','Invites'],
          ['#insights','📊 Insights','Insights'],
          ['#webhooks','🔗 Webhooks','Webhooks'],
          ['#audit','📜 Audit Log','Audit Log'],
          ['#verification','✅ Verification','Verification'],
          ['#danger','⛔ Danger Zone','Danger'],
        ].map(([id, label]) => `<div style="padding:10px 16px;cursor:pointer;border-radius:var(--radius-sm);font-size:14px" onclick="settingsTab('${id}',event)" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">${label}</div>`).join('')}
      </div>
      <div id="settings-tab-content" style="margin-top:8px;border-top:1px solid var(--border);padding-top:16px">
        <!-- General -->
        <div id="tab-general">
          <div class="form-group">
            <label class="form-label">Server Name</label>
            <input class="input" id="ss-name" value="${sanitizeText(s.name||'')}" maxlength="100"/>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="textarea" id="ss-desc" rows="3">${sanitizeText(s.description||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Slow Mode (seconds, 0 = off)</label>
            <input class="input" type="number" id="ss-slow" min="0" max="3600" value="${s.defaultSlowMode||0}"/>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn btn-primary" onclick="Servers.saveSettings('${sid}')">Save</button>
            <button class="btn btn-danger btn-sm" onclick="Servers.deleteServer('${sid}')">Delete Server</button>
          </div>
        </div>
      </div>
    `);
  },

  async saveSettings(sid) {
    const name = document.getElementById('ss-name')?.value.trim();
    const desc = document.getElementById('ss-desc')?.value.trim();
    const slow = parseInt(document.getElementById('ss-slow')?.value || '0');
    const res  = await fetch(`/s/api/${sid}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc, defaultSlowMode: slow })
    });
    const data = await res.json();
    if (data.success) { toast('Settings saved!', 'success'); closeModal(); location.reload(); }
    else toast(data.error || 'Failed', 'error');
  },

  async deleteServer(sid) {
    confirm2('Delete this server? ALL channels, messages, and members will be permanently removed.', async () => {
      const res  = await fetch(`/s/api/${sid}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { toast('Server deleted', 'success'); closeModal(); window.location.href = '/app'; }
      else toast(data.error || 'Failed', 'error');
    }, true);
  },

  async showInsights(sid) {
    const res  = await fetch(`/s/api/${sid}/insights`);
    const data = await res.json();
    openModal(`
      <div class="modal-header"><h3 class="modal-title">📊 Server Insights</h3><button class="modal-close" onclick="closeModal()">×</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        ${[['Members',data.memberCount||0],['Online Now',data.onlineCount||0],['Messages (7d)',data.weeklyMessages||0],['New Members (7d)',data.newMembers||0]].map(([l,v])=>`
        <div class="card" style="padding:16px;text-align:center"><div style="font-size:24px;font-weight:800">${v}</div><div style="font-size:12px;color:var(--text-muted)">${l}</div></div>`).join('')}
      </div>
      <div style="font-size:13px;color:var(--text-muted)">Top Channel: <strong>#${data.topChannel||'—'}</strong> · Peak hour: <strong>${data.peakHour||'—'}</strong></div>
    `);
  },

  async createWebhook(sid) {
    openModal(`
      <div class="modal-header"><h3 class="modal-title">🔗 Create Webhook</h3><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="form-group"><label class="form-label">Webhook Name</label><input class="input" id="wh-name" placeholder="My Webhook"/></div>
      <div class="form-group"><label class="form-label">Channel</label><select class="select" id="wh-channel">${Object.entries(App.channels||{}).map(([id,ch])=>`<option value="${id}">#${ch.name}</option>`).join('')}</select></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Servers.saveWebhook('${sid}')">Create</button>
      </div>`);
  },

  async saveWebhook(sid) {
    const name    = document.getElementById('wh-name').value.trim();
    const channel = document.getElementById('wh-channel').value;
    const res     = await fetch(`/s/api/${sid}/webhooks`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,channelId:channel}) });
    const data    = await res.json();
    if (data.success) {
      closeModal();
      toast(`Webhook created!`, 'success');
      openModal(`<div class="modal-header"><h3 class="modal-title">Webhook URL</h3><button class="modal-close" onclick="closeModal()">×</button></div><div style="font-family:var(--font-mono);font-size:12px;word-break:break-all;background:var(--bg-input);padding:14px;border-radius:var(--radius-md)">${data.webhookUrl}</div><button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="copyToClipboard('${data.webhookUrl}')">📋 Copy URL</button>`);
    } else toast(data.error, 'error');
  },

  async verifyServer(sid) {
    openModal(`
      <div class="modal-header"><h3 class="modal-title">✅ Apply for Verification</h3><button class="modal-close" onclick="closeModal()">×</button></div>
      <p style="color:var(--text-secondary);font-size:14px;margin-bottom:16px">Server verification requires 100+ members and active moderation. Our team reviews all applications within 3–5 days.</p>
      <div class="form-group"><label class="form-label">Why should your server be verified?</label><textarea class="textarea" id="verify-reason" rows="4" placeholder="Describe your community..."></textarea></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Servers.submitVerification('${sid}')">Submit Application</button>
      </div>`);
  },

  async submitVerification(sid) {
    const reason = document.getElementById('verify-reason').value.trim();
    if (!reason) { toast('Please provide a reason', 'warning'); return; }
    const res  = await fetch(`/s/api/${sid}/verify`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({reason}) });
    const data = await res.json();
    closeModal();
    if (data.success) toast('Application submitted! We\'ll review it within 3–5 days.', 'success', 5000);
    else toast(data.error||'Failed', 'error');
  }
};
