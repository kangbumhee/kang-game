/**
 * party-utils.js
 * 모든 게임에서 공통으로 사용하는 유틸리티
 * - 2-Phase 카운트다운
 * - 이모지 리액션
 * - 누적 파티 스코어
 * - 자동 제출 타이머
 * - 모바일 진동
 * - Firebase 캐시
 */
const PartyUtils = {

  // ═══════════════════════════════════════
  // Firebase 캐시 (폴링 제거)
  // ═══════════════════════════════════════
  _cache: null,
  _cacheRef: null,
  _cacheCallback: null,

  startCache(gameRef, renderFn) {
    this._cacheRef = gameRef;
    gameRef.on('value', function(snap) {
      PartyUtils._cache = snap.val();
      if (renderFn) renderFn(PartyUtils._cache);
    });
  },

  getCached() {
    return this._cache;
  },

  stopCache() {
    if (this._cacheRef) {
      this._cacheRef.off();
      this._cacheRef = null;
    }
    this._cache = null;
  },

  // ═══════════════════════════════════════
  // 카운트다운 (_countdown 시그널, phase 사용 안 함)
  // ═══════════════════════════════════════
  _lastCountdownId: null,
  _countdownActive: false,

  showCountdownUI(subtitle, rules, cb) {
    this._countdownActive = true;
    var old = document.getElementById('cdOverlayNew');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.id = 'cdOverlayNew';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.88);z-index:999999;-webkit-transform:translateZ(0);transform:translateZ(0);pointer-events:all;';
    document.body.appendChild(overlay);

    if (rules) {
      overlay.innerHTML = '';
      var rulesDiv = document.createElement('div');
      rulesDiv.style.cssText = 'text-align:center;padding:20px;max-width:90vw;';
      var titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-size:min(6vw,36px);font-weight:900;color:#f1c40f;margin-bottom:15px;';
      titleEl.textContent = subtitle || '게임 시작!';
      rulesDiv.appendChild(titleEl);
      var rulesEl = document.createElement('div');
      rulesEl.style.cssText = 'font-size:min(3.5vw,18px);color:rgba(255,255,255,0.8);line-height:1.6;';
      rulesEl.innerHTML = rules;
      rulesDiv.appendChild(rulesEl);
      overlay.appendChild(rulesDiv);
      setTimeout(function() { doCountdown(); }, 2000);
    } else {
      doCountdown();
    }

    var self = this;
    function doCountdown() {
      var steps = ['3','2','1','GO!'], i = 0;
      function tick() {
        if (i >= steps.length) {
          setTimeout(function() {
            overlay.remove();
            self._countdownActive = false;
            if (cb) cb();
          }, 400);
          return;
        }
        var txt = steps[i];
        overlay.innerHTML = '';
        var el = document.createElement('div');
        el.textContent = txt;
        if (txt === 'GO!') {
          el.style.cssText = 'font-size:min(25vw,180px);font-weight:900;color:#2ecc71;text-shadow:0 0 30px rgba(46,204,113,0.6),0 0 60px rgba(46,204,113,0.3);animation:cdPop 0.5s ease-out;line-height:1;text-align:center;';
        } else {
          el.style.cssText = 'font-size:min(30vw,200px);font-weight:900;color:#f1c40f;text-shadow:0 0 30px rgba(241,196,15,0.6),0 0 60px rgba(241,196,15,0.3);animation:cdPop 0.5s ease-out;line-height:1;text-align:center;';
        }
        overlay.appendChild(el);
        if (typeof SoundEffects !== 'undefined' && typeof SoundEffects.play === 'function') {
          SoundEffects.play(txt === 'GO!' ? 'go' : 'countdown');
        }
        i++;
        setTimeout(tick, 800);
      }
      tick();
    }
  },

  triggerCountdown(gameRef, isHost, subtitle, rules, cb) {
    if (!isHost) return;
    var countdownId = 'cd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    gameRef.child('_countdown').set({
      id: countdownId,
      subtitle: subtitle || '게임 시작!',
      rules: rules || ''
    });
    this.showCountdownUI(subtitle, rules, cb);
  },

  listenCountdown(gameRef, isHost) {
    var self = this;
    gameRef.child('_countdown').on('value', function(snap) {
      var cd = snap.val();
      if (!cd || !cd.id) return;
      if (isHost) return;
      if (cd.id === self._lastCountdownId) return;
      self._lastCountdownId = cd.id;
      self.showCountdownUI(cd.subtitle || '게임 시작!', cd.rules || null, null);
    });
  },

  isCountdownActive() {
    return this._countdownActive;
  },

  // ═══════════════════════════════════════
  // 모바일 진동
  // ═══════════════════════════════════════
  vibrate(pattern) {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(pattern || 50);
      }
    } catch(e) {}
  },

  vibrateCorrect() { this.vibrate([50]); },
  vibrateWrong() { this.vibrate([100, 50, 100]); },
  vibrateExplode() { this.vibrate([200, 100, 200, 100, 300]); },

  // ═══════════════════════════════════════
  // 화면 피드백 (플래시)
  // ═══════════════════════════════════════
  flashScreen(color, duration) {
    var flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:' + (color || 'rgba(46,204,113,0.3)') + ';z-index:99998;pointer-events:none;transition:opacity ' + ((duration || 300) / 1000) + 's;';
    document.body.appendChild(flash);
    setTimeout(function() { flash.style.opacity = '0'; }, 50);
    setTimeout(function() { flash.remove(); }, (duration || 300) + 100);
  },

  flashCorrect() { this.flashScreen('rgba(46,204,113,0.25)', 300); },
  flashWrong() { this.flashScreen('rgba(231,76,60,0.25)', 300); },

  // ═══════════════════════════════════════
  // 자동 제출 타이머
  // ═══════════════════════════════════════
  _autoTimers: {},

  startAutoSubmitTimer(key, seconds, containerSelector, onTimeout) {
    this.clearAutoSubmitTimer(key);
    var startTime = Date.now();
    var total = seconds * 1000;

    var container = document.querySelector(containerSelector);
    if (!container) return;

    var timerDiv = document.createElement('div');
    timerDiv.id = 'autoTimer_' + key;
    timerDiv.style.cssText = 'text-align:center;margin:8px 0;';

    var barWrap = document.createElement('div');
    barWrap.style.cssText = 'width:100%;max-width:400px;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;margin:4px auto;';
    var barFill = document.createElement('div');
    barFill.id = 'autoTimerFill_' + key;
    barFill.style.cssText = 'height:100%;background:linear-gradient(90deg,#2ecc71,#f1c40f,#e74c3c);border-radius:3px;transition:width 0.5s linear;width:100%;';
    barWrap.appendChild(barFill);

    var textEl = document.createElement('div');
    textEl.id = 'autoTimerText_' + key;
    textEl.style.cssText = 'font-size:0.8em;color:rgba(255,255,255,0.5);';
    textEl.textContent = seconds + '초 남음';

    timerDiv.appendChild(barWrap);
    timerDiv.appendChild(textEl);
    container.appendChild(timerDiv);

    this._autoTimers[key] = setInterval(function() {
      var elapsed = Date.now() - startTime;
      var remain = Math.max(0, total - elapsed);
      var pct = (remain / total) * 100;

      var fill = document.getElementById('autoTimerFill_' + key);
      var text = document.getElementById('autoTimerText_' + key);
      if (fill) fill.style.width = pct + '%';
      if (text) {
        var sec = Math.ceil(remain / 1000);
        text.textContent = sec + '초 남음';
        if (sec <= 5) text.style.color = '#e74c3c';
        else if (sec <= 10) text.style.color = '#f39c12';
      }

      if (remain <= 0) {
        PartyUtils.clearAutoSubmitTimer(key);
        if (onTimeout) onTimeout();
      }
    }, 500);
  },

  clearAutoSubmitTimer(key) {
    if (this._autoTimers[key]) {
      clearInterval(this._autoTimers[key]);
      delete this._autoTimers[key];
    }
    var el = document.getElementById('autoTimer_' + key);
    if (el) el.remove();
  },

  clearAllAutoTimers() {
    var self = this;
    Object.keys(this._autoTimers).forEach(function(k) {
      self.clearAutoSubmitTimer(k);
    });
  },

  // ═══════════════════════════════════════
  // 이모지 리액션
  // ═══════════════════════════════════════
  _reactionListener: null,

  initReactions(roomCode, playerId) {
    var existing = document.getElementById('reactionBar');
    if (existing) existing.remove();

    var bar = document.createElement('div');
    bar.id = 'reactionBar';
    bar.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:90000;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:6px 12px;border-radius:25px;';

    var emojis = ['👏','😂','😱','🔥','❤️','💀'];
    emojis.forEach(function(emoji) {
      var btn = document.createElement('button');
      btn.textContent = emoji;
      btn.style.cssText = 'background:none;border:none;font-size:1.5em;cursor:pointer;padding:4px;transition:transform 0.15s;';
      btn.addEventListener('click', function() {
        btn.style.transform = 'scale(1.4)';
        setTimeout(function() { btn.style.transform = 'scale(1)'; }, 150);
        PartyUtils.sendReaction(roomCode, playerId, emoji);
      });
      bar.appendChild(btn);
    });
    document.body.appendChild(bar);

    var reactRef = db.ref('rooms/' + roomCode + '/reactions');
    this._reactionListener = reactRef;
    reactRef.on('child_added', function(snap) {
      var r = snap.val();
      if (!r) return;
      PartyUtils._showReactionBubble(r.emoji, r.name);
      setTimeout(function() { snap.ref.remove(); }, 3000);
    });
  },

  sendReaction(roomCode, playerId, emoji) {
    var playerName = Utils.getPlayerName();
    db.ref('rooms/' + roomCode + '/reactions').push({
      pid: playerId,
      name: playerName,
      emoji: emoji,
      time: Date.now()
    });
    PartyUtils.vibrate(30);
  },

  _showReactionBubble(emoji, name) {
    var bubble = document.createElement('div');
    bubble.style.cssText = 'position:fixed;bottom:120px;left:' + (20 + Math.random() * 60) + '%;z-index:99997;pointer-events:none;text-align:center;animation:reactionFloat 2s ease-out forwards;';
    bubble.innerHTML = '<div style="font-size:2.5em;">' + emoji + '</div><div style="font-size:0.7em;color:rgba(255,255,255,0.6);">' + (name || '') + '</div>';
    document.body.appendChild(bubble);
    setTimeout(function() { bubble.remove(); }, 2500);
  },

  destroyReactions() {
    if (this._reactionListener) {
      this._reactionListener.off();
      this._reactionListener = null;
    }
    var bar = document.getElementById('reactionBar');
    if (bar) bar.remove();
  },

  // ═══════════════════════════════════════
  // 누적 파티 스코어
  // ═══════════════════════════════════════
  async addPartyScore(roomCode, scoreMap) {
    var ref = db.ref('rooms/' + roomCode + '/partyScore');
    var snap = await ref.once('value');
    var current = snap.val() || {};
    Object.keys(scoreMap).forEach(function(pid) {
      current[pid] = (current[pid] || 0) + (scoreMap[pid] || 0);
    });
    await ref.set(current);
  },

  async getPartyScore(roomCode) {
    var snap = await db.ref('rooms/' + roomCode + '/partyScore').once('value');
    return snap.val() || {};
  },

  renderPartyScoreBoard(roomCode, currentPlayers) {
    var self = this;
    this.getPartyScore(roomCode).then(function(scores) {
      var existing = document.getElementById('partyScoreBoard');
      if (existing) existing.remove();

      if (!Object.keys(scores).length) return;

      var sorted = Object.keys(currentPlayers).map(function(pid) {
        return {
          name: (currentPlayers[pid] && currentPlayers[pid].name) || '익명',
          score: scores[pid] || 0
        };
      }).sort(function(a, b) { return b.score - a.score; });

      var div = document.createElement('div');
      div.id = 'partyScoreBoard';
      div.style.cssText = 'background:rgba(241,196,15,0.08);border:1px solid rgba(241,196,15,0.2);border-radius:12px;padding:12px;margin:10px auto;max-width:500px;text-align:center;';
      var html = '<div style="font-size:0.85em;color:#f1c40f;margin-bottom:6px;">🏆 파티 누적 점수</div>';
      sorted.forEach(function(p, i) {
        var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
        html += '<span style="display:inline-block;margin:2px 6px;font-size:0.85em;">' + medal + ' ' + p.name + ':' + p.score + '</span>';
      });
      div.innerHTML = html;

      var resultArea = document.getElementById('resultArea');
      if (resultArea && resultArea.parentNode) {
        resultArea.parentNode.insertBefore(div, resultArea.nextSibling);
      } else {
        document.body.appendChild(div);
      }
    });
  },

  // ═══════════════════════════════════════
  // 공통 End Buttons
  // ═══════════════════════════════════════
  renderEndButtons(container, isHost, callbacks) {
    var html = '<div class="end-buttons">';
    if (isHost) {
      html += '<button class="btn-retry" onclick="' + (callbacks.restart || 'restartGame()') + '">🔄 다시하기</button>';
      if (callbacks.modeSelect) {
        html += '<button class="btn-lobby2" onclick="' + callbacks.modeSelect + '">🎮 다른 모드 선택</button>';
      }
      html += '<button class="btn-lobby2" onclick="' + (callbacks.gameSelect || 'goToGameSelect()') + '">🏠 다른 게임 선택</button>';
    } else {
      html += '<p class="wait-msg">방장이 다음 게임을 준비하고 있습니다...</p>';
    }
    html += '<button class="btn-lobby2" onclick="' + (callbacks.lobby || 'backToLobby()') + '">🚪 로비로</button>';
    html += '</div>';
    container.innerHTML = html;
  },

  // ═══════════════════════════════════════
  // 공통 backToLobby / goToGameSelect
  // ═══════════════════════════════════════
  async goToGameSelect(roomCode, gameRef, extras) {
    if (typeof SoundEffects !== 'undefined' && typeof SoundEffects.stopBGM === 'function') SoundEffects.stopBGM();
    this.clearAllAutoTimers();
    this.destroyReactions();
    if (typeof Presence !== 'undefined') {
      Presence.setBackToLobby();
      Presence.destroy();
    }
    gameRef.off();

    if (extras && typeof extras === 'function') extras();

    await db.ref('rooms/' + roomCode + '/backToLobby').set(Date.now());
    await new Promise(function(r) { setTimeout(r, 300); });
    await db.ref('rooms/' + roomCode + '/currentGame').remove();
    await db.ref('rooms/' + roomCode + '/gameData').remove();
    sessionStorage.setItem('returnToLobby', 'true');
    window.location.href = '../index.html';
  },

  async backToLobby(roomCode, gameRef, extras) {
    if (typeof SoundEffects !== 'undefined' && typeof SoundEffects.stopBGM === 'function') SoundEffects.stopBGM();
    this.clearAllAutoTimers();
    this.destroyReactions();
    if (typeof Presence !== 'undefined') {
      Presence.setBackToLobby();
      Presence.destroy();
    }
    gameRef.off();

    if (extras && typeof extras === 'function') extras();

    if (roomCode) {
      await db.ref('rooms/' + roomCode + '/currentGame').remove();
      await db.ref('rooms/' + roomCode + '/gameData').remove();
    }
    sessionStorage.setItem('returnToLobby', 'true');
    window.location.href = '../index.html';
  },

  listenBackToLobby(roomCode, gameRef, cleanupFn) {
    db.ref('rooms/' + roomCode + '/backToLobby').on('value', function(snap) {
      if (!snap.val()) return;
      if (typeof SoundEffects !== 'undefined' && typeof SoundEffects.stopBGM === 'function') SoundEffects.stopBGM();
      if (typeof Presence !== 'undefined' && typeof Presence.setBackToLobby === 'function') Presence.setBackToLobby();
      PartyUtils.clearAllAutoTimers();
      PartyUtils.destroyReactions();
      if (typeof Presence !== 'undefined') Presence.destroy();
      gameRef.off();
      if (cleanupFn) cleanupFn();
      sessionStorage.setItem('returnToLobby', 'true');
      window.location.href = '../index.html';
    });

    db.ref('rooms/' + roomCode + '/disbanded').on('value', function(snap) {
      if (!snap.val()) return;
      if (typeof SoundEffects !== 'undefined' && typeof SoundEffects.stopBGM === 'function') SoundEffects.stopBGM();
      PartyUtils.clearAllAutoTimers();
      PartyUtils.destroyReactions();
      if (typeof Presence !== 'undefined') Presence.destroy();
      gameRef.off();
      if (cleanupFn) cleanupFn();
      sessionStorage.removeItem('roomCode');
      sessionStorage.removeItem('returnToLobby');
      alert('방장이 방을 나갔습니다.');
      window.location.href = '../index.html';
    });
  }
};

// 연결 상태 배너 (자동)
(function() {
  if (typeof db === 'undefined') return;
  function initBanner() {
    if (!document.body) return;
    var banner = document.createElement('div');
    banner.className = 'connection-banner';
    banner.id = 'connBanner';
    banner.textContent = '⚠️ 인터넷 연결이 끊겼습니다. 재연결 시도 중...';
    document.body.appendChild(banner);
    db.ref('.info/connected').on('value', function(snap) {
      if (snap.val() === true) banner.classList.remove('show');
      else banner.classList.add('show');
    });
  }
  if (document.body) initBanner();
  else document.addEventListener('DOMContentLoaded', initBanner);
})();
