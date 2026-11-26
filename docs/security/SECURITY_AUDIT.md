# Auditoría de seguridad — UniCyber Academy

Fecha de cierre documental: 2026-11-22. Estado: **auditoría cerrada en el ámbito del código y las pruebas locales**. El cierre no implica que las correcciones estén desplegadas ni que la infraestructura de Vercel, Render o Neon haya sido inspeccionada: no existe acceso a esos paneles.

## Alcance y método

Se siguió el orden reconnaissance → assessment → priorización → remediación → pruebas de seguridad → regresión → documentación → informe final. No se realizaron ataques de carga, fuerzas brutas, pruebas destructivas, escrituras en producción, migraciones en Neon, rotación de secretos ni cambios de infraestructura cloud.

La migración PostgreSQL → Neon pertenece a una intervención anterior. Sus artefactos (baseline, snapshots y scripts) se conservaron y no se repitió ninguna operación de migración. Las pruebas con base de datos se ejecutaron en una base PostgreSQL local desechable, creada desde el esquema y los metadatos del contrato, con catálogo de logros cargado desde código y datos ficticios. Esa base fue eliminada al terminar. La base local de origen y Neon no recibieron escrituras de esta auditoría.

## Arquitectura y límites de confianza

Navegador React → `/api` del mismo origen en Vercel → rewrite hacia Render → Express 5 → Prisma ORM 8 → PostgreSQL. En desarrollo, Vite proxifica `/api`. Desde la actualización del 26 de noviembre de 2026, el backend envía los códigos de recuperación por HTTPS al Apps Script existente. Véase `backend/docs/GOOGLE_APPS_SCRIPT_EMAIL_INTEGRATION.md` para la verificación actual y sus límites.

| Superficie | Acceso y control verificado |
|---|---|
| `/api/auth/register`, `/login`, `/logout`, `/password-reset/*` | Públicas; validación de esquema, limitación de intentos y CSRF |
| `/api/auth/me`, `/api/users/me*` | Sesión; usuario consultado en servidor en cada petición |
| `/api/courses/*`, `/api/courses/:courseId/assessment*` | Sesión; disponibilidad, desbloqueo y resultados por usuario |
| `/api/achievements/*` | Sesión; propiedad de notificaciones comprobada |
| `/api/admin/*` | Sesión y rol administrativo persistido en BD |
| `/api/health*` | Públicas; conectividad sin exponer datos personales |

Los roles funcionales son estudiante y administrador; las representaciones persistidas son `STUDENT` y `ADMINISTRATIVE`. El dominio histórico conserva los cinco valores del enum sin conceder permisos administrativos a los demás. Estados: `ACTIVE` y `DISABLED`. No se alteraron roles, estados, contrato Prisma, evaluaciones finales ni funcionalidades académicas. La duración del JWT sigue siendo dos horas.

## Controles correctos confirmados

- JWT HS256 con issuer, audience, `iat`, `exp` y `sub` decimal obligatorios; verificación contra la BD en cada petición. El rol del token no concede permisos por sí mismo.
- Cookie de sesión HttpOnly, host-only, `Path=/`, `SameSite=Lax` y `Secure` en producción.
- Registro con rol forzado a `STUDENT` en servidor; respuestas públicas sin `passwordHash`.
- Consultas mediante ORM tipado. No se encontraron usos de SQL inseguro en el código de aplicación previo a esta auditoría; el único SQL crudo nuevo es parametrizado y usa la lane oficial `db.raw.sql`.
- React escapa el texto; no se usa `dangerouslySetInnerHTML`. Los enlaces de teoría validan protocolo HTTP/HTTPS en backend y en frontend.
- Los laboratorios son simulaciones; no ejecutan procesos del sistema. No existen cargas de archivos en el alcance actual.

## Resultados verificados

| Verificación | Resultado |
|---|---|
| Regresión funcional (`pnpm test`, BD aislada) | 8/8 |
| Seguridad sin BD (`pnpm test:security`) | 10/10 |
| Integración de seguridad con BD aislada (`test:security:integration`) | 3/3 |
| Pruebas de navegador con fixture local | CSRF, headers y expiración de sesión: correctos |
| `pnpm typecheck:all` | Pasa |
| `pnpm build:all` | Pasa |
| `pnpm audit` y `pnpm audit --prod` | 0 vulnerabilidades conocidas |
| `git diff --check` | Pasa; solo avisos LF/CRLF |

El audit completo pasó de 75 avisos (12 altos, 55 moderados, 8 bajos) a 0 tras actualizar Express, Vite y fijar dependencias transitivas mediante overrides.

## Riesgos residuales y cierre

La auditoría se cierra con los siguientes elementos documentados, no con la afirmación de que estén resueltos en producción:

1. El limitador compartido está implementado y probado, pero su activación requiere `RATE_LIMIT_STORE=postgres` y crear la tabla con `pnpm --filter backend rate-limit:init`. Hacerlo en producción es una decisión de infraestructura pendiente de autorización.
2. La cadena real Vercel → Render no fue inspeccionada. `trust proxy = 1` se sustituyó por una lista explícita de CIDR (`TRUSTED_PROXY_CIDRS`, vacía por defecto); requiere configuración manual verificada.
3. CSRF fue verificado en navegador contra un fixture local. El dominio real de Vercel debe confirmarse y configurarse en `APP_ORIGINS` antes del despliegue.
4. Una copia del JWT sigue siendo válida tras el logout hasta su expiración o invalidación por contraseña. Se mantienen dos horas por decisión de contrato.
5. La recuperación asíncrona no garantiza tiempo constante y puede perder trabajo si el proceso se reinicia.
6. scrypt usa `N=65536`; su capacidad concurrente no fue medida en Render.

Consulta [hallazgos](SECURITY_FINDINGS.md), [pruebas](SECURITY_TESTS.md), [sesiones y CSRF](JWT_SESSION_SECURITY.md), [checklist de producción](PRODUCTION_SECURITY_CHECKLIST.md) y [historial](SECURITY_CHANGELOG.md).

No se hizo commit. Los cambios permanecen en el árbol de trabajo para su revisión.
