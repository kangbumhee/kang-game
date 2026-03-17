const SoundEffects = {
  ctx: null,
  bgmNode: null,
  bgmGain: null,
  bgmPlaying: false,
  masterVolume: 0.5,
  sfxVolume: 0.7,
  bgmVolume: 0.25,

  getCtx() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  play(type) {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = this.sfxVolume * this.masterVolume;

    try {
      switch(type) {

        case 'click': {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.setValueAtTime(1200, now);
          o.frequency.exponentialRampToValueAtTime(800, now + 0.06);
          g.gain.setValueAtTime(vol * 0.4, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          o.start(now); o.stop(now + 0.08);
          break;
        }

        case 'correct': {
          [523, 784].forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'sine';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0, now + i * 0.12);
            g.gain.linearRampToValueAtTime(vol * 0.35, now + i * 0.12 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);
            o.start(now + i * 0.12); o.stop(now + i * 0.12 + 0.25);
          });
          break;
        }

        case 'wrong': {
          const o = ctx.createOscillator();
          const o2 = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); o2.connect(g); g.connect(ctx.destination);
          o.type = 'sawtooth'; o.frequency.setValueAtTime(300, now);
          o.frequency.exponentialRampToValueAtTime(150, now + 0.3);
          o2.type = 'square'; o2.frequency.setValueAtTime(303, now);
          o2.frequency.exponentialRampToValueAtTime(148, now + 0.3);
          g.gain.setValueAtTime(vol * 0.2, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          o.start(now); o.stop(now + 0.35);
          o2.start(now); o2.stop(now + 0.35);
          break;
        }

        case 'tick': {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = 1800;
          g.gain.setValueAtTime(vol * 0.15, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
          o.start(now); o.stop(now + 0.03);
          break;
        }

        case 'countdown': {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'square'; o.frequency.value = 880;
          g.gain.setValueAtTime(vol * 0.25, now);
          g.gain.setValueAtTime(0, now + 0.1);
          g.gain.setValueAtTime(vol * 0.25, now + 0.2);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          o.start(now); o.stop(now + 0.35);
          break;
        }

        case 'go': {
          [523, 659, 784, 1047].forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'triangle';
            o.frequency.value = freq;
            const t = now + i * 0.06;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(vol * 0.3, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            o.start(t); o.stop(t + 0.3);
          });
          break;
        }

        case 'fanfare': {
          const notes = [523, 659, 784, 1047, 784, 1047, 1319];
          notes.forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'triangle';
            o.frequency.value = freq;
            const t = now + i * 0.12;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(vol * 0.3, t + 0.03);
            g.gain.setValueAtTime(vol * 0.3, t + 0.08);
            g.gain.exponentialRampToValueAtTime(0.001, t + (i === notes.length - 1 ? 0.6 : 0.12));
            o.start(t); o.stop(t + 0.7);
          });
          break;
        }

        case 'explode': {
          const bufferSize = ctx.sampleRate * 0.5;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const ng = ctx.createGain();
          noise.connect(ng); ng.connect(ctx.destination);
          ng.gain.setValueAtTime(vol * 0.5, now);
          ng.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          noise.start(now); noise.stop(now + 0.5);
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.setValueAtTime(80, now);
          o.frequency.exponentialRampToValueAtTime(20, now + 0.6);
          g.gain.setValueAtTime(vol * 0.6, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          o.start(now); o.stop(now + 0.6);
          break;
        }

        case 'alarm': {
          for (let i = 0; i < 3; i++) {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'square';
            o.frequency.value = 800;
            const t = now + i * 0.15;
            g.gain.setValueAtTime(vol * 0.2, t);
            g.gain.setValueAtTime(0, t + 0.08);
            o.start(t); o.stop(t + 0.1);
          }
          break;
        }

        case 'select': {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(600, now);
          o.frequency.exponentialRampToValueAtTime(900, now + 0.08);
          g.gain.setValueAtTime(vol * 0.3, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          o.start(now); o.stop(now + 0.12);
          break;
        }

        case 'eliminate': {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(400, now);
          o.frequency.exponentialRampToValueAtTime(60, now + 0.5);
          g.gain.setValueAtTime(vol * 0.3, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          o.start(now); o.stop(now + 0.5);
          const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
          const n = ctx.createBufferSource(); n.buffer = buf;
          const ng = ctx.createGain();
          n.connect(ng); ng.connect(ctx.destination);
          ng.gain.setValueAtTime(vol * 0.15, now);
          ng.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          n.start(now); n.stop(now + 0.3);
          break;
        }

        case 'notify': {
          [660, 880].forEach((f, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'sine'; o.frequency.value = f;
            const t = now + i * 0.15;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(vol * 0.25, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            o.start(t); o.stop(t + 0.2);
          });
          break;
        }

        case 'gallop': {
          for (let i = 0; i < 2; i++) {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'triangle';
            o.frequency.value = 200 + Math.random() * 100;
            const t = now + i * 0.1;
            g.gain.setValueAtTime(vol * 0.2, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
            o.start(t); o.stop(t + 0.06);
          }
          break;
        }

        case 'bombTick': {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = 600;
          g.gain.setValueAtTime(vol * 0.2, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          o.start(now); o.stop(now + 0.05);
          const o2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.type = 'sine'; o2.frequency.value = 400;
          g2.gain.setValueAtTime(vol * 0.15, now + 0.06);
          g2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          o2.start(now + 0.06); o2.stop(now + 0.1);
          break;
        }

        case 'slide': {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(300, now);
          o.frequency.linearRampToValueAtTime(800, now + 0.15);
          g.gain.setValueAtTime(vol * 0.15, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          o.start(now); o.stop(now + 0.2);
          break;
        }

        case 'pass': {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(500, now);
          o.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
          o.frequency.exponentialRampToValueAtTime(800, now + 0.15);
          g.gain.setValueAtTime(vol * 0.25, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          o.start(now); o.stop(now + 0.2);
          break;
        }

        default: {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = 440;
          g.gain.setValueAtTime(vol * 0.2, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          o.start(now); o.stop(now + 0.1);
        }
      }
    } catch(e) { console.log('SFX error:', e); }
  },

  startBGM(style) {
    const ctx = this.getCtx();
    if (!ctx || this.bgmPlaying) return;
    this.bgmPlaying = true;

    const masterGain = ctx.createGain();
    masterGain.gain.value = this.bgmVolume * this.masterVolume;
    masterGain.connect(ctx.destination);
    this.bgmGain = masterGain;

    const styles = {
      lobby: { bpm: 110, chords: [[261,329,392],[293,349,440],[329,415,494],[261,329,392]], wave: 'triangle' },
      tense: { bpm: 130, chords: [[220,277,330],[233,293,349],[246,311,370],[220,277,330]], wave: 'sawtooth' },
      fun:   { bpm: 120, chords: [[330,415,494],[349,440,523],[392,494,587],[330,415,494]], wave: 'triangle' },
      race:  { bpm: 150, chords: [[261,329,392],[293,370,440],[329,415,494],[349,440,523]], wave: 'square' },
      chill: { bpm: 90,  chords: [[261,329,392],[220,277,330],[246,311,370],[261,329,392]], wave: 'sine' }
    };

    const s = styles[style] || styles.lobby;
    const beatLen = 60 / s.bpm;
    const barLen = beatLen * 4;
    const loopLen = barLen * s.chords.length;

    const scheduleLoop = (startTime) => {
      s.chords.forEach((chord, barIdx) => {
        chord.forEach(freq => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          const f = ctx.createBiquadFilter();
          o.connect(f); f.connect(g); g.connect(masterGain);
          o.type = s.wave;
          o.frequency.value = freq;
          f.type = 'lowpass'; f.frequency.value = 800; f.Q.value = 1;
          const barStart = startTime + barIdx * barLen;
          g.gain.setValueAtTime(0, barStart);
          g.gain.linearRampToValueAtTime(0.08, barStart + 0.1);
          g.gain.setValueAtTime(0.08, barStart + barLen - 0.1);
          g.gain.linearRampToValueAtTime(0, barStart + barLen);
          o.start(barStart); o.stop(barStart + barLen + 0.01);
        });

        const bass = ctx.createOscillator();
        const bg = ctx.createGain();
        bass.connect(bg); bg.connect(masterGain);
        bass.type = 'sine';
        bass.frequency.value = chord[0] / 2;
        const barStart = startTime + barIdx * barLen;
        bg.gain.setValueAtTime(0.12, barStart);
        bg.gain.setValueAtTime(0, barStart + barLen);
        bass.start(barStart); bass.stop(barStart + barLen + 0.01);

        for (let beat = 0; beat < 4; beat++) {
          const kickTime = startTime + barIdx * barLen + beat * beatLen;
          const kick = ctx.createOscillator();
          const kg = ctx.createGain();
          kick.connect(kg); kg.connect(masterGain);
          kick.type = 'sine';
          kick.frequency.setValueAtTime(150, kickTime);
          kick.frequency.exponentialRampToValueAtTime(40, kickTime + 0.1);
          kg.gain.setValueAtTime(beat === 0 ? 0.15 : 0.08, kickTime);
          kg.gain.exponentialRampToValueAtTime(0.001, kickTime + 0.12);
          kick.start(kickTime); kick.stop(kickTime + 0.12);

          if (beat % 2 === 0 || s.bpm > 120) {
            const hh = ctx.createBufferSource();
            const hhBuf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
            const hhData = hhBuf.getChannelData(0);
            for (let i = 0; i < hhData.length; i++) hhData[i] = (Math.random() * 2 - 1) * (1 - i / hhData.length);
            hh.buffer = hhBuf;
            const hg = ctx.createGain();
            const hf = ctx.createBiquadFilter();
            hh.connect(hf); hf.connect(hg); hg.connect(masterGain);
            hf.type = 'highpass'; hf.frequency.value = 8000;
            hg.gain.value = 0.06;
            hh.start(kickTime); hh.stop(kickTime + 0.03);
          }
        }
      });
    };

    let nextStart = ctx.currentTime + 0.1;
    scheduleLoop(nextStart);

    this._bgmInterval = setInterval(() => {
      if (!this.bgmPlaying) return;
      const ct = ctx.currentTime;
      if (ct >= nextStart + loopLen - 1) {
        nextStart += loopLen;
        try { scheduleLoop(nextStart); } catch(e) {}
      }
    }, 500);
  },

  stopBGM() {
    this.bgmPlaying = false;
    if (this._bgmInterval) { clearInterval(this._bgmInterval); this._bgmInterval = null; }
    if (this.bgmGain) {
      try {
        this.bgmGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
      } catch(e) {}
    }
  },

  setBGMVolume(v) {
    this.bgmVolume = v;
    if (this.bgmGain) this.bgmGain.gain.value = v * this.masterVolume;
  },

  setSFXVolume(v) {
    this.sfxVolume = v;
  },

  setMasterVolume(v) {
    this.masterVolume = v;
    if (this.bgmGain) this.bgmGain.gain.value = this.bgmVolume * v;
  }
};
