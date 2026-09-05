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
    const storedData = {
      blob,
      meta: {
        name: meta.name,
        size: blob.size,
        type: blob.type || 'audio/mp3',
        updatedAt: Date.now(),
        duration: meta.duration
      }
    };

    if (key === 'intro_audio') {
      this.cachedBlob = blob;
      this.cachedMeta = storedData.meta;
    }

    // 1. Save to IndexedDB
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(storedData, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // safe fallback
    }

    // 2. Persist to project disk /public/azero_intro.mp3 via server API so it is bundled when exporting ZIP
    if (key === 'intro_audio' && typeof window !== 'undefined') {
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64 = reader.result as string;
            await fetch('/api/save-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                base64,
                name: meta.name,
                type: blob.type,
                duration: meta.duration
              })
            });
          } catch {
            // Safe fallback if offline or in static export
          }
        };
        reader.readAsDataURL(blob);
      } catch {
        // ignore
      }
    }
  }

  // Get audio blob and meta (checks cache, IndexedDB, and static public/azero_intro.mp3)
  public async getAudio(key: string): Promise<{ blob: Blob; meta: StoredAudioMeta } | null> {
    if (key === 'intro_audio' && this.cachedBlob && this.cachedMeta) {
      return { blob: this.cachedBlob, meta: this.cachedMeta };
    }

    // 1. Check IndexedDB
    try {
      const db = await this.getDB();
      const fromDb = await new Promise<{ blob: Blob; meta: StoredAudioMeta } | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      if (fromDb) {
        if (key === 'intro_audio') {
          this.cachedBlob = fromDb.blob;
          this.cachedMeta = fromDb.meta;
        }
        return fromDb;
      }
    } catch {
      // Continue to check disk/server
    }

    // 2. Check static file on server/public directory (Crucial for exported apps!)
    if (key === 'intro_audio' && typeof window !== 'undefined') {
      try {
        // Check API status first
        const statusRes = await fetch('/api/audio-status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.exists) {
            const fileRes = await fetch(statusData.url || '/azero_intro.mp3');
            if (fileRes.ok) {
              const blob = await fileRes.blob();
              const meta: StoredAudioMeta = {
                name: statusData.meta?.name || 'azero_intro.mp3',
                size: blob.size,
                type: blob.type || 'audio/mp3',
                updatedAt: statusData.meta?.updatedAt || Date.now(),
                duration: statusData.meta?.duration
              };
              this.cachedBlob = blob;
              this.cachedMeta = meta;
              return { blob, meta };
            }
          }
        }
      } catch {
        // Direct fetch attempt for exported static build
        try {
          const fileRes = await fetch('/azero_intro.mp3');
          if (fileRes.ok && fileRes.headers.get('content-type')?.includes('audio')) {
            const blob = await fileRes.blob();
            const meta: StoredAudioMeta = {
              name: 'azero_intro.mp3',
              size: blob.size,
              type: blob.type || 'audio/mp3',
              updatedAt: Date.now()
            };
            this.cachedBlob = blob;
            this.cachedMeta = meta;
            return { blob, meta };
          }
        } catch {
          // ignore
        }
      }
    }

    return null;
  }

  // Download audio file to local computer
  public downloadAudio(blob: Blob, filename = 'azero_intro.mp3'): void {
    if (typeof window === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // ignore
    }

    // Also delete from disk API
    if (key === 'intro_audio' && typeof window !== 'undefined') {
      try {
        await fetch('/api/delete-audio', { method: 'POST' });
      } catch {
        // ignore
      }
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
