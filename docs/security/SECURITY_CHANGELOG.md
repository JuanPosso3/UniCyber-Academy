# Historial de seguridad

## 2026-11-22 — cierre de la auditoría

- Se conservaron todos los cambios previos y los artefactos de la migración a Neon; no se repitió la migración ni se hicieron commits.
- Se restauró `error.details` en `errorHandler` y se añadió una prueba HTTP que conserva `missingActivityIds` sin filtrar stack.
- Se sustituyó el limitador exclusivamente en memoria por un almacén PostgreSQL opcional y parametrizado, con `UPSERT` atómico, contención por `LEAST`, limpieza oportunista y fail-closed con 503. Se añadió el script `rate-limit:init`.
- Se extrajo `rehashPasswordIfUnchanged`: la actualización del hash solo se aplica si la fila conserva el hash leído, evitando sobrescribir cambios concurrentes.
- Se condicionó la reserva de intentos de recuperación antes de verificar el código y se revalidó la expiración al consumirlo.
- Se sustituyó `trust proxy = 1` por `TRUSTED_PROXY_CIDRS`, desconfiando por defecto de `X-Forwarded-For`.
- Se implementó protección CSRF con allowlist exacta, Origin/Referer, cabecera personalizada, sin CORS y CORP; se añadió la cabecera en el cliente frontend.
- Se añadieron `backend/test/security.test.ts`, `backend/test/security-integration.test.ts` y `backend/test/browser-security.fixture.ts`, conectados mediante scripts en `backend/package.json`.
- Se ejecutaron 10/10 pruebas de seguridad sin BD, 3/3 de integración con BD aislada y 8/8 de regresión funcional.
- Se verificaron CSRF, cabeceras y expiración de sesión en navegador contra un fixture local sin datos reales.
- Se actualizaron Express 5.3.0, Vite 6.4.6 y las overrides transitivas: `pnpm audit` pasó de 75 avisos a 0.
- `pnpm typecheck:all`, `pnpm build:all`, `pnpm audit`, `pnpm audit --prod` y `git diff --check` pasaron tras los últimos cambios.
- Se crearon los seis documentos en `docs/security/` y se habilitó su versionado en `.gitignore`.

## Cambios heredados conservados

Express 5.3.0 y overrides; scrypt `N=65536` con rehash; claim `pwd`; límites locales iniciales; recuperación asíncrona; headers/CSP/no-store; evento frontend de expiración; validación adicional de URL. Ninguno se considera desplegado por el hecho de estar en el árbol de trabajo.

## Decisiones y limitaciones

- La duración del JWT permanece en dos horas y no se introdujeron refresh tokens ni modelos de sesión.
- No se introdujeron Redis, dependencias innecesarias ni cambios de esquema Prisma. La tabla del limitador es una operación SQL explícita y separada del contrato.
- No se modificaron roles, estados, datos académicos ni contratos de API.
- No se accedió a paneles de Vercel, Render o Neon; no se hicieron cambios de infraestructura ni de secretos.
- Quedan como acciones manuales la activación del limitador compartido, la confirmación de `APP_ORIGINS` y `TRUSTED_PROXY_CIDRS`, el despliegue de headers y las mediciones de capacidad. La auditoría se cierra documentalmente con esos riesgos y no con la afirmación de que estén resueltos en producción.
