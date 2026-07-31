// CONNECTO — @Mention autocomplete
const Mentions = {
  active:   false,
  selected: -1,
  results:  [],

  check(input) {
    const val   = input.value;
    const caret = input.selectionStart;
    // Find last @ before cursor
    const before  = val.slice(0, caret);
    const atMatch = before.match(/@(\w*)$/);
    if (!atMatch) { this.close(); return; }
    const query = atMatch[1];
    this.search(query, input);
  },

  async search(query, input) {
    if (!App.currentServer) { this.close(); return; }
    const res  = await fetch(`/s/api/${App.currentServer}/members`);
    const data = await res.json();
    const members = (data.members || []).filter(m =>
      !query || m.displayName?.toLowerCase().includes(query.toLowerCase()) ||
      m.username?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);
    this.results = members;
    this.render(members, input);
  },

  render(members, input) {
    let list = document.getElementById('mention-list');
    if (!list) {
      list = document.createElement('div');
      list.id        = 'mention-list';
      list.className = 'mention-list';
      input.parentElement.style.position = 'relative';
      input.parentElement.appendChild(list);
    }
    if (!members.length) { this.close(); return; }
    this.active   = true;
    this.selected = 0;
    list.innerHTML = members.map((m, i) => `
      <div class="mention-item${i===0?' selected':''}" data-idx="${i}" data-username="${m.username||m.displayName}">
        <img src="${m.avatarUrl||'/static/icons/default-avatar.svg'}" alt="">
        <div>
          <div class="mention-item-name">${sanitizeText(m.displayName||'User')}</div>
          <div class="mention-item-role">${sanitizeText(m.role||'member')}</div>
        </div>
      </div>`).join('');

    list.querySelectorAll('.mention-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.insert(parseInt(item.dataset.idx), input);
      });
    });

    // Keyboard nav
    input.onkeydown = (e) => {
      if (!this.active) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1, list); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.move(-1, list); }
      else if (e.key === 'Enter' || e.key === 'Tab') {
        if (this.active) { e.preventDefault(); this.insert(this.selected, input); }
        else if (e.key === 'Enter') { e.preventDefault(); Messages.send(); }
      } else if (e.key === 'Escape') { this.close(); }
    };
  },

  move(dir, list) {
    this.selected = Math.max(0, Math.min(this.results.length - 1, this.selected + dir));
    list.querySelectorAll('.mention-item').forEach((el, i) =>
      el.classList.toggle('selected', i === this.selected));
  },

  insert(idx, input) {
    const member = this.results[idx];
    if (!member) return;
    const val    = input.value;
    const caret  = input.selectionStart;
    const before = val.slice(0, caret).replace(/@\w*$/, `@${member.username||member.displayName} `);
    input.value  = before + val.slice(caret);
    input.selectionStart = input.selectionEnd = before.length;
    this.close();
    input.focus();
  },

  close() {
    this.active   = false;
    this.selected = -1;
    document.getElementById('mention-list')?.remove();
  }
};
