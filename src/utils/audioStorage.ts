// IndexedDB Storage for custom user-uploaded or recorded audio
import { speechManager } from './speech';

const DB_NAME = 'azero_audio_db';
const DB_VERSION = 1;
const STORE_NAME = 'audio_files';

export interface StoredAudioMeta {
  name: string;
  size: number;
  type: string;
  updatedAt: number;
  duration?: number;
}

class AudioStorageManager {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private isPlayingCustom: boolean = false;
  private cachedBlob: Blob | null = null;
  private cachedMeta: StoredAudioMeta | null = null;
  private onStatusChangeListeners: Set<(isPlaying: boolean) => void> = new Set();

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // Save audio blob (e.g. from file upload or mic recording)
  public async saveAudio(key: string, blob: Blob, meta: { name: string; duration?: number }): Promise<void> {
    const db = await this.getDB();
    const storedData = {
      blob,
      meta: {
        name: meta.name,
        size: blob.size,
        type: blob.type,
        updatedAt: Date.now(),
        duration: meta.duration
      }
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(storedData, key);

      req.onsuccess = () => {
        if (key === 'intro_audio') {
          this.cachedBlob = blob;
          this.cachedMeta = storedData.meta;
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Get audio blob and meta
  public async getAudio(key: string): Promise<{ blob: Blob; meta: StoredAudioMeta } | null> {
    if (key === 'intro_audio' && this.cachedBlob && this.cachedMeta) {
      return { blob: this.cachedBlob, meta: this.cachedMeta };
    }

    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          if (req.result) {
            if (key === 'intro_audio') {
              this.cachedBlob = req.result.blob;
              this.cachedMeta = req.result.meta;
            }
            resolve(req.result);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  // Remove audio
  public async removeAudio(key: string): Promise<void> {
    this.stopPlayback();
    if (key === 'intro_audio') {
      this.cachedBlob = null;
      this.cachedMeta = null;
    }

    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // ignore
    }
  }

  public subscribeStatus(cb: (isPlaying: boolean) => void) {
    this.onStatusChangeListeners.add(cb);
    return () => this.onStatusChangeListeners.delete(cb);
  }

  private notifyStatus(isPlaying: boolean, text?: string) {
    this.isPlayingCustom = isPlaying;
    this.onStatusChangeListeners.forEach(cb => cb(isPlaying));
    speechManager.notifyExternalSpeaking(isPlaying, text || (isPlaying ? 'AZero đang phát bản ghi âm của bạn' : undefined));
  }

  public isPlaying(): boolean {
    return this.isPlayingCustom;
  }

  // Play stored audio
  public async playCustomAudio(
    blob: Blob,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      onTimeUpdate?: (currentTime: number, duration: number) => void;
      onError?: (err: unknown) => void;
    }
  ): Promise<HTMLAudioElement> {
    this.stopPlayback();

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    this.currentAudioElement = audio;

    audio.onplay = () => {
      this.notifyStatus(true);
      options?.onStart?.();
    };

    audio.ontimeupdate = () => {
      options?.onTimeUpdate?.(audio.currentTime, audio.duration || 0);
    };

    audio.onended = () => {
      this.notifyStatus(false);
      URL.revokeObjectURL(audioUrl);
      options?.onEnd?.();
    };

    audio.onerror = (e) => {
      this.notifyStatus(false);
      URL.revokeObjectURL(audioUrl);
      options?.onError?.(e);
    };

    try {
      await audio.play();
    } catch (err) {
      this.notifyStatus(false);
      options?.onError?.(err);
      throw err;
    }

    return audio;
  }

  public stopPlayback() {
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentAudioElement = null;
      this.notifyStatus(false);
    }
  }

  public pausePlayback() {
    if (this.currentAudioElement && !this.currentAudioElement.paused) {
      this.currentAudioElement.pause();
      this.notifyStatus(false);
    }
  }

  public resumePlayback() {
    if (this.currentAudioElement && this.currentAudioElement.paused) {
      this.currentAudioElement.play().catch(() => {});
      this.notifyStatus(true);
    }
  }
}

export const audioStorage = new AudioStorageManager();
