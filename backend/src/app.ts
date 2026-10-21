import 'dotenv/config';
import express from 'express';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authRouter } from './application/auth/auth.routes.js';
import { db } from './prisma/db.js';
import { AppError, errorHandler } from './infrastructure/http/errors.js';

/**
 * Construye la aplicación Express.
 *
 * Se extrajo de `server.ts` para poder iniciar el servidor y probar la
 * app por separado. Las rutas de salud existentes se conservan con el
 * mismo comportamiento y las mismas respuestas.
 */
export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  app.get('/', (_req, res) => {
    res.json({
      message: 'UniCyber backend funcionando',
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'UniCyber backend',
    });
  });

  app.get('/api/health/database', async (_req, res) => {
    try {
      await db.orm.public.User.all();

      res.json({
        status: 'ok',
        database: 'connected',
      });
    } catch (error) {
      console.error('Error al verificar PostgreSQL:', error);

      res.status(500).json({
        status: 'error',
        database: 'disconnected',
      });
    }
  });

  app.use('/api/auth', authRouter);

  // Cualquier ruta /api desconocida responde en JSON, no con el HTML
  // del frontend.
  app.use('/api', (_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Recurso no encontrado.'));
  });

  // En producción, Express sirve el build de Vite. La raíz "/" se deja
  // intacta para no romper el endpoint existente; la entrada del SPA es
  // /login (o cualquier ruta de la aplicación).
  const currentDirectory = fileURLToPath(new URL('.', import.meta.url));
  // Desde `src/` (tsx) y desde `dist/` (producción), el build de Vite
  // vive dos niveles arriba: <raíz>/frontend/dist.
  const frontendDist = resolve(currentDirectory, '../../frontend/dist');

  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist, { index: false }));

    app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(join(frontendDist, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
