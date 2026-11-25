/**
 * Servidor de prueba local para verificaciones de navegador.
 *
 * No importa Prisma, no envía correos y no usa usuarios reales. Sirve el
 * build de Vite y una API ficticia con el mismo middleware CSRF y de
 * cabeceras que la aplicación.
 */
import express from 'express';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

process.env['JWT_SECRET'] = 'secreto-ficticio-exclusivo-del-servidor-de-prueba';
process.env['NODE_ENV'] = 'test';

const { csrfProtection } = await import('../src/infrastructure/http/csrf.middleware.js');
const { securityHeaders } = await import('../src/infrastructure/http/security-headers.js');
const { errorHandler } = await import('../src/infrastructure/http/errors.js');

const app = express();
app.disable('x-powered-by');
let active = true;
let writes = 0;

const user = {
  id: 1,
  firstName: 'Persona',
  lastName: 'Ficticia',
  email: 'prueba@example.test',
  role: 'STUDENT',
  status: 'ACTIVE',
  username: null,
};

app.use(securityHeaders);
app.use(csrfProtection(new Set(['http://127.0.0.1:5188'])));
app.use(express.json());

app.post('/__test/expire', (_req, res) => {
  active = false;
  res.end();
});
app.get('/__test/state', (_req, res) => {
  res.json({ writes, active });
});
app.post('/api/probe', (_req, res) => {
  writes += 1;
  res.status(204).end();
});

app.post('/api/auth/logout', (_req, res) => {
  active = false;
  res.status(204).end();
});

app.use('/api', (_req, res, next) => {
  if (!active) {
    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
      },
    });
    return;
  }

  next();
});

app.get('/api/auth/me', (_req, res) => res.json({ user }));
app.get('/api/users/me', (_req, res) => res.json({ user }));
app.get('/api/courses', (_req, res) => res.json({ courses: [] }));
app.get('/api/achievements/notifications/pending', (_req, res) =>
  res.json({ notifications: [] }),
);
app.get('/api/achievements/summary', (_req, res) =>
  res.json({
    completedCourses: 0,
    totalCourses: 5,
    earnedMedals: 0,
    totalMedals: 5,
    currentRank: null,
    nextAchievement: null,
    nextRankProgress: null,
    pendingNotifications: 0,
  }),
);
app.use('/api', (_req, res) => res.json({}));

const testDirectory = fileURLToPath(new URL('.', import.meta.url));
const dist = resolve(testDirectory, '..', '..', 'frontend', 'dist');
app.use(express.static(dist));
app.get(/.*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')));
app.use(errorHandler);

const server = app.listen(5188, '127.0.0.1', () =>
  console.log('Fixture local en http://127.0.0.1:5188'),
);

// Origen externo para las pruebas CSRF. No concede CORS.
const attacker = express().get('/', (_req, res) =>
  res
    .type('html')
    .send('<!doctype html><title>Origen de prueba externo</title>Prueba CSRF local'),
);
const other = attacker.listen(5189, '127.0.0.1');

function close(): void {
  server.close();
  other.close();
}

process.on('SIGTERM', close);
process.on('SIGINT', close);
