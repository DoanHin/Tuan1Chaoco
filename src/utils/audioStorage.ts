// IndexedDB & Network Audio Storage for custom user-uploaded or recorded audio
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

export interface StoredAudioItem {
  url: string;
  blob?: Blob;
  meta: StoredAudioMeta;
}

export const DEFAULT_INTRO_META: StoredAudioMeta = {
  name: 'AZero_Adam_Recorded.mp3',
  size: 2723049,
  type: 'audio/mpeg',
  updatedAt: 1788602514684,
  duration: 170,
};

export const DEFAULT_INTRO_AUDIO: StoredAudioItem = {
  url: '/azero_intro.mp3',
  meta: DEFAULT_INTRO_META,
};

class AudioStorageManager {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private preloadedAudio: HTMLAudioElement | null = null;
  private isPlayingCustom: boolean = false;
  private cachedItem: StoredAudioItem | null = null;
  private onStatusChangeListeners: Set<(isPlaying: boolean) => void> = new Set();

  constructor() {
    // Default cached item is the bundled /azero_intro.mp3 so any device has it immediately
    this.cachedItem = { ...DEFAULT_INTRO_AUDIO };
    if (typeof window !== 'undefined') {
      this.preloadAudio('/azero_intro.mp3');
    }
  }

  // Returns immediate audio item without any async await gap (essential for mobile safari click gesture)
  public getImmediateAudio(): StoredAudioItem {
    return this.cachedItem || DEFAULT_INTRO_AUDIO;
  }

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

  // Preload audio into memory so it starts without network delay when user taps play
  private preloadAudio(url: string) {
    if (typeof window === 'undefined') return;
    try {
      if (!this.preloadedAudio || this.preloadedAudio.src !== url) {
        const audio = new Audio();
        audio.setAttribute('playsinline', 'true');
        (audio as any).playsInline = true;
        audio.preload = 'auto';
        audio.src = url;
        audio.load();
        this.preloadedAudio = audio;
      }
    } catch {
      // ignore
    }
  }

