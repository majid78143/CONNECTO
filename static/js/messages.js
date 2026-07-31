// CONNECTO — Messages JS
'use strict';

const Messages = {
  listener:       null,
  replyTo:        null,
  slowModeTimer:  null,
  lastSend:       0,

  load(serverId, channelId) {
    const list = document.getElementById('messages-list');
    if (!list) return;
    if (this.listener) { this.listener(); this.listener = null; }
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><div class="spinner" style="margin:0 auto 12px"></div>Loading messages...</div>`;

    this.listener = db.collection('messages').doc(serverId).collection(channelId)
      .orderBy('timestamp', 'asc').limitToLast(50)
      .onSnapshot(snap => {
        const isScrolledDown = list.scrollTop + list.clientHeight >= list.scrollHeight - 100;
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const msg = { id: change.doc.id, ...change.doc.data() };
            // Remove loading
            const loading = list.querySelector('.spinner');
            if (loading) list.innerHTML = '';
            // Check if consecutive (compact mode)
            const lastMsg  = list.lastElementChild;
            const isCompact= lastMsg && lastMsg.dataset.sender === msg.senderId
                             && (msg.timestamp - parseInt(lastMsg.dataset.ts)) < 300000;
            list.appendChild(this.buildMessage(msg, isCompact));
          }
          if (change.type === 'modified') {
            const el = document.getElementById(`msg-${change.doc.id}`);
            if (el) {
              const msg = { id: change.doc.id, ...change.doc.data() };
              el.replaceWith(this.buildMessage(msg, el.classList.contains('message-compact')));
            }
          }
          if (change.type === 'removed') {
            document.getElementById(`msg-${change.doc.id}`)?.remove();
          }
        });
        if (isScrolledDown) list.scrollTop = list.scrollHeight;
        // Check mentions
        this.highlightMentions();
      });

    // Typing indicator
    this.setupTyping(serverId, channelId);
  },

  buildMessage(msg, compact = false) {
    const isOwn    = auth.currentUser?.uid === msg.senderId;
    const wrapper  = document.createElement('div');
    wrapper.id     = `msg-${msg.id}`;
    wrapper.dataset.sender = msg.senderId;
    wrapper.dataset.ts     = msg.timestamp?.seconds ? msg.timestamp.seconds * 1000 : msg.timestamp;
    wrapper.className      = `message-group${compact ? ' message-compact' : ''}${msg.mentioned ? ' mentioned' : ''}`;

    let content = '';

    // Reply preview
    if (msg.replyTo) {
      content += `<div class="message-reply-preview" onclick="Messages.jumpTo('${msg.replyTo.messageId}')">
        <svg width="12" height="8" viewBox="0 0 12 8"><path d="M1 7V3C1 1.9 1.9 1 3 1h8M1 7L4 4M1 7L4 10" stroke="currentColor" fill="none" stroke-width="1.5"/></svg>
        <span style="font-weight:600;color:var(--accent-blue)">@${sanitizeText(msg.replyTo.username||'Unknown')}</span>
        <span>${sanitizeText((msg.replyTo.contentPreview||'').slice(0,60))}</span>
      </div>`;
    }

    if (!compact) {
      const tsNum = msg.timestamp?.seconds ? msg.timestamp.seconds * 1000 : msg.timestamp;
      content += `
        <div class="message-avatar">
          <img class="avatar avatar-md" src="${msg.avatarUrl||'/static/icons/default-avatar.svg'}" 
               onclick="window.location.href='/u/${msg.senderId}'" style="cursor:pointer">
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-author" onclick="window.location.href='/u/${msg.senderId}'" style="color:${msg.roleColor||'var(--text-primary)'}">
              ${sanitizeText(msg.displayName||'User')}
              ${msg.isPremium ? '<span class="badge badge-gold" style="font-size:10px">💎</span>' : ''}
              ${msg.isBot ? '<span class="badge badge-blue" style="font-size:10px">BOT</span>' : ''}
              ${msg.isOfficialBot ? '<span class="badge badge-blue" style="font-size:10px">✅ OFFICIAL</span>' : ''}
            </span>
            <span class="message-time">${formatTime(tsNum)}</span>
            ${msg.edited ? '<span class="message-edited">(edited)</span>' : ''}
          </div>`;
    } else {
      content += `<div class="message-content" style="padding-left:calc(40px + 14px)">`;
    }

    // Message body
    let body = '';
    if (msg.isHtml) {
      body = `<div class="message-text html-content">${msg.content}</div>`;
    } else {
      body = `<div class="message-text">${parseMentions(sanitizeText(msg.content||''))}</div>`;
    }

    // Image
    let imgHtml = '';
    if (msg.imageUrl) {
      imgHtml = `<img class="message-image" src="${msg.imageUrl}" alt="Image" onclick="window.open('${msg.imageUrl}','_blank')" loading="lazy">`;
    }

    // Link preview placeholder
    let linkPreview = msg.linkPreview ? `
      <a class="link-preview" href="${msg.linkPreview.url}" target="_blank" rel="noopener">
        ${msg.linkPreview.image ? `<img class="link-preview-thumb" src="${msg.linkPreview.image}" alt="">` : ''}
        <div class="link-preview-body">
          <div class="link-preview-site">${sanitizeText(msg.linkPreview.site||'')}</div>
          <div class="link-preview-title">${sanitizeText(msg.linkPreview.title||'')}</div>
          <div class="link-preview-desc">${sanitizeText(msg.linkPreview.description||'')}</div>
        </div>
      </a>` : '';

    // Reactions
    const reactions = msg.reactions || {};
    let reactHtml = '<div class="reaction-bar">';
    Object.entries(reactions).forEach(([emoji, users]) => {
      const count   = Object.values(users).filter(Boolean).length;
      if (!count) return;
      const reacted = users[auth.currentUser?.uid];
      reactHtml += `<button class="reaction-pill${reacted?' reacted':''}" onclick="Messages.toggleReaction('${msg.id}','${emoji}')" data-emoji="${emoji}">
        <span>${emoji}</span><span class="reaction-count">${count}</span>
      </button>`;
    });
    reactHtml += '</div>';

    content += body + imgHtml + linkPreview + reactHtml;
    content += `</div>`;

    // Action bar (hover)
    content += `
      <div class="message-actions">
        <button class="msg-action-btn" onclick="Messages.quickReact('${msg.id}')" title="React">😄</button>
        <button class="msg-action-btn" onclick="Messages.replyTo('${msg.id}','${sanitizeText(msg.senderId)}','${sanitizeText(msg.displayName||'User')}','${sanitizeText((msg.content||'').slice(0,60))}')" title="Reply">↩️</button>
        ${isOwn ? `<button class="msg-action-btn" onclick="Messages.edit('${msg.id}')" title="Edit">✏️</button>` : ''}
        <button class="msg-action-btn" onclick="Messages.copyLink('${msg.id}')" title="Copy Link">🔗</button>
        <button class="msg-action-btn" onclick="Messages.showMore('${msg.id}',event)" title="More">···</button>
      </div>`;

    wrapper.innerHTML = content;

    // Long press (mobile)
    onLongPress(wrapper, (e) => {
      Messages.showContextMenu(msg, e.touches[0].clientX, e.touches[0].clientY, isOwn);
    });

    // Right click
    wrapper.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      Messages.showContextMenu(msg, e.clientX, e.clientY, isOwn);
    });

    return wrapper;
  },

  showContextMenu(msg, x, y, isOwn) {
    const items = [
      { icon: '↩️', label: 'Reply',          action: () => this.replyTo(msg.id, msg.senderId, msg.displayName, msg.content) },
      { icon: '😄', label: 'Add Reaction',   action: () => this.quickReact(msg.id) },
      { icon: '📋', label: 'Copy Text',      action: () => copyToClipboard(msg.content||'') },
      { icon: '🔗', label: 'Copy Message Link', action: () => copyToClipboard(getMessageLink(msg.id)) },
      { icon: '🔢', label: 'Copy ID',        action: () => copyToClipboard(msg.id) },
      'divider',
    ];
    if (isOwn) items.push({ icon: '✏️', label: 'Edit Message', action: () => this.edit(msg.id) });
    // Pin (moderator+)
    items.push({ icon: '📌', label: 'Pin Message', action: () => this.pin(msg.id) });
    // Delete
    items.push({ icon: '🗑️', label: 'Delete Message', danger: true, action: () => this.delete(msg.id, isOwn) });
    showContextMenu(items, x, y);
  },

  async send() {
    const input    = document.getElementById('msg-input');
    const content  = input?.value.trim();
    if (!content || !App.currentServer || !App.currentChannel) return;

    const ch = App.channels[App.currentChannel] || {};
    // Slow mode check
    if (ch.slowMode > 0) {
      const now = Date.now();
      if (now - this.lastSend < ch.slowMode * 1000) {
        const wait = Math.ceil((ch.slowMode * 1000 - (now - this.lastSend)) / 1000);
        toast(`Slow mode: wait ${wait}s`, 'warning', 2000);
        return;
      }
    }

    const user    = auth.currentUser;
    const userDoc = await db.collection('users').doc(user.uid).get();
    const ud      = userDoc.data() || {};
    const isPremium = ud.isPremium;

    // Is HTML message? (premium only, starts with <)
    const isHtml = isPremium && content.trimStart().startsWith('<');

    const msgData = {
      content:     content,
      senderId:    user.uid,
      displayName: ud.displayName || user.displayName || 'User',
      avatarUrl:   ud.avatarUrl   || user.photoURL    || '',
      isPremium:   isPremium,
      isHtml:      isHtml,
      timestamp:   firebase.firestore.FieldValue.serverTimestamp(),
      reactions:   {},
      edited:      false,
    };

    if (this.replyTo) {
      msgData.replyTo = this.replyTo;
      this.clearReply();
    }

    // Check mentions
    const mentions = [...content.matchAll(/@(\w+)/g)].map(m => m[1]);
    if (mentions.length) msgData.mentions = mentions;

    input.value   = '';
    autoResize(input);
    this.lastSend = Date.now();

    try {
      await db.collection('messages').doc(App.currentServer).collection(App.currentChannel).add(msgData);
      this.stopTyping();
    } catch(e) { toast('Failed to send message','error'); }
  },

  async sendWithImage(file) {
    if (!App.currentServer || !App.currentChannel) return;
    try {
      const up   = await uploadImage(file);
      const user = auth.currentUser;
      const ud   = (await db.collection('users').doc(user.uid).get()).data() || {};
      await db.collection('messages').doc(App.currentServer).collection(App.currentChannel).add({
        content:     '',
        imageUrl:    up.url,
        senderId:    user.uid,
        displayName: ud.displayName || 'User',
        avatarUrl:   ud.avatarUrl   || '',
        timestamp:   firebase.firestore.FieldValue.serverTimestamp(),
        reactions:   {},
        edited:      false,
      });
      toast('Image sent!','success',2000);
    } catch(e) { toast('Image upload failed','error'); }
  },

  setReply(msgId, senderId, senderName, preview) {
    this.replyTo = { messageId: msgId, senderId, username: senderName, contentPreview: preview };
    const bar    = document.getElementById('reply-bar');
    if (bar) {
      bar.classList.remove('hidden');
      bar.querySelector('.reply-bar-text').innerHTML = `Replying to <strong style="color:var(--accent-blue)">@${sanitizeText(senderName)}</strong>: ${sanitizeText(preview.slice(0,60))}`;
    }
    document.getElementById('msg-input')?.focus();
  },

  clearReply() {
    this.replyTo = null;
    document.getElementById('reply-bar')?.classList.add('hidden');
  },

  // Alias for onclick strings
  replyTo(id, sid, name, preview) { this.setReply(id, sid, name, preview); },

  async edit(msgId) {
    if (!App.currentServer || !App.currentChannel) return;
    const doc = await db.collection('messages').doc(App.currentServer).collection(App.currentChannel).doc(msgId).get();
    if (!doc.exists) return;
    const msg = doc.data();
    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Edit Message</h3>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="form-group">
        <textarea class="textarea" id="edit-content" rows="4">${msg.isHtml ? msg.content : sanitizeText(msg.content||'')}</textarea>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Messages.saveEdit('${msgId}')">Save</button>
      </div>
    `);
  },

  async saveEdit(msgId) {
    const content = document.getElementById('edit-content')?.value.trim();
    if (!content) return;
    await db.collection('messages').doc(App.currentServer).collection(App.currentChannel).doc(msgId).update({
      content, edited: true, editedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeModal();
    toast('Message edited','success',2000);
  },

  async delete(msgId, isOwn) {
    const canDelete = isOwn; // Higher role check happens via Firestore rules
    if (!canDelete) { toast('Cannot delete this message','error'); return; }
    confirm2('Delete this message? This cannot be undone.', async () => {
      try {
        await db.collection('messages').doc(App.currentServer).collection(App.currentChannel).doc(msgId).delete();
        toast('Message deleted','success',2000);
      } catch(e) { toast('Cannot delete — insufficient permissions','error'); }
    }, true);
  },

  async pin(msgId) {
    try {
      await db.collection('pinned').doc(App.currentServer).collection(App.currentChannel).doc(msgId).set({
        pinnedAt: firebase.firestore.FieldValue.serverTimestamp(),
        pinnedBy: auth.currentUser.uid
      });
      toast('Message pinned','success',2000);
    } catch(e) { toast('Cannot pin — insufficient permissions','error'); }
  },

  async toggleReaction(msgId, emoji) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const ref    = db.collection('messages').doc(App.currentServer).collection(App.currentChannel).doc(msgId);
    const doc    = await ref.get();
    const reacted= doc.data()?.reactions?.[emoji]?.[uid];
    await ref.update({ [`reactions.${emoji}.${uid}`]: !reacted });
  },

  quickReact(msgId) {
    const commonEmojis = ['👍','❤️','😂','😮','😢','🔥','✅','🎉','💯','👀'];
    const el = document.getElementById(`msg-${msgId}`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const picker = document.createElement('div');
    picker.style.cssText = `position:fixed;top:${rect.top-50}px;left:${rect.left}px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-xl);padding:6px;display:flex;gap:2px;z-index:9000;box-shadow:var(--shadow-lg)`;
    commonEmojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'emoji-btn'; btn.textContent = emoji;
      btn.onclick = () => { this.toggleReaction(msgId, emoji); picker.remove(); };
      picker.appendChild(btn);
    });
    document.body.appendChild(picker);
    setTimeout(() => document.addEventListener('click', () => picker.remove(), { once: true }), 10);
  },

  copyLink(msgId) { copyToClipboard(getMessageLink(msgId)); },

  showMore(msgId, e) {
    const msg = { id: msgId, content: '', senderId: '' };
    this.showContextMenu(msg, e.clientX, e.clientY, false);
  },

  jumpTo(msgId) {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('message-flash'); setTimeout(() => el.classList.remove('message-flash'), 1100); }
  },

  highlightMentions() {
    const username = auth.currentUser?.displayName || '';
    document.querySelectorAll('.mention-tag').forEach(el => {
      if (el.textContent.slice(1).toLowerCase() === username.toLowerCase()) {
        el.closest('.message-group')?.classList.add('mentioned');
      }
    });
  },

  // Typing indicator
  typingTimeout: null,
  setupTyping(serverId, channelId) {
    const input = document.getElementById('msg-input');
    if (!input) return;
    const uid   = auth.currentUser?.uid;
    const ref   = rtdb.ref(`typing/${serverId}/${channelId}/${uid}`);
    input.addEventListener('input', () => {
      ref.set(true);
      clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => ref.remove(), 3000);
    });
    // Listen to others typing
    rtdb.ref(`typing/${serverId}/${channelId}`).on('value', snap => {
      const typers = Object.keys(snap.val() || {}).filter(k => k !== uid);
      const el = document.getElementById('typing-status');
      if (el) el.innerHTML = typers.length ? `<span class="typing-dots"><span></span><span></span><span></span></span> ${typers.length === 1 ? 'Someone is' : typers.length + ' people are'} typing...` : '';
    });
  },

  stopTyping() {
    const uid = auth.currentUser?.uid;
    if (App.currentServer && App.currentChannel && uid) {
      rtdb.ref(`typing/${App.currentServer}/${App.currentChannel}/${uid}`).remove();
    }
  }
};

// ── Input event handlers ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('msg-input');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); Messages.send(); }
    // @ mention
    if (e.key === '@') { setTimeout(() => Mentions.check(input), 0); }
  });
  input.addEventListener('input', (e) => {
    autoResize(input);
    Mentions.check(input);
  });

  // File upload via attachment btn
  document.getElementById('attach-btn')?.addEventListener('click', () => {
    document.getElementById('file-input')?.click();
  });
  document.getElementById('file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) Messages.sendWithImage(file);
    e.target.value = '';
  });

  // Send button
  document.getElementById('send-btn')?.addEventListener('click', () => Messages.send());

  // Reply close
  document.querySelector('.reply-bar-close')?.addEventListener('click', () => Messages.clearReply());
});
