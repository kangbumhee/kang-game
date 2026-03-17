const Lobby = {
  roomCode: null,
  playerId: null,
  playerName: null,
  selectedGame: null,
  isHost: false,
  listeners: [],

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
        db.ref(`rooms/${saved}/players/${this.playerId}`).update({
          location: 'lobby',
          status: 'online'
        });
      }
    }

    if (saved && name) {
      this.roomCode = saved;
      this.playerName = name;
      this.enterWaitingRoom();
    }
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

    await db.ref(`rooms/${this.roomCode}/players/${this.playerId}`).set({
      name: this.playerName, online: true, isHost: true,
      joinedAt: Utils.serverTimestamp(),
      status: 'online',
      location: 'lobby'
    });
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

    await db.ref(`rooms/${this.roomCode}/players/${this.playerId}`).set({
      name: this.playerName, online: true, isHost: false,
      joinedAt: Utils.serverTimestamp(),
      status: 'online',
      location: 'lobby'
    });
    this.enterWaitingRoom();
  },

  enterWaitingRoom() {
    document.getElementById('landing').style.display = 'none';
    document.getElementById('waiting').style.display = '';
    document.getElementById('roomCodeDisplay').textContent = this.roomCode;
    document.getElementById('volCtrl').style.display = 'flex';

    if (this.roomCode && this.playerId) {
      db.ref(`rooms/${this.roomCode}/players/${this.playerId}`).update({
        location: 'lobby',
        status: 'online'
      });
    }

    db.ref(`rooms/${this.roomCode}/host`).once('value').then(snap => {
      this.isHost = (snap.val() === this.playerId);
      document.getElementById('hostControls').style.display = this.isHost ? '' : 'none';
      document.getElementById('guestMsg').style.display = this.isHost ? 'none' : '';
    });

    const plRef = db.ref(`rooms/${this.roomCode}/players`);
    plRef.on('value', snap => {
      const players = snap.val() || {};
      const list = document.getElementById('playerList');
      list.innerHTML = '';
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

        div.style.cssText = `background:${bgColor};${statusStyle}position:relative;`;
        div.textContent = (p.name || '익명') + (p.isHost ? ' 👑' : '') + locationIcon;

        const locationText = location === 'game' ? '게임 중' : location === 'gameEnd' ? '게임 종료 화면' : '대기실';
        const statusText = status === 'online' ? '접속 중' : status === 'away' ? '자리비움' : '오프라인';
        div.title = `${statusText} | ${locationText}`;

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
    await db.ref(`rooms/${this.roomCode}/currentGame`).set({
      gameId: this.selectedGame, started: true, startedAt: Utils.serverTimestamp()
    });
  },

  loadGame(gameId) {
    this.listeners.forEach(ref => ref.off());
    this.listeners = [];

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

    if (this.roomCode && this.playerId) {
      await db.ref(`rooms/${this.roomCode}/players/${this.playerId}`).remove();

      if (this.isHost) {
        await db.ref(`rooms/${this.roomCode}`).remove();
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
