// Web Speech API Vietnamese Text-to-Speech Manager for AZero
// Supports Preset "Giọng Adam" (Trầm ấm, nam tính, tự nhiên), "Chuẩn MC", "Nữ truyền cảm"
// and continuous reading ("đọc 1 lèo") without stuttering.

export type SpeechStatus = 'idle' | 'speaking' | 'paused';
export type VoicePreset = 'adam' | 'natural' | 'female';

class SpeechManager {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isMuted: boolean = false;
  private status: SpeechStatus = 'idle';
  private listeners: Set<(status: SpeechStatus, currentText?: string) => void> = new Set();
  private lastSpokenText: string = '';
  private isSequenceCancelled: boolean = false;
  private currentPreset: VoicePreset = 'adam'; // Default to Adam
  private customPitch: number = 0.82; // Deep, warm resonant tone for Adam ("trầm ấm")
  private customRate: number = 0.95; // Smooth, poised cadence
  private heartbeatTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  public getVietnameseVoices(): SpeechSynthesisVoice[] {
    const all = this.getAvailableVoices();
    return all.filter(v => v.lang.startsWith('vi') || v.lang.includes('VN'));
  }

  private initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return;

    this.applyPreset(this.currentPreset);
  }

  public setPreset(preset: VoicePreset) {
    this.currentPreset = preset;
    this.applyPreset(preset);
  }

  public getPreset(): VoicePreset {
    return this.currentPreset;
  }

  private applyPreset(preset: VoicePreset) {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (voices.length === 0) return;

    const viVoices = voices.filter(v => v.lang.startsWith('vi') || v.lang.includes('VN'));

    if (preset === 'adam') {
      this.customPitch = 0.82; // Giọng nam trầm ấm, đĩnh đạc
      this.customRate = 0.95;  // Tốc độ vừa phải, ấm áp, truyền cảm

      // 1. Check if user device has an actual voice with "adam" in name
      const directAdam = voices.find(v => v.name.toLowerCase().includes('adam'));
      if (directAdam) {
        this.selectedVoice = directAdam;
        return;
      }

      // 2. Search for Vietnamese male voices (NamMinh, Nam, Minh, Male, Natural)
      if (viVoices.length > 0) {
        const maleVi = viVoices.find(v => 
          v.name.toLowerCase().includes('namminh') ||
          v.name.toLowerCase().includes('nam') ||
          v.name.toLowerCase().includes('minh') ||
          v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('natural')
        );
        if (maleVi) {
          this.selectedVoice = maleVi;
          return;
        }

        // Google Tiếng Việt or first Vietnamese voice
        const googleVi = viVoices.find(v => v.name.includes('Google'));
        this.selectedVoice = googleVi || viVoices[0];
        return;
      }

      // Fallback
      this.selectedVoice = voices.find(v => v.lang.includes('vi')) || voices[0] || null;

    } else if (preset === 'natural') {
      this.customPitch = 1.0;
      this.customRate = 1.0;
      const naturalVi = viVoices.find(v => v.name.includes('Natural') || v.name.includes('Google'));
      this.selectedVoice = naturalVi || viVoices[0] || voices[0] || null;

    } else if (preset === 'female') {
      this.customPitch = 1.08;
      this.customRate = 0.95;
      const femaleVi = viVoices.find(v => 
        v.name.toLowerCase().includes('hoaimy') ||
        v.name.toLowerCase().includes('mai') ||
        v.name.toLowerCase().includes('linh') ||
        v.name.toLowerCase().includes('female')
      );
      this.selectedVoice = femaleVi || viVoices[0] || voices[0] || null;
    }
  }

  public setVoiceByName(voiceName: string) {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    const found = voices.find(v => v.name === voiceName);
    if (found) {
      this.selectedVoice = found;
    }
  }

  public getSelectedVoiceName(): string {
    return this.selectedVoice?.name || 'Tự động (Giọng Adam)';
  }

  public getPitch(): number {
    return this.customPitch;
  }

  public setPitch(val: number) {
    this.customPitch = Math.max(0.5, Math.min(2, val));
  }

  public getRate(): number {
    return this.customRate;
  }

  public setRate(val: number) {
    this.customRate = Math.max(0.5, Math.min(2, val));
  }

  public subscribe(cb: (status: SpeechStatus, currentText?: string) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(status: SpeechStatus, currentText?: string) {
    this.status = status;
    this.listeners.forEach(cb => cb(status, currentText));
  }

  public getStatus(): SpeechStatus {
    return this.status;
  }

  public isSpeaking(): boolean {
    return this.status === 'speaking';
  }

  public isPaused(): boolean {
    return this.status === 'paused';
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public stop() {
    this.isSequenceCancelled = true;
    this.stopHeartbeat();
    if (this.synth) {
      try {
        this.synth.cancel();
        this.synth.resume();
      } catch {
        // Safe ignore
      }
    }
    this.currentUtterance = null;
    this.notify('idle');
  }

  public pause() {
    if (this.synth && this.status === 'speaking') {
      this.synth.pause();
      this.notify('paused', this.lastSpokenText);
    }
  }

  public resume() {
    if (this.synth && this.status === 'paused') {
      this.synth.resume();
      this.notify('speaking', this.lastSpokenText);
    }
  }

  public reRead() {
    if (this.lastSpokenText) {
      this.speak(this.lastSpokenText);
    }
  }

  // Heartbeat to prevent Chromium from dropping long speech utterances (>15s)
  private startHeartbeat() {
    this.stopHeartbeat();
    if (typeof window !== 'undefined') {
      this.heartbeatTimer = window.setInterval(() => {
        if (this.synth && this.synth.speaking && !this.synth.paused) {
          this.synth.pause();
          this.synth.resume();
        }
      }, 10000);
    }
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private ensureVoiceReady() {
    if (!this.synth) return;
    if (!this.selectedVoice) {
      this.applyPreset(this.currentPreset);
    }
  }

  // Speak a single text block
  public speak(
    text: string, 
    options?: {
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
    }
  ) {
    if (!this.synth || this.isMuted) {
      options?.onStart?.();
      options?.onEnd?.();
      return;
    }

    this.stop();
    this.isSequenceCancelled = false;
    this.ensureVoiceReady();
    this.lastSpokenText = text;

    try {
      this.synth.resume();
    } catch {
      // Safe fallback
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
      utterance.lang = this.selectedVoice.lang;
    } else {
      utterance.lang = 'vi-VN';
    }

    utterance.rate = options?.rate ?? this.customRate;
    utterance.pitch = options?.pitch ?? this.customPitch;

    utterance.onstart = () => {
      this.startHeartbeat();
      this.notify('speaking', text);
      options?.onStart?.();
    };

    utterance.onend = () => {
      this.stopHeartbeat();
      this.notify('idle');
      options?.onEnd?.();
    };

    utterance.onerror = () => {
      this.stopHeartbeat();
      this.notify('idle');
      options?.onEnd?.();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  // "Đọc 1 lèo": Continuous seamless reading without pauses between sections
  public async speakContinuous(
    sentences: string[],
    options?: {
      onSentenceStart?: (index: number, sentence: string) => void;
      onComplete?: () => void;
    }
  ) {
    this.stop();
    this.isSequenceCancelled = false;
    this.ensureVoiceReady();

    for (let i = 0; i < sentences.length; i++) {
      if (this.isSequenceCancelled) break;
      const sentence = sentences[i].trim();
      if (!sentence) continue;

      this.lastSpokenText = sentence;
      options?.onSentenceStart?.(i, sentence);

      await new Promise<void>((resolve) => {
        if (this.isMuted || !this.synth) {
          setTimeout(resolve, 600);
          return;
        }

        try {
          this.synth.resume();
        } catch {
          // Safe fallback
        }

        const utterance = new SpeechSynthesisUtterance(sentence);
        if (this.selectedVoice) {
          utterance.voice = this.selectedVoice;
          utterance.lang = this.selectedVoice.lang;
        } else {
          utterance.lang = 'vi-VN';
        }

        utterance.rate = this.customRate;
        utterance.pitch = this.customPitch;

        utterance.onstart = () => {
          this.startHeartbeat();
          this.notify('speaking', sentence);
        };

        utterance.onend = () => {
          this.stopHeartbeat();
          // Minimal natural breath pause (~60ms), sounds like 1 continuous speech ("1 lèo")
          setTimeout(resolve, 70);
        };

        utterance.onerror = () => {
          this.stopHeartbeat();
          resolve();
        };

        this.currentUtterance = utterance;
        this.synth.speak(utterance);
      });
    }

    if (!this.isSequenceCancelled) {
      this.notify('idle');
      options?.onComplete?.();
    }
  }

  // Sequence with specific timing (e.g. Question + 4 options with controlled timing)
  public async speakSequence(
    items: Array<{ text: string; delayAfter?: number; rate?: number; onStep?: () => void }>,
    onComplete?: () => void
  ) {
    this.stop();
    this.isSequenceCancelled = false;
    this.ensureVoiceReady();

    for (let i = 0; i < items.length; i++) {
      if (this.isSequenceCancelled) break;
      const item = items[i];
      item.onStep?.();

      await new Promise<void>((resolve) => {
        if (this.isMuted || !this.synth) {
          setTimeout(resolve, 600);
          return;
        }

        try {
          this.synth.resume();
        } catch {
          // Safe fallback
        }

        const utterance = new SpeechSynthesisUtterance(item.text);
        if (this.selectedVoice) {
          utterance.voice = this.selectedVoice;
          utterance.lang = this.selectedVoice.lang;
        } else {
          utterance.lang = 'vi-VN';
        }

        utterance.rate = item.rate ?? this.customRate;
        utterance.pitch = this.customPitch;

        utterance.onstart = () => {
          this.startHeartbeat();
          this.notify('speaking', item.text);
        };

        utterance.onend = () => {
          this.stopHeartbeat();
          this.notify('idle');
          setTimeout(resolve, item.delayAfter ?? 150);
        };

        utterance.onerror = () => {
          this.stopHeartbeat();
          this.notify('idle');
          resolve();
        };

        this.currentUtterance = utterance;
        this.synth.speak(utterance);
      });
    }

    if (!this.isSequenceCancelled) {
      onComplete?.();
    }
  }

  // External audio playback notification (e.g. from custom recorded audio)
  public notifyExternalSpeaking(isSpeaking: boolean, text?: string) {
    if (isSpeaking) {
      this.status = 'speaking';
      this.notify('speaking', text || 'Đang phát bản ghi âm...');
    } else {
      this.status = 'idle';
      this.notify('idle');
    }
  }
}

export const speechManager = new SpeechManager();
