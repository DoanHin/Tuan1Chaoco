import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function audioStoragePlugin(): Plugin {
  return {
    name: 'audio-storage-plugin',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url || '';

        // Check if audio file exists on disk
        if (url.startsWith('/api/audio-status') && req.method === 'GET') {
          const publicDir = path.resolve(__dirname, 'public');
          const audioPath = path.join(publicDir, 'azero_intro.mp3');
          const metaPath = path.join(publicDir, 'azero_audio_meta.json');

          if (fs.existsSync(audioPath)) {
            const stats = fs.statSync(audioPath);
            let meta: any = {
              name: 'azero_intro.mp3',
              size: stats.size,
              updatedAt: stats.mtimeMs,
              type: 'audio/mp3',
            };
            if (fs.existsSync(metaPath)) {
              try {
                meta = { ...meta, ...JSON.parse(fs.readFileSync(metaPath, 'utf8')) };
              } catch {
                // ignore
              }
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ exists: true, meta, url: `/azero_intro.mp3?t=${stats.mtimeMs}` }));
            return;
          } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ exists: false }));
            return;
          }
        }

        // Save audio directly to public/azero_intro.mp3 so it gets bundled when exporting the project
        if (url.startsWith('/api/save-audio') && req.method === 'POST') {
          try {
            const chunks: any[] = [];
            req.on('data', (chunk: any) => chunks.push(chunk));
            req.on('end', () => {
              const bodyBuffer = Buffer.concat(chunks);
              const contentType = req.headers['content-type'] || '';
              const publicDir = path.resolve(__dirname, 'public');
              if (!fs.existsSync(publicDir)) {
                fs.mkdirSync(publicDir, { recursive: true });
              }

              if (contentType.includes('application/json')) {
                try {
                  const data = JSON.parse(bodyBuffer.toString('utf8'));
                  const base64Data = (data.base64 || '').replace(/^data:[^;]+;base64,/, '');
                  const fileBuffer = Buffer.from(base64Data, 'base64');
                  const audioPath = path.join(publicDir, 'azero_intro.mp3');
                  fs.writeFileSync(audioPath, fileBuffer);

                  const metaPath = path.join(publicDir, 'azero_audio_meta.json');
                  fs.writeFileSync(
                    metaPath,
                    JSON.stringify(
                      {
                        name: data.name || 'azero_intro.mp3',
                        size: fileBuffer.length,
                        type: data.type || 'audio/mp3',
                        duration: data.duration,
                        updatedAt: Date.now(),
                      },
                      null,
                      2
                    )
                  );

                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, path: '/azero_intro.mp3' }));
                  return;
                } catch (e: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: e.message }));
                  return;
                }
              } else {
                // Raw binary
                const audioPath = path.join(publicDir, 'azero_intro.mp3');
                fs.writeFileSync(audioPath, bodyBuffer);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, path: '/azero_intro.mp3' }));
                return;
              }
            });
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // Delete audio from disk
        if (url.startsWith('/api/delete-audio') && req.method === 'POST') {
          const publicDir = path.resolve(__dirname, 'public');
          const audioPath = path.join(publicDir, 'azero_intro.mp3');
          const metaPath = path.join(publicDir, 'azero_audio_meta.json');
          if (fs.existsSync(audioPath)) {
            try {
              fs.unlinkSync(audioPath);
            } catch {
              // ignore
            }
          }
          if (fs.existsSync(metaPath)) {
            try {
              fs.unlinkSync(metaPath);
            } catch {
              // ignore
            }
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), audioStoragePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
