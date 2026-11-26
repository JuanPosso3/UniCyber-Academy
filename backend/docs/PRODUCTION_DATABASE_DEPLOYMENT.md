# Despliegue de la base de datos en producción

## Arquitectura

```text
Navegador
  └── Vercel (React + Vite)
        └── Render (Express + Prisma ORM 8)
              └── Neon PostgreSQL 18.7 (rama production)
```

- El frontend no se conecta directamente a Neon.
- Render usa `DATABASE_URL` y el contrato de Prisma 8.
- Vercel sigue comunicándose con Render; no se modificó el contrato de la API.
- La base local no participa en producción.

## Variables de entorno

### Render (backend)

| Variable | Obligatoria | Valor / uso |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Conexión directa de Neon con `sslmode=verify-full`. |
| `JWT_SECRET` | Sí | Secreto aleatorio de al menos 32 caracteres. |
| `JWT_EXPIRES_IN` | Sí | Por ejemplo `2h`. |
| `MAIL_API_URL` | Sí para recuperación | URL HTTPS del Apps Script existente; solo backend. |
| `MAIL_API_SECRET` | Sí para recuperación | Secreto compartido con Apps Script; solo backend. |
| `NODE_ENV` | Sí | `production`. |
| `COOKIE_SECURE` | Opcional | `true`; en producción ya se activa por `NODE_ENV`. |
| `PORT` | La define Render | No hardcodear. |

No se deben subir estas variables al repositorio.

### Vercel (frontend)

Mantener la configuración existente que ya funciona. Si el frontend usa
`VITE_API_BASE_URL`, debe apuntar al backend de Render o a la ruta proxificada
que ya esté en uso. No se cambió ningún endpoint ni contrato de la API.

## Preparación inicial ya realizada

La base de Neon se creó y se pobló en esta intervención:

1. Se validó que la rama `production` estaba vacía.
2. Se reconstruyó el grafo de migraciones.
3. Se aplicó `20261118T2236_baseline`.
4. Se importaron los datos de `public`.
5. Se verificaron conteos, hashes, claves foráneas y secuencias.

Por lo tanto, no es necesario volver a crear el esquema ni volver a importar
los datos actuales.

## Configuración de Render

### 1. Confirmar la cadena de Neon

En el dashboard de Render, revisar la variable `DATABASE_URL` del servicio
backend:

- Debe ser la conexión **directa** de Neon del proyecto
  `little-wind-13359085`, rama `production`, base `neondb`.
- Debe terminar en `sslmode=verify-full`.
- No debe usar el host `-pooler`.
- No debe imprimirse ni copiarse a la documentación.

Si Render ya tenía una cadena de Neon, verificar que corresponda a este mismo
proyecto y rama. Si no coincide, actualizarla.

### 2. Confirmar las demás variables

Comprobar presencia de `JWT_SECRET`, `JWT_EXPIRES_IN`, `MAIL_API_URL`,
`MAIL_API_SECRET` y `NODE_ENV=production`, sin imprimir valores. El usuario
informó que las variables de correo ya están en Render; esta migración no
verificó el panel ni el servicio remoto. Véase
`GOOGLE_APPS_SCRIPT_EMAIL_INTEGRATION.md` para verificación segura y pruebas
manuales pendientes. No se requiere cambiar el esquema de Neon.

### 3. Configurar la migración previa al despliegue

Render permite un comando de pre-despliegue. Configurar:

```bash
pnpm --filter backend db:migrate
```

Ese script ejecuta `prisma db migrate` en `backend/`, usando `DATABASE_URL`.

Requisitos:

- Debe ejecutarse **antes** de iniciar la nueva versión.
- Debe ejecutarse una sola vez por despliegue.
- No debe agregarse al comando de inicio (`start`).
- Si el plan de Render no ofrece pre-despliegue, ejecutar el comando manualmente
  desde un entorno confiable antes de desplegar.

### 4. Comando de inicio

Mantener el comando actual del servicio, por ejemplo:

```bash
pnpm --filter backend start
```

No ejecutar migraciones dentro de `start`: varias instancias podrían intentar
migrar al mismo tiempo y una migración fallida no debe impedir que la
aplicación arranque de forma controlada.

## Orden de despliegue para cambios futuros

1. Desarrollar y probar el cambio en local.
2. Ejecutar `pnpm --filter backend db:check`.
3. Generar la nueva migración y revisarla.
4. Aplicarla en local y ejecutar `db:verify`, tests y build.
5. Crear un respaldo o snapshot de Neon antes de cambios con riesgo de datos.
6. Desplegar en Render con el comando de pre-despliegue configurado.
7. Verificar salud y funcionalidad.
8. Verificar el frontend en Vercel.

## Verificación después del despliegue

### Backend

```bash
curl -sS https://<servicio-render>/api/health
curl -sS https://<servicio-render>/api/health/database
```

Respuestas esperadas:

```json
{ "status": "ok", "service": "UniCyber backend" }
{ "status": "ok", "database": "connected" }
```

Luego comprobar en la aplicación:

