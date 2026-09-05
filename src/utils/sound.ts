// Web Audio API Sound Generator - pure client-side, zero external assets required

class SoundManager {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private isBgmPlaying: boolean = false;
  private bgmInterval: number | null = null;
  private bgmStep: number = 0;
  private bgmVolume: number = 0.25;
  private sfxVolume: number = 0.6;
  public isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play pleasant click
  public playClick() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(this.sfxVolume * 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // Audio context restricted or unavailable
    }
  }

  // Play correct sound: cheerful bright chime ("ting-ding!")
  public playCorrect() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      
      // Chime notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);
        
        gain.gain.setValueAtTime(0, now + i * 0.09);
        gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.4, now + i * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.4);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.45);
      });
    } catch {
      // Audio fallback
    }
  }

  // Play wrong sound: soft gentle low notes (not harsh)
  public playWrong() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      
      // Gentle downward notes: F4 (349.23) -> D4 (293.66)
      const notes = [349.23, 293.66];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.16);
        osc.frequency.linearRampToValueAtTime(freq - 20, now + i * 0.16 + 0.22);
        
        gain.gain.setValueAtTime(0, now + i * 0.16);
        gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.3, now + i * 0.16 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.16 + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + i * 0.16);
        osc.stop(now + i * 0.16 + 0.32);
      });
    } catch {
      // Audio fallback
    }
  }

  // Play victory fanfare
  public playVictoryFanfare() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      // C, E, G, C, then high flourish
      const fanfare = [
        { f: 523.25, t: 0, d: 0.15 },
        { f: 523.25, t: 0.15, d: 0.15 },
        { f: 523.25, t: 0.3, d: 0.15 },
        { f: 659.25, t: 0.5, d: 0.3 },
        { f: 783.99, t: 0.85, d: 0.3 },
        { f: 1046.50, t: 1.2, d: 0.8 },
      ];

      fanfare.forEach(item => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(item.f, now + item.t);
        
        gain.gain.setValueAtTime(0, now + item.t);
        gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.5, now + item.t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + item.t + item.d);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + item.t);
        osc.stop(now + item.t + item.d + 0.05);
      });
    } catch {
      // Audio fallback
    }
  }

  // Toggle Background Music
  public toggleBgm(): boolean {
    if (this.isBgmPlaying) {
      this.stopBgm();
      return false;
    } else {
      this.startBgm();
      return true;
    }
  }

  public getIsBgmPlaying(): boolean {
    return this.isBgmPlaying;
  }

  public startBgm() {
    if (this.isBgmPlaying) return;
    try {
      const ctx = this.initCtx();
      this.isBgmPlaying = true;
      this.bgmStep = 0;

      // Master BGM gain
      this.bgmGain = ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.isMuted ? 0 : this.bgmVolume, ctx.currentTime);
      this.bgmGain.connect(ctx.destination);

      // Playful friendly chord progression: C - G - Am - F
      const melodyNotes = [
        523.25, 659.25, 783.99, 659.25, // C
        392.00, 493.88, 587.33, 493.88, // G
        440.00, 523.25, 659.25, 523.25, // Am
        349.23, 440.00, 523.25, 440.00  // F
      ];
      const bassNotes = [130.81, 98.00, 110.00, 87.31];

      const stepDuration = 240; // ms per 16th note

      this.bgmInterval = window.setInterval(() => {
        if (!this.isBgmPlaying || !this.ctx || !this.bgmGain) return;
        
        const now = this.ctx.currentTime;
        const currentNoteIndex = this.bgmStep % melodyNotes.length;
        const freq = melodyNotes[currentNoteIndex];

        // Soft synth bell
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        noteGain.gain.setValueAtTime(0.07, now);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(noteGain);
        noteGain.connect(this.bgmGain);

        osc.start(now);
        osc.stop(now + 0.23);

        // Bass beat on every 4 steps
        if (this.bgmStep % 4 === 0) {
          const chordIndex = Math.floor((this.bgmStep % 16) / 4);
          const bassFreq = bassNotes[chordIndex];
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();

          bassOsc.type = 'triangle';
          bassOsc.frequency.setValueAtTime(bassFreq, now);

          bassGain.gain.setValueAtTime(0.09, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

          bassOsc.connect(bassGain);
          bassGain.connect(this.bgmGain);

          bassOsc.start(now);
          bassOsc.stop(now + 0.52);
        }

        this.bgmStep++;
      }, stepDuration);

    } catch {
      this.isBgmPlaying = false;
    }
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  public setVolume(val: number) {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    if (this.bgmGain && this.ctx && !this.isMuted) {
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.isMuted ? 0 : this.bgmVolume, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
