const Lobby = {
  roomCode: null,
  playerId: null,
  playerName: null,
  selectedGame: null,
  isHost: false,
  listeners: [],
  staleCheckTimer: null,

  init() {
    this.playerId = Utils.getPlayerId();
    const saved = Utils.getRoomCode();
    const name = Utils.getPlayerName();

    if (sessionStorage.getItem('returnToLobby') === 'true') {
      sessionStorage.removeItem('returnToLobby');
      if (saved) {
        db.ref(`rooms/${saved}/currentGame`).remove();
        db.ref(`rooms/${saved}/gameData`).remove();
        db.ref(`rooms/${saved}/backToLobby`).remove();
        db.ref(`rooms/${saved}/countdown`).remove();
        db.ref(`rooms/${saved}/players/${this.playerId}`).update({
          location: 'lobby',
          status: 'online',
          lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
      }
    }

    if (saved && name) {
      this.roomCode = saved;
      this.playerName = name;
      this.enterWaitingRoom();
    }

    // ── 브라우저/탭 종료 시 offline 처리 ──
    window.addEventListener('beforeunload', () => {
      if (this.roomCode && this.playerId) {
        // sendBeacon으로 확실히 전송
        const url = `${db.ref().toString()}/rooms/${this.roomCode}/players/${this.playerId}.json`;
        const data = JSON.stringify({ status: 'offline', lastSeen: { '.sv': 'timestamp' } });
        navigator.sendBeacon(url + '?x-http-method-override=PATCH', data);
      }
    });

    window.addEventListener('pagehide', () => {
      if (this.roomCode && this.playerId) {
        db.ref(`rooms/${this.roomCode}/players/${this.playerId}`).update({
          status: 'offline'
        }).catch(() => {});
      }
    });
  },

  async createRoom() {
    const name = (document.getElementById('playerName').value || '').trim();
    if (!name) { alert('이름을 입력하세요!'); return; }

    this.playerName = name;
    Utils.setPlayerName(name);
    this.playerId = Utils.getPlayerId();
    this.roomCode = Utils.generateRoomCode();
    Utils.setRoomCode(this.roomCode);
    this.isHost = true;

    const playerRef = db.ref(`rooms/${this.roomCode}/players/${this.playerId}`);
    await playerRef.set({
      name: this.playerName, online: true, isHost: true,
      joinedAt: Utils.serverTimestamp(),
      lastSeen: Utils.serverTimestamp(),
      status: 'online',
      location: 'lobby'
    });

    // ── Firebase onDisconnect: 오프라인 시 status를 offline으로 ──
    playerRef.child('status').onDisconnect().set('offline');
    playerRef.child('lastSeen').onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);

    await db.ref(`rooms/${this.roomCode}/host`).set(this.playerId);
    this.enterWaitingRoom();
  },

  async joinRoom() {
    const name = (document.getElementById('playerName').value || '').trim();
    const code = (document.getElementById('roomCodeInput').value || '').trim();
    if (!name) { alert('이름을 입력하세요!'); return; }
    if (!code) { alert('방 번호를 입력하세요!'); return; }

    const snap = await db.ref(`rooms/${code}`).once('value');
    if (!snap.exists()) { alert('존재하지 않는 방입니다!'); return; }

    this.playerName = name;
    Utils.setPlayerName(name);
    this.playerId = Utils.getPlayerId();
    this.roomCode = code;
    Utils.setRoomCode(code);

    const playerRef = db.ref(`rooms/${this.roomCode}/players/${this.playerId}`);
    await playerRef.set({
      name: this.playerName, online: true, isHost: false,
      joinedAt: Utils.serverTimestamp(),
      lastSeen: Utils.serverTimestamp(),
      status: 'online',
      location: 'lobby'
    });

    // ── Firebase onDisconnect ──
    playerRef.child('status').onDisconnect().set('offline');
    playerRef.child('lastSeen').onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);

    this.enterWaitingRoom();
  },

  enterWaitingRoom() {
    document.getElementById('landing').style.display = 'none';
    document.getElementById('waiting').style.display = '';
    document.getElementById('roomCodeDisplay').textContent = this.roomCode;
    document.getElementById('volCtrl').style.display = 'flex';

    if (this.roomCode && this.playerId) {
      const playerRef = db.ref(`rooms/${this.roomCode}/players/${this.playerId}`);
      playerRef.update({
        location: 'lobby',
        status: 'online',
        lastSeen: firebase.database.ServerValue.TIMESTAMP
      });
      // onDisconnect 재설정 (로비 복귀 시)
      playerRef.child('status').onDisconnect().set('offline');
      playerRef.child('lastSeen').onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
    }

    db.ref(`rooms/${this.roomCode}/host`).once('value').then(snap => {
      this.isHost = (snap.val() === this.playerId);
      document.getElementById('hostControls').style.display = this.isHost ? '' : 'none';
      document.getElementById('guestMsg').style.display = this.isHost ? 'none' : '';
    });

    // ── 플레이어 목록 렌더링 (강퇴 기능 포함) ──
    const plRef = db.ref(`rooms/${this.roomCode}/players`);
    plRef.on('value', snap => {
      const players = snap.val() || {};
      const list = document.getElementById('playerList');
      list.innerHTML = '';

      // 내가 강퇴당했는지 확인
      if (this.playerId && !players[this.playerId]) {
        // 내가 목록에 없음 = 강퇴당함
        this._handleKicked();
        return;
      }

      Object.keys(players).forEach((pid, idx) => {
        const p = players[pid];
        if (!p) return;

        const div = document.createElement('div');
        div.className = 'player-chip';

        const status = p.status || 'offline';
        const location = p.location || 'lobby';

        let bgColor = Utils.getColor(idx);
        let locationIcon = '';
        let statusStyle = '';

        if (location === 'game') {
          locationIcon = ' 🎮';
          statusStyle = 'opacity:0.7;';
        } else if (location === 'gameEnd') {
          locationIcon = ' ✅';
          statusStyle = 'opacity:0.85;';
        }

        if (status === 'away') {
          locationIcon += ' 📱';
          statusStyle = 'opacity:0.6;';
        } else if (status === 'offline') {
          locationIcon += ' 💤';
          statusStyle = 'opacity:0.4;';
        }

        div.style.cssText = `background:${bgColor};${statusStyle}position:relative;cursor:${this.isHost && pid !== this.playerId ? 'pointer' : 'default'};`;
        div.textContent = (p.name || '익명') + (p.isHost ? ' 👑' : '') + locationIcon;

        const locationText = location === 'game' ? '게임 중' : location === 'gameEnd' ? '게임 종료 화면' : '대기실';
        const statusText = status === 'online' ? '접속 중' : status === 'away' ? '자리비움' : '오프라인';
        div.title = `${statusText} | ${locationText}`;

        // ── 방장 클릭 시 강퇴 ──
        if (this.isHost && pid !== this.playerId) {
          div.addEventListener('click', () => {
            this.kickPlayer(pid, p.name || '익명');
          });
        }

        list.appendChild(div);
      });
    });
    this.listeners.push(plRef);

    const cgRef = db.ref(`rooms/${this.roomCode}/currentGame`);
    cgRef.on('value', snap => {
      const game = snap.val();
      if (game && game.started && game.gameId) {
        this.loadGame(game.gameId);
      }
    });
    this.listeners.push(cgRef);

    // ── 방 해산 감지 ──
    const disbandRef = db.ref(`rooms/${this.roomCode}/disbanded`);
    disbandRef.on('value', snap => {
      if (!snap.val()) return;
      if (this.isHost) return;
      this.listeners.forEach(ref => ref.off());
      this.listeners = [];
      this._stopStaleCheck();
      sessionStorage.removeItem('roomCode');
      sessionStorage.removeItem('returnToLobby');
      this.roomCode = null;
      this.selectedGame = null;
      this.isHost = false;
      document.getElementById('waiting').style.display = 'none';
      document.getElementById('landing').style.display = '';
      document.getElementById('volCtrl').style.display = 'none';
      alert('방장이 방을 나갔습니다.');
    });
    this.listeners.push(disbandRef);

    // ── 파티 누적 스코어 표시 ──
    const partyScoreRef = db.ref(`rooms/${this.roomCode}/partyScore`);
    partyScoreRef.on('value', (snap) => {
      const scores = snap.val() || {};
      let scoreDiv = document.getElementById('partyScoreLobby');
      if (!scoreDiv) {
        scoreDiv = document.createElement('div');
        scoreDiv.id = 'partyScoreLobby';
        scoreDiv.style.cssText = 'background:rgba(241,196,15,0.08);border:1px solid rgba(241,196,15,0.2);border-radius:12px;padding:12px;margin:10px auto;max-width:500px;text-align:center;';
        const hostCtrl = document.getElementById('hostControls');
        if (hostCtrl) hostCtrl.parentNode.insertBefore(scoreDiv, hostCtrl);
      }
      if (!Object.keys(scores).length) {
        scoreDiv.style.display = 'none';
        return;
      }
      scoreDiv.style.display = '';
      db.ref(`rooms/${this.roomCode}/players`).once('value').then((pSnap) => {
        const players = pSnap.val() || {};
        const sorted = Object.keys(players).map((pid) => ({
          name: (players[pid] && players[pid].name) || '익명',
          score: scores[pid] || 0
        })).sort((a, b) => b.score - a.score);
        let html = '<div style="font-size:0.9em;color:#f1c40f;margin-bottom:6px;">🏆 파티 누적 점수</div>';
        sorted.forEach((p, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
          html += '<div style="font-size:0.9em;margin:2px 0;">' + medal + ' ' + p.name + ': ' + p.score + '점</div>';
        });
        scoreDiv.innerHTML = html;
      });
    });
    this.listeners.push(partyScoreRef);

    // ── 오프라인 플레이어 자동 제거 (방장만, 30초 이상 오프라인) ──
    this._startStaleCheck();
  },

  // ═══ 강퇴 기능 ═══
  async kickPlayer(pid, name) {
    if (!this.isHost) return;
    const ok = confirm(`"${name}" 님을 강퇴하시겠습니까?`);
    if (!ok) return;

    // 강퇴 대상에게 알림 전송
    await db.ref(`rooms/${this.roomCode}/kicked/${pid}`).set({
      name: name,
      kickedAt: Utils.serverTimestamp()
    });

    // 플레이어 목록에서 제거
    await db.ref(`rooms/${this.roomCode}/players/${pid}`).remove();
  },

  // ═══ 강퇴당했을 때 처리 ═══
  _handleKicked() {
    this.listeners.forEach(ref => ref.off());
    this.listeners = [];
    this._stopStaleCheck();

    sessionStorage.removeItem('roomCode');
    sessionStorage.removeItem('returnToLobby');

    this.roomCode = null;
    this.selectedGame = null;
    this.isHost = false;

    document.getElementById('waiting').style.display = 'none';
    document.getElementById('landing').style.display = '';
    document.getElementById('volCtrl').style.display = 'none';

    alert('방장에 의해 강퇴되었습니다.');
  },

  // ═══ 오프라인 플레이어 자동 제거 (방장만) ═══
  _startStaleCheck() {
    this._stopStaleCheck();
    if (!this.isHost) return;

    this.staleCheckTimer = setInterval(async () => {
      if (!this.roomCode || !this.isHost) return;

      const snap = await db.ref(`rooms/${this.roomCode}/players`).once('value');
      const players = snap.val() || {};
      const now = Date.now();

      Object.keys(players).forEach(async (pid) => {
        if (pid === this.playerId) return; // 자기 자신은 스킵
        const p = players[pid];
        if (!p) return;

        const lastSeen = p.lastSeen || 0;
        const status = p.status || 'offline';
        const elapsed = now - lastSeen;

        // 60초 이상 오프라인이면 자동 제거
        if (status === 'offline' && elapsed > 60000) {
          console.log(`[Lobby] Auto-removing stale player: ${p.name} (offline ${Math.round(elapsed/1000)}s)`);
          await db.ref(`rooms/${this.roomCode}/players/${pid}`).remove();
        }
      });
    }, 15000); // 15초마다 체크
  },

  _stopStaleCheck() {
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }
  },

  selectGame(gameId) {
    this.selectedGame = gameId;
    if (typeof SoundEffects !== 'undefined') SoundEffects.play('select');
    document.querySelectorAll('.game-card').forEach(c => c.classList.remove('selected'));
    const el = document.querySelector(`[data-game="${gameId}"]`);
    if (el) el.classList.add('selected');
  },

  async startGame() {
    if (!this.isHost || !this.selectedGame) { alert('게임을 선택하세요!'); return; }
    await db.ref(`rooms/${this.roomCode}/gameData`).remove();
    await db.ref(`rooms/${this.roomCode}/backToLobby`).remove();
    await db.ref(`rooms/${this.roomCode}/kicked`).remove();
    await db.ref(`rooms/${this.roomCode}/currentGame`).remove();
    await new Promise(r => setTimeout(r, 500));
    await db.ref(`rooms/${this.roomCode}/currentGame`).set({
      gameId: this.selectedGame, started: true, startedAt: Utils.serverTimestamp()
    });
  },

  loadGame(gameId) {
    this.listeners.forEach(ref => ref.off());
    this.listeners = [];
    this._stopStaleCheck();

    if (this.roomCode && this.playerId) {
      db.ref(`rooms/${this.roomCode}/players/${this.playerId}`).update({
        location: 'game'
      });
    }

    const gameMap = {
      'majority': 'games/majority.html',
      'nunchi': 'games/nunchi.html',
      'chosung': 'games/chosung.html',
      'telepathy': 'games/telepathy.html',
      'spectrum': 'games/spectrum.html',
      'horserace': 'games/horserace.html',
      'hotpotato': 'games/hotpotato.html',
      'spaceteam': 'games/spaceteam.html'
    };
    if (gameMap[gameId]) window.location.href = gameMap[gameId];
  },

  async leaveRoom() {
    this.listeners.forEach(ref => ref.off());
    this.listeners = [];
    this._stopStaleCheck();

    if (this.roomCode && this.playerId) {
      if (this.isHost) {
        await db.ref(`rooms/${this.roomCode}/disbanded`).set(Date.now());
        await new Promise(r => setTimeout(r, 500));
        await db.ref(`rooms/${this.roomCode}`).remove();
      } else {
        await db.ref(`rooms/${this.roomCode}/players/${this.playerId}`).remove();
      }
    }

    sessionStorage.removeItem('roomCode');
    sessionStorage.removeItem('playerName');
    sessionStorage.removeItem('playerId');
    sessionStorage.removeItem('returnToLobby');

    this.roomCode = null;
    this.playerName = null;
    this.selectedGame = null;
    this.isHost = false;

    document.getElementById('waiting').style.display = 'none';
    document.getElementById('landing').style.display = '';
    document.getElementById('volCtrl').style.display = 'none';
    document.getElementById('playerName').value = '';
    document.getElementById('roomCodeInput').value = '';
  }
};

document.addEventListener('DOMContentLoaded', () => { Lobby.init(); });
