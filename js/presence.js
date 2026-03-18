/**
 * Presence — 접속 상태 관리 + 비활성 감지 + 자동 턴 스킵 + 위치 추적
 * 모든 게임에서 공통 사용
 */
const Presence = {
  roomCode: null,
  playerId: null,
  playerName: null,
  isActive: true,
  heartbeatTimer: null,
  visibilityBound: false,
  statusBarEl: null,
  listeners: [],
  onAutoSkip: null,
  autoSkipTimer: null,
  AUTO_SKIP_DELAY: 12000,
  currentHolder: null,

  init(opts) {
    this.roomCode = opts.roomCode;
    this.playerId = opts.playerId;
    this.playerName = opts.playerName;
    this.onAutoSkip = opts.onAutoSkip || null;
    this.isActive = true;

    // 내 상태를 online + 현재 게임 화면에 있다고 표시
    this._setMyStatus('online');
    this._setMyLocation('game');

    // ── Firebase onDisconnect: 연결 끊기면 자동 offline 처리 ──
    const myRef = db.ref(`rooms/${this.roomCode}/players/${this.playerId}`);
    myRef.child('status').onDisconnect().set('offline');
    myRef.child('lastSeen').onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);

    // ── .info/connected로 재연결 감지 ──
    db.ref('.info/connected').on('value', snap => {
      if (snap.val() === true) {
        // 연결됨 → onDisconnect 재설정
        myRef.child('status').onDisconnect().set('offline');
        myRef.child('lastSeen').onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
        this._setMyStatus('online');
      }
    });

    // ── 하트비트 (3초마다) ──
    this.heartbeatTimer = setInterval(() => {
      if (!this.roomCode) return;
      const updates = {};
      updates[`rooms/${this.roomCode}/players/${this.playerId}/lastSeen`] = firebase.database.ServerValue.TIMESTAMP;
      updates[`rooms/${this.roomCode}/players/${this.playerId}/status`] = this.isActive ? 'online' : 'away';
      db.ref().update(updates).catch(() => {});
    }, 3000);

    // ── 브라우저 이벤트 ──
    if (!this.visibilityBound) {
      this.visibilityBound = true;

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.isActive = false;
          this._setMyStatus('away');
        } else {
          this.isActive = true;
          this._setMyStatus('online');
          this._clearAutoSkip();
        }
      });

      window.addEventListener('blur', () => {
        this.isActive = false;
        this._setMyStatus('away');
      });

      window.addEventListener('focus', () => {
        this.isActive = true;
        this._setMyStatus('online');
        this._clearAutoSkip();
      });

      // ── 앱 완전 종료 / 탭 닫기 대응 ──
      window.addEventListener('pagehide', () => {
        this._setMyStatus('offline');
        // sendBeacon으로 확실히 전송
        if (this.roomCode && this.playerId) {
          const baseUrl = db.ref().toString();
          const url = `${baseUrl}/rooms/${this.roomCode}/players/${this.playerId}.json`;
          const data = JSON.stringify({
            status: 'offline',
            lastSeen: { '.sv': 'timestamp' }
          });
          try {
            navigator.sendBeacon(url + '?x-http-method-override=PATCH', data);
          } catch(e) {}
        }
      });

      window.addEventListener('beforeunload', () => {
        if (this.roomCode && this.playerId) {
          const baseUrl = db.ref().toString();
          const url = `${baseUrl}/rooms/${this.roomCode}/players/${this.playerId}.json`;
          const data = JSON.stringify({
            status: 'offline',
            lastSeen: { '.sv': 'timestamp' }
          });
          try {
            navigator.sendBeacon(url + '?x-http-method-override=PATCH', data);
          } catch(e) {}
        }
      });

      window.addEventListener('pageshow', () => {
        this.isActive = true;
        this._setMyStatus('online');
      });
    }

    this._createStatusBar();

    const plRef = db.ref(`rooms/${this.roomCode}/players`);
    plRef.on('value', snap => {
      const players = snap.val() || {};
      // 내가 강퇴당했는지 확인
      if (this.playerId && !players[this.playerId]) {
        this.destroy();
        sessionStorage.removeItem('roomCode');
        sessionStorage.removeItem('returnToLobby');
        alert('방장에 의해 강퇴되었습니다.');
        window.location.href = window.location.pathname.includes('/games/') ? '../index.html' : 'index.html';
        return;
      }
      this._renderStatusBar(players);
    });
    this.listeners.push(plRef);
  },

  setCurrentHolder(holderId) {
    this.currentHolder = holderId;
    this._clearAutoSkip();

    if (!holderId) return;
    if (holderId === this.playerId) return;

    db.ref(`rooms/${this.roomCode}/players/${holderId}/status`).once('value').then(snap => {
      const status = snap.val();
      if (status === 'away' || status === 'offline') {
        this._startAutoSkip(holderId);
      }
    });

    const holderRef = db.ref(`rooms/${this.roomCode}/players/${holderId}/status`);
    holderRef.on('value', snap => {
      const status = snap.val();
      if (this.currentHolder !== holderId) { holderRef.off(); return; }
      if (status === 'away' || status === 'offline') {
        this._startAutoSkip(holderId);
      } else {
        this._clearAutoSkip();
      }
    });
  },

  setGameEnded() {
    this._setMyLocation('gameEnd');
  },

  setBackToLobby() {
    this._setMyLocation('lobby');
  },

  destroy() {
    this._clearAutoSkip();
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    this.listeners.forEach(ref => { try { ref.off(); } catch(e) {} });
    this.listeners = [];
    try { db.ref('.info/connected').off(); } catch(e) {}
    if (this.statusBarEl && this.statusBarEl.parentNode) {
      this.statusBarEl.parentNode.removeChild(this.statusBarEl);
    }
    this.statusBarEl = null;
    this.currentHolder = null;
    this.visibilityBound = false;
  },

  // ── 내부 메서드 ──

  _setMyStatus(status) {
    if (!this.roomCode || !this.playerId) return;
    db.ref(`rooms/${this.roomCode}/players/${this.playerId}`).update({
      status: status,
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    }).catch(() => {});
  },

  _setMyLocation(location) {
    if (!this.roomCode || !this.playerId) return;
    db.ref(`rooms/${this.roomCode}/players/${this.playerId}`).update({
      location: location
    }).catch(() => {});
  },

  _startAutoSkip(holderId) {
    if (this.autoSkipTimer) return;
    this.autoSkipTimer = setTimeout(() => {
      this.autoSkipTimer = null;
      if (this.currentHolder !== holderId) return;
      db.ref(`rooms/${this.roomCode}/players/${holderId}/status`).once('value').then(snap => {
        const st = snap.val();
        if ((st === 'away' || st === 'offline') && this.onAutoSkip) {
          console.log('[Presence] Auto-skip:', holderId);
          this.onAutoSkip(holderId);
        }
      });
    }, this.AUTO_SKIP_DELAY);
  },

  _clearAutoSkip() {
    if (this.autoSkipTimer) { clearTimeout(this.autoSkipTimer); this.autoSkipTimer = null; }
  },

  _createStatusBar() {
    if (this.statusBarEl) return;
    const el = document.createElement('div');
    el.id = 'presenceBar';
    el.style.cssText = 'width:100%;max-width:500px;margin:8px auto;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;';
    const anchor = document.querySelector('.info') || document.querySelector('h1');
    if (anchor && anchor.nextSibling) {
      anchor.parentNode.insertBefore(el, anchor.nextSibling);
    } else {
      document.body.insertBefore(el, document.body.firstChild);
    }
    this.statusBarEl = el;
  },

  _renderStatusBar(players) {
    if (!this.statusBarEl) return;
    let html = '';
    Object.keys(players).forEach((pid, i) => {
      const p = players[pid];
      if (!p || !p.name) return; // name이 없는 플레이어(유령) 제외
      const status = p.status || 'offline';
      const location = p.location || 'lobby';

      let dotColor, statusIcon;
      if (status === 'online') { dotColor = '#2ecc71'; statusIcon = ''; }
      else if (status === 'away') { dotColor = '#f39c12'; statusIcon = ' 📱'; }
      else { dotColor = '#666'; statusIcon = ' 💤'; }

      let locationIcon = '';
      if (location === 'lobby') { locationIcon = ' 🏠'; }
      else if (location === 'gameEnd') { locationIcon = ' ✅'; }

      const isTurn = (pid === this.currentHolder);
      const borderStyle = isTurn ? 'border:2px solid #f1c40f;' : 'border:1px solid rgba(255,255,255,0.15);';

      html += `<div style="display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:15px;background:rgba(255,255,255,0.06);${borderStyle}font-size:0.8em;">`;
      html += `<span style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0;"></span>`;
      html += `<span>${p.name}${statusIcon}${locationIcon}</span>`;
      if (isTurn) html += `<span style="font-size:0.7em;">🎯</span>`;
      html += `</div>`;
    });
    this.statusBarEl.innerHTML = html;
  }
};
