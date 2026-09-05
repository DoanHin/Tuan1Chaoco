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

  // Persist to server disk /public/azero_intro.mp3 via server API
  public async syncToDisk(blob: Blob, meta: StoredAudioMeta): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      // Check if already on disk with same size
      try {
        const checkRes = await fetch('/api/audio-status');
        if (checkRes.ok) {
          const contentType = checkRes.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const checkData = await checkRes.json();
            if (checkData.exists && Math.abs((checkData.meta?.size || 0) - blob.size) < 10) {
              return true;
            }
          }
        }
      } catch {
        // continue to save
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const res = await fetch('/api/save-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64,
          name: meta.name || 'azero_intro.mp3',
          type: blob.type || 'audio/mp3',
          duration: meta.duration
        })
      });

      return res.ok;
    } catch {
      return false;
    }
  }

  // Check if audio file is physically saved on server disk
  public async checkDiskAudio(): Promise<{ exists: boolean; meta?: any }> {
    if (typeof window === 'undefined') return { exists: false };
    try {
      const res = await fetch('/api/audio-status');
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await res.json();
        }
      }
    } catch {
      // ignore
    }
    return { exists: false };
  }

  // Load static audio from public directory (works in exported web / static hosting)
  public async loadStaticAudio(): Promise<{ blob: Blob; meta: StoredAudioMeta } | null> {
    if (typeof window === 'undefined') return null;

    const basePath = (((import.meta as any).env?.BASE_URL || '/') as string).replace(/\/$/, '');
    const candidates = [
      `${basePath}/azero_intro.mp3`,
      './azero_intro.mp3',
      '/azero_intro.mp3'
    ];

    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;

        const contentType = res.headers.get('content-type') || '';
        // In SPA servers (e.g. Netlify/Vercel/Vite preview), 404 returns index.html!
        if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
          continue;
        }

        const blob = await res.blob();
        if (blob.size < 512) continue; // Invalid or empty file

        let meta: StoredAudioMeta = {
          name: 'azero_intro.mp3',
          size: blob.size,
          type: blob.type || 'audio/mp3',
          updatedAt: Date.now()
        };

        // Attempt reading metadata
        try {
          const metaRes = await fetch(`${basePath}/azero_audio_meta.json`);
          if (metaRes.ok) {
            const mType = metaRes.headers.get('content-type') || '';
            if (mType.includes('application/json')) {
              const parsed = await metaRes.json();
              meta = { ...meta, ...parsed };
            }
          }
        } catch {
          // ignore
        }

        return { blob, meta };
      } catch {
        // try next candidate
      }
    }
    return null;
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
    if (key === 'intro_audio') {
      this.syncToDisk(blob, storedData.meta).catch(() => {});
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

      if (fromDb && fromDb.blob) {
        if (key === 'intro_audio') {
          this.cachedBlob = fromDb.blob;
          this.cachedMeta = fromDb.meta;
          // IMPORTANT: Automatically sync to /api/save-audio so it's guaranteed to be on disk for export!
          this.syncToDisk(fromDb.blob, fromDb.meta).catch(() => {});
        }
        return fromDb;
      }
    } catch {
      // Continue to check disk/server
    }

    // 2. Check static file on server / exported dist directory (Crucial for exported web!)
    if (key === 'intro_audio') {
      const staticData = await this.loadStaticAudio();
      if (staticData) {
        this.cachedBlob = staticData.blob;
        this.cachedMeta = staticData.meta;
        // Save to current browser's IndexedDB so it's cached locally as well
        try {
          const db = await this.getDB();
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(staticData, key);
        } catch {
          // ignore
        }
        return staticData;
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
