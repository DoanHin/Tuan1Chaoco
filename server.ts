import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'public');
  const distDir = path.join(rootDir, 'dist');

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Parse JSON and raw bodies up to 100MB for large audio files
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // CORS headers so any device / client can fetch audio & status
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Helper to find audio file path
  const getAudioPath = () => {
    const pubAudio = path.join(publicDir, 'azero_intro.mp3');
    if (fs.existsSync(pubAudio)) return pubAudio;
    const distAudio = path.join(distDir, 'azero_intro.mp3');
    if (fs.existsSync(distAudio)) return distAudio;
    return null;
  };

  const getMetaPath = () => {
    const pubMeta = path.join(publicDir, 'azero_audio_meta.json');
    if (fs.existsSync(pubMeta)) return pubMeta;
    const distMeta = path.join(distDir, 'azero_audio_meta.json');
    if (fs.existsSync(distMeta)) return distMeta;
    return null;
  };

  // Audio status endpoint
  app.get('/api/audio-status', (req, res) => {
    const audioPath = getAudioPath();
    const metaPath = getMetaPath();

    if (audioPath && fs.existsSync(audioPath)) {
      try {
        const stats = fs.statSync(audioPath);
        let meta: any = {
          name: 'azero_intro.mp3',
          size: stats.size,
          type: 'audio/mpeg',
          updatedAt: stats.mtimeMs,
        };

        if (metaPath && fs.existsSync(metaPath)) {
          try {
            const rawMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            meta = { ...meta, ...rawMeta, size: stats.size };
          } catch {
            // ignore
          }
        }

        res.json({
          exists: true,
          url: `/azero_intro.mp3?v=${Math.floor(meta.updatedAt || stats.mtimeMs)}`,
          meta,
        });
        return;
      } catch (err: any) {
        res.status(500).json({ error: err.message });
        return;
      }
    }

    res.json({ exists: false });
  });

  // Save audio endpoint (receives base64 or binary)
  app.post('/api/save-audio', (req, res) => {
    try {
      const { base64, name, type, duration } = req.body;
      let buffer: Buffer;

      if (base64) {
        const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');
        buffer = Buffer.from(cleanBase64, 'base64');
      } else if (Buffer.isBuffer(req.body)) {
        buffer = req.body;
      } else {
        res.status(400).json({ error: 'No audio data provided' });
        return;
      }

      // 1. Write to public/
      const targetPubAudio = path.join(publicDir, 'azero_intro.mp3');
      const targetPubMeta = path.join(publicDir, 'azero_audio_meta.json');
      fs.writeFileSync(targetPubAudio, buffer);

      const metaObj = {
        name: name || 'azero_intro.mp3',
        size: buffer.length,
        type: type || 'audio/mpeg',
        duration: duration || undefined,
        updatedAt: Date.now(),
      };
      fs.writeFileSync(targetPubMeta, JSON.stringify(metaObj, null, 2));

      // 2. Also write to dist/ if it exists so production build has it instantly
      if (fs.existsSync(distDir)) {
        try {
          fs.writeFileSync(path.join(distDir, 'azero_intro.mp3'), buffer);
          fs.writeFileSync(path.join(distDir, 'azero_audio_meta.json'), JSON.stringify(metaObj, null, 2));
        } catch {
          // ignore
        }
      }

      res.json({
        success: true,
        path: `/azero_intro.mp3?v=${metaObj.updatedAt}`,
        meta: metaObj,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete audio endpoint
  app.post('/api/delete-audio', (req, res) => {
    try {
      const pubAudio = path.join(publicDir, 'azero_intro.mp3');
      const pubMeta = path.join(publicDir, 'azero_audio_meta.json');
      if (fs.existsSync(pubAudio)) fs.unlinkSync(pubAudio);
      if (fs.existsSync(pubMeta)) fs.unlinkSync(pubMeta);

      if (fs.existsSync(distDir)) {
        const distAudio = path.join(distDir, 'azero_intro.mp3');
        const distMeta = path.join(distDir, 'azero_audio_meta.json');
        if (fs.existsSync(distAudio)) fs.unlinkSync(distAudio);
        if (fs.existsSync(distMeta)) fs.unlinkSync(distMeta);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Explicit route for azero_audio_meta.json with no-cache so phones get fresh metadata immediately
  app.get('/azero_audio_meta.json', (req, res) => {
    const metaPath = getMetaPath();
    if (metaPath && fs.existsSync(metaPath)) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(metaPath);
      return;
    }
    res.status(404).json({ exists: false });
  });

  // Explicit route for azero_intro.mp3 with byte range support for iOS Safari
  app.get('/azero_intro.mp3', (req, res) => {
    const audioPath = getAudioPath();
    if (!audioPath || !fs.existsSync(audioPath)) {
      res.status(404).send('Audio file not found');
      return;
    }

    const stat = fs.statSync(audioPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(audioPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      });
      fs.createReadStream(audioPath).pipe(res);
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AZero Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
