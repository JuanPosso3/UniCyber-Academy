# Configuración de Neon

## Proyecto existente

Se reutilizó el proyecto ya creado. No se creó un proyecto nuevo.

| Dato | Valor |
| --- | --- |
| Organización | `org-super-pine-33914094` (`MeOrg`) |
| Proyecto | `little-wind-13359085` |
| Rama | `production` (`br-small-dust-beyf3vz9`) |
| Base de datos | `neondb` |
| Rol propietario | `neondb_owner` |
| Servicio | `postgres` |
| Motor | PostgreSQL 18.7 |

La rama `production` es la rama primaria y por defecto del proyecto.

## Estado inicial

Antes de aplicar el esquema se inspeccionó la base con `psql` en modo lectura.
Estaba completamente vacía:

- 0 tablas de usuario.
- 0 secuencias.
- 0 tipos enum.
- Única extensión: `plpgsql`.
- Esquema `public` sin objetos de la aplicación.

Por eso no había información de producción que preservar ni sobrescribir. El
tamaño lógico reportado por Neon correspondía a metadatos internos, no a tablas
de UniCyber.

## Modo de conexión

### Conexión directa (usada)

La producción usa la conexión directa de Neon:

```text
postgresql://<rol>:<password>@<host-directo>/neondb?sslmode=verify-full
```

Motivos:

- Prisma ORM 8 tiene una sola conexión (`db.connection`) para CLI y runtime.
- Las migraciones necesitan una conexión directa y estable.
- Render ejecuta un servidor Node de larga duración, no funciones efímeras; el
  pool interno de `pg` es suficiente.
- Evita depender de las reglas de PgBouncer para DDL, locks y estado de sesión.

No se configuró una segunda URL `DIRECT_URL` porque esta versión no la usa.

### Conexión pooled

Neon también ofrece una cadena con host `-pooler`. No se usa en este proyecto.
Si en el futuro se necesita para escalar horizontalmente, debe evaluarse y
probarse por separado; las migraciones deben seguir ejecutándose contra la
conexión directa.

## SSL

La conexión de producción debe usar:

```text
sslmode=verify-full
```

Se verificó que Prisma 8 conecta y valida el esquema de Neon con
`sslmode=verify-full`.

Prisma/`pg` acepta hoy `sslmode=require`, pero emite una advertencia: en la
próxima versión mayor `require` cambiará de semántica. Para evitar una ruptura
futura, el valor documentado y recomendado es `verify-full`.

## Obtener la cadena sin exponerla

La CLI de Neon puede generar la cadena:

```bash
npx --yes neon@9.7.1 connection-string production \
  --project-id little-wind-13359085 \
  --database-name neondb \
  --role-name neondb_owner \
  --ssl require
```

Reglas:

- No imprimir la cadena completa en la terminal ni en registros.
- No guardarla en archivos del repositorio.
- No incluirla en documentación, capturas ni commits.
- Configurarla únicamente como variable de entorno en Render.

La CLI se autenticó con `neon login` (flujo de navegador). El perfil queda en
`~/.config/neon`; no se agregó ningún archivo `.neon` al repositorio.

## Notas sobre la CLI de Neon

Comandos útiles y verificados:

```bash
npx --yes neon@9.7.1 me
npx --yes neon@9.7.1 orgs list
npx --yes neon@9.7.1 projects list --org-id org-super-pine-33914094
npx --yes neon@9.7.1 branches list --project-id little-wind-13359085
npx --yes neon@9.7.1 databases list --project-id little-wind-13359085
npx --yes neon@9.7.1 roles list --project-id little-wind-13359085
```

Precauciones:

- `neon init` prepara políticas de `neon.ts` para agentes; no es el comando
  para aprovisionar la base. No se usó.
- `neon deploy` aplica políticas y puede modificar recursos. No se usó.
- `neon link` puede escribir `.neon` y, por defecto, descargar variables a
  `.env`. No se usó. Si se usa en el futuro, emplear `--no-env-pull` y
  `--no-config`.

## Creación del esquema

Con el grafo de migraciones reconstruido, se aplicó la línea base contra Neon:

```bash
cd backend
pnpm exec prisma db migrate --db "$NEON_DATABASE_URL"
```

Resultado real:

```text
migrationsApplied: 1
migrationsTotal: 1
markerHash: 2c3ee0e049a74a92cbc0364ca54d685d3d7279dcc7e2a6739df998e08582fcab
```

La migración aplicada fue `20261118T2236_baseline`.

No se ejecutó SQL manual para crear tablas y no se usó sincronización
destructiva.

## Objetos resultantes

| Objeto | Cantidad |
| --- | ---: |
| Tablas de aplicación en `public` | 13 |
| Secuencias en `public` | 12 |
| Índices en `public` | 39 |
| Restricciones en `public` | 132 |
| Enums en `public` | 0 |
| Extensiones | `plpgsql` |

Tablas de aplicación:

`achievement`, `answerOption`, `assessment`, `assessmentAttempt`, `course`,
`lesson`, `lessonProgress`, `module`, `passwordReset`, `question`,
`questionResponse`, `user`, `userAchievement`.

Prisma crea además el esquema interno `prisma_contract` con las tablas
`marker`, `ledger` y `contract`. No se debe modificar manualmente.

## Verificación

```bash
cd backend
pnpm exec prisma db verify --db "$NEON_DATABASE_URL"
```

Resultado real:

```text
Database marker and schema match contract
```

También se verificó que no hay migraciones pendientes:

```bash
cd backend
pnpm exec prisma db migrate --show --db "$NEON_DATABASE_URL"
```

```text
Already up to date — nothing to run
```

La cadena pública Vercel → Render → Neon se comprobó con tráfico real:

```text
GET https://unicyber-academy.vercel.app/api/health          -> 200
GET https://unicyber-academy.vercel.app/api/health/database -> 200 connected
```

Además se registró y autenticó un usuario temporal a través de Vercel, se
confirmó su presencia en Neon y se eliminó al finalizar. La base quedó con 9
usuarios y `user_id_seq = 368`.

## Variables de entorno para Render

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Cadena directa de Neon con `sslmode=verify-full`. |
| `JWT_SECRET` | Sí | Secreto de firma de al menos 32 caracteres. |
| `JWT_EXPIRES_IN` | Sí | Duración de sesión, por ejemplo `2h`. |
| `RESEND_API_KEY` | Sí para recuperación | Clave de Resend. |
| `RESEND_FROM_EMAIL` | Recomendada | Remitente verificado en producción. |
| `NODE_ENV` | Sí | `production`. |
| `COOKIE_SECURE` | Opcional | `true` fuerza cookies seguras; en producción ya se activa por `NODE_ENV`. |

No se deben agregar credenciales a `backend/.env.example`.

## Rotación de credenciales

Si se rota la contraseña del rol en Neon:

1. Generar la nueva cadena en Neon.
2. Actualizar `DATABASE_URL` en Render.
3. Reiniciar el servicio.
4. Verificar `/api/health/database`.
5. No modificar la base local ni los respaldos.

La contraseña anterior deja de funcionar; no se requiere cambio de código.