- Inicio de sesión con una cuenta existente.
- Carga del catálogo de cursos.
- Acceso a un curso, módulo y lección.
- Progreso de lección.
- Evaluaciones y resultados.
- Panel administrativo, si aplica.

### Frontend

- Confirmar que Vercel sigue usando la URL de Render correcta.
- Iniciar sesión desde el dominio de Vercel.
- Verificar que la cookie de sesión se establece y persiste.
- Confirmar que no hay errores de CORS ni de mixed content.

No se modificó el frontend para esta migración porque no era necesario.

## Verificación end-to-end realizada

### Backend local contra Neon

El backend se inició localmente con `DATABASE_URL` apuntando a Neon y respondió
correctamente:

| Comprobación | Resultado |
| --- | --- |
| `/api/health` | `200 ok` |
| `/api/health/database` | `200 connected` |
| Login | `200` con cookie |
| `/api/auth/me` | `200` |
| `/api/users/me` | `200` |
| `/api/courses` | `200`, 4 cursos |
| `/api/achievements` | `200` |
| `/api/achievements/summary` | `200` |
| Logout | `204` |

### Producción: Vercel → Render → Neon

Se verificó el dominio público
`https://unicyber-academy.vercel.app`, cuyo frontend reenvía `/api` al backend
de Render:

| Comprobación | Resultado |
| --- | --- |
| `GET /api/health` | `200 ok` |
| `GET /api/health/database` | `200 connected` |
| `POST /api/auth/register` | `201` |
| `POST /api/auth/login` | `200` con cookie |
| `GET /api/auth/me` | `200` |
| `GET /api/courses` | `200` |
| `POST /api/auth/logout` | `204` |

El usuario temporal creado desde Vercel se encontró en Neon (la limpieza
eliminó exactamente 1 fila), lo que confirma que Render está usando la base de
datos de producción correcta y no otra base. Después de la limpieza quedaron 9
usuarios y `user_id_seq` volvió a `368`.

Esta prueba valida la cadena completa Vercel → Render → Neon, incluyendo
autenticación y consultas reales.

## Diagnóstico

### `/api/health/database` responde 500

Revisar en este orden:

1. `DATABASE_URL` existe y no tiene espacios.
2. La rama de Neon es `production`.
3. La base es `neondb` y el rol es `neondb_owner`.
4. La cadena usa `sslmode=verify-full`.
5. La contraseña no fue rotada sin actualizar Render.
6. El proyecto Neon no está suspendido por límites del plan.

### Error de prepared statements o transacciones

Síntoma típico de usar el host `-pooler` con una configuración no compatible.
Cambiar a la conexión directa. Las migraciones siempre deben usar conexión
directa.

### Marcador o esquema no coinciden

Ejecutar localmente, con la URL de producción:

```bash
pnpm --filter backend exec prisma db migrate --show --db "$DATABASE_URL"
pnpm --filter backend db:verify
```

No usar `db sign` para ocultar diferencias. Corregir con una migración.

### Una migración falla durante el despliegue

1. El despliegue debe abortar; no iniciar la nueva versión.
2. Revisar los logs del pre-despliegue.
3. Consultar el estado en Neon (`prisma_contract.marker`, `ledger`).
4. Corregir con una migración nueva; no editar la migración ya aplicada.
5. Si hay riesgo para datos, restaurar el snapshot de Neon.
6. Volver a desplegar.

## Reversión

### Revertir el backend

Volver a desplegar la versión anterior desde Render. Si la migración fue
compatible hacia atrás, la versión anterior seguirá funcionando.

### Revertir el esquema

No ejecutar `migrate reset`. Opciones:

1. Restaurar la rama de Neon desde un snapshot o punto en el tiempo.
2. Crear una migración compensatoria.
3. Si el esquema está bien pero los datos no, restaurar el respaldo
   `unicyber-public-data-*.sql` sobre una base vacía o una rama nueva.

Toda operación destructiva requiere autorización explícita.

## Verificación de calidad ejecutada

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Migraciones | `pnpm --filter backend db:check` | `All checks passed` |
| Typecheck backend | `pnpm --filter backend typecheck` | Sin errores |
| Build backend | `pnpm --filter backend build` | Sin errores |
| Typecheck frontend | `pnpm --filter unicyber-web typecheck` | Sin errores |
| Build frontend | `pnpm --filter unicyber-web build` | 1.669 módulos, build correcto |
| Tests backend | `pnpm --filter backend test` | 8/8 correctos |

Las pruebas se ejecutaron contra una copia temporal creada desde el respaldo
verificado, no contra la base local en uso ni contra Neon. La copia se eliminó
al finalizar.

El repositorio no define un script de lint; no se ejecutó ninguna herramienta
de lint adicional.

## Limitaciones actuales

- No hay credenciales de Render ni de Vercel en el entorno local; no se
  pudieron leer logs ni el contenido exacto de las variables del dashboard.
- La cadena funcional Vercel → Render → Neon sí quedó verificada con tráfico
  real y un usuario temporal.
- La autenticación se validó con un usuario temporal y con igualdad exacta de
  hashes; falta que una persona inicie sesión con una cuenta original en
  producción.
- El orden físico de columnas de `question` y `user` no es idéntico al local.