  // Persist to server disk /public/azero_intro.mp3 via server API
  public async syncToDisk(blob: Blob, meta: StoredAudioMeta): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
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
          duration: meta.duration,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedMeta = data.meta || meta;
        const freshUrl = data.path || `/azero_intro.mp3?v=${updatedMeta.updatedAt || Date.now()}`;
        this.cachedItem = {
          url: freshUrl,
          blob,
          meta: updatedMeta,
        };
        this.preloadAudio(freshUrl);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // Check if audio file is physically saved on server disk
  public async checkDiskAudio(): Promise<{ exists: boolean; meta?: any; url?: string }> {
    if (typeof window === 'undefined') return { exists: false };
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('/api/audio-status', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data.exists) return data;
        }
      }
    } catch {
      // ignore
    }

    try {
      const basePath = (((import.meta as any).env?.BASE_URL || '/') as string).replace(/\/$/, '');
      const metaRes = await fetch(`${basePath}/azero_audio_meta.json?t=${Date.now()}`);
      if (metaRes.ok && metaRes.headers.get('content-type')?.includes('application/json')) {
        const meta = await metaRes.json();
        if (meta && meta.size > 1000) {
          return {
            exists: true,
            meta,
            url: `${basePath}/azero_intro.mp3?v=${meta.updatedAt || Date.now()}`,
          };
        }
      }
    } catch {
      // ignore
    }

    // Default bundled file exists
    return {
      exists: true,
      meta: DEFAULT_INTRO_META,
      url: '/azero_intro.mp3',
    };
  }

  // Save audio blob (from file upload or mic recording)
  public async saveAudio(key: string, blob: Blob, meta: { name: string; duration?: number }): Promise<void> {
    const metaData: StoredAudioMeta = {
      name: meta.name,
      size: blob.size,
      type: blob.type || 'audio/mp3',
      updatedAt: Date.now(),
      duration: meta.duration,
    };

    const storedData = {
      blob,
      meta: metaData,
    };

    const objectUrl = URL.createObjectURL(blob);
    if (key === 'intro_audio') {
      this.cachedItem = {
        url: objectUrl,
        blob,
        meta: metaData,
      };
      this.preloadAudio(objectUrl);
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

    // 2. Persist to project disk via server API
    if (key === 'intro_audio') {
      await this.syncToDisk(blob, metaData);
    }
  }

  // Get audio item (checks server status first, then IndexedDB, fallback to bundled audio)
  public async getAudio(key: string, forceFresh = false): Promise<StoredAudioItem | null> {
    if (key === 'intro_audio' && this.cachedItem && !forceFresh) {
      return this.cachedItem;
    }

    if (key === 'intro_audio' && typeof window !== 'undefined') {
      // 1. Check API endpoint /api/audio-status
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const statusRes = await fetch('/api/audio-status', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (statusRes.ok) {
          const cType = statusRes.headers.get('content-type') || '';
          if (cType.includes('application/json')) {
            const data = await statusRes.json();
            if (data.exists && data.meta) {
              const streamUrl = data.url || `/azero_intro.mp3?v=${data.meta.updatedAt || Date.now()}`;
              const item: StoredAudioItem = {
                url: streamUrl,
                meta: data.meta,
              };
              this.cachedItem = item;
              this.preloadAudio(streamUrl);
              return item;
            }
          }
        }
      } catch {
        // continue
      }

      // 2. Check static azero_audio_meta.json
      try {
        const basePath = (((import.meta as any).env?.BASE_URL || '/') as string).replace(/\/$/, '');
        const metaRes = await fetch(`${basePath}/azero_audio_meta.json?t=${Date.now()}`);
        if (metaRes.ok) {
          const cType = metaRes.headers.get('content-type') || '';
          if (cType.includes('application/json')) {
            const metaJson: StoredAudioMeta = await metaRes.json();
            if (metaJson && metaJson.size > 1000) {
              const streamUrl = `${basePath}/azero_intro.mp3?v=${metaJson.updatedAt || Date.now()}`;
              const item: StoredAudioItem = {
                url: streamUrl,
                meta: metaJson,
              };
              this.cachedItem = item;
              this.preloadAudio(streamUrl);
              return item;
            }
          }
        }
      } catch {
        // continue
      }
    }

    // 3. Check IndexedDB
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
        const objUrl = URL.createObjectURL(fromDb.blob);
        const item: StoredAudioItem = {
          url: objUrl,
          blob: fromDb.blob,
          meta: fromDb.meta,
        };
        if (key === 'intro_audio') {
          this.cachedItem = item;
          this.preloadAudio(objUrl);
          this.syncToDisk(fromDb.blob, fromDb.meta).catch(() => {});
        }
        return item;
      }
    } catch {
      // ignore
    }

    // 4. Guaranteed Fallback for intro_audio: The bundled AZero audio file!
    if (key === 'intro_audio') {
      const fallbackItem = { ...DEFAULT_INTRO_AUDIO };
      this.cachedItem = fallbackItem;
      this.preloadAudio(fallbackItem.url);
      return fallbackItem;
    }

    return null;
  }

  // Download audio file to local computer
  public async downloadAudio(source: Blob | string, filename = 'azero_intro.mp3'): Promise<void> {
    if (typeof window === 'undefined') return;
    if (source instanceof Blob) {
      const url = URL.createObjectURL(source);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      try {
        const res = await fetch(source);
        const blob = await res.blob();
        await this.downloadAudio(blob, filename);
      } catch {
        const a = document.createElement('a');
        a.href = source;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  }

  // Remove audio from everywhere
  public async removeAudio(key: string): Promise<void> {
    this.stopPlayback();
    if (key === 'intro_audio') {
      this.cachedItem = null;
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

    // Also delete from server API
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
    this.onStatusChangeListeners.forEach((cb) => cb(isPlaying));
    speechManager.notifyExternalSpeaking(isPlaying, text || (isPlaying ? 'AZero đang phát biểu' : undefined));
  }

  public isPlaying(): boolean {
    return this.isPlayingCustom;
  }

  // Play stored audio via direct URL or Blob stream
  public async playCustomAudio(
    source: Blob | string,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      onTimeUpdate?: (currentTime: number, duration: number) => void;
      onError?: (err: unknown) => void;
    }
  ): Promise<HTMLAudioElement> {
    this.stopPlayback();

    let audioUrl: string;
    let isCreatedBlobUrl = false;
    if (typeof source === 'string') {
      audioUrl = source;
    } else {
      audioUrl = URL.createObjectURL(source);
      isCreatedBlobUrl = true;
    }

    // Use preloaded audio if available and matches source, or create new
    let audio: HTMLAudioElement;
    if (this.preloadedAudio && this.preloadedAudio.src.includes(audioUrl.split('?')[0])) {
      audio = this.preloadedAudio;
      audio.currentTime = 0;
    } else {
      audio = new Audio(audioUrl);
    }

    audio.setAttribute('playsinline', 'true');
    (audio as any).playsInline = true;
    audio.preload = 'auto';
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
      if (isCreatedBlobUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      options?.onEnd?.();
    };

    audio.onerror = (e) => {
      this.notifyStatus(false);
      if (isCreatedBlobUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      options?.onError?.(e);
    };

    try {
      await audio.play();
    } catch (err) {
      this.notifyStatus(false);
      if (isCreatedBlobUrl) {
        URL.revokeObjectURL(audioUrl);
      }
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
