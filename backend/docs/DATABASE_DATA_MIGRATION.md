# Transferencia de datos a Neon

## Alcance

La migración de esquema y la transferencia de datos se trataron como procesos
separados:

1. El esquema se creó en Neon con la migración oficial de Prisma ORM 8.
2. Los datos existentes se exportaron de la base local y se restauraron en
   Neon.
3. Se compararon conteos, contenido, relaciones, hashes de autenticación y
   secuencias.

La base local fue tratada como fuente de verdad y **no se modificó**.

## Auditoría de origen

Base local: PostgreSQL 18.6, base `unicyber`.

### Tablas y filas

| Tabla | Filas |
| --- | ---: |
| `achievement` | 13 |
| `answerOption` | 118 |
| `assessment` | 5 |
| `assessmentAttempt` | 2 |
| `course` | 8 |
| `lesson` | 38 |
| `lessonProgress` | 25 |
| `module` | 23 |
| `passwordReset` | 1 |
| `question` | 40 |
| `questionResponse` | 16 |
| `user` | 9 |
| `userAchievement` | 14 |

Además existen las tablas internas `prisma_contract.marker`,
`prisma_contract.ledger` y `prisma_contract.contract`, que no son datos
académicos.

### Estructuras adicionales

- 12 secuencias en `public`.
- 39 índices.
- 132 restricciones.
- 0 tipos enum.
- Extensión `plpgsql`.
- Ninguna tabla de sesiones ni tabla auxiliar de autenticación fuera de
  `user` y `passwordReset`.

## Respaldo

### Archivos generados

| Archivo | Formato | Tamaño |
| --- | --- | ---: |
| `backend/backups/unicyber-local-20261118-173913.dump` | Custom de PostgreSQL | 112.643 bytes |
| `backend/backups/unicyber-local-20261118-173913.sql` | SQL plano | 434.470 bytes |

El respaldo custom incluye todo: esquema `public`, esquema
`prisma_contract`, datos, secuencias y metadatos. El respaldo plano sirve como
copia legible de recuperación.

La carpeta `backend/backups/` está ignorada por Git porque contiene datos
personales y hashes de contraseñas.

### Comandos usados

```bash
pg_dump "$LOCAL_DATABASE_URL" \
  --format=custom --no-owner --no-privileges \
  --file=backend/backups/unicyber-local-<fecha>.dump

pg_dump "$LOCAL_DATABASE_URL" \
  --format=plain --no-owner --no-privileges \
  --file=backend/backups/unicyber-local-<fecha>.sql
```

### Verificación del respaldo

El respaldo custom se restauró en una base temporal
`unicyber_restore_check_*`, creada solo para la comprobación:

```bash
createdb unicyber_restore_check
pg_restore --no-owner --no-privileges \
  --dbname "$RESTORE_DATABASE_URL" \
  backend/backups/unicyber-local-<fecha>.dump
```

Se compararon los conteos de todas las tablas de `public` y
`prisma_contract`. Coincidieron exactamente con el origen. La base temporal se
eliminó después. La base `unicyber` no se tocó.

## Exportación de datos

Se exportó únicamente el esquema `public`, en formato plano y sin propietarios:

```bash
pg_dump "$LOCAL_DATABASE_URL" \
  --data-only \
  --schema=public \
  --no-owner \
  --no-privileges \
  --file=backend/backups/unicyber-public-data-<fecha>.sql
```

Archivo generado:

```text
backend/backups/unicyber-public-data-20261118-174221.sql
```

El archivo contiene:

- 13 bloques `COPY` para las 13 tablas de aplicación.
- 12 llamadas `setval` para las secuencias de `public`.
- Ninguna referencia a `prisma_contract`.
- Ningún `TRUNCATE`, `DROP`, `DELETE` ni `ALTER`.

El orden de `COPY` respeta las dependencias de claves foráneas generado por
`pg_dump` (`course` antes de `module`, `module` antes de `lesson`, `user` antes
de `progress`, etc.).

## Restauración en Neon

Con el esquema ya creado y verificado:

```bash
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f backend/backups/unicyber-public-data-<fecha>.sql
```

Resultado real:

```text
COPY 13
COPY 8
COPY 23
COPY 5
COPY 40
COPY 118
COPY 9
COPY 2
COPY 38
COPY 25
COPY 1
COPY 16
COPY 14
```

Las 12 secuencias se restauraron con `setval`. No se insertó ningún dato de
prueba en la base local.

## Verificación posterior

### Conteos y contenido

Para cada tabla se calculó:

- `count(*)`.
- Un hash agregado de las filas normalizadas con `to_jsonb`, ordenadas por su
  clave primaria.

La normalización con `to_jsonb` evita falsos positivos por el orden físico de
las columnas. Todos los hashes coincidieron entre origen y destino.

| Tabla | Filas | Hash de contenido |
| --- | ---: | --- |
| `achievement` | 13 | `f677e670a6cd9f3953ffd9fb47e0f974` |
| `answerOption` | 118 | `bcd56543c21262074e180e7339fd214a` |
| `assessment` | 5 | `9fd39f83a564ad7003d40f1b06b528e2` |
| `assessmentAttempt` | 2 | `3e6ad31d202406b2d174663359701363` |
| `course` | 8 | `bc1ace569b4f42ede70073ad73307d27` |
| `lesson` | 38 | `4414d278567db1d147278dc2bd6cb133` |
| `lessonProgress` | 25 | `259774820c3d47c500c8c03b81de1804` |
| `module` | 23 | `0c1ee0ae3be1a91f8233420cb21dc4a9` |
| `passwordReset` | 1 | `2d9757532c8e59585ecb123076194f1c` |
| `question` | 40 | `c527aba98cff6e8bf5693de1e7230d06` |
| `questionResponse` | 16 | `48dee7c006f717546699e0d823ce92c3` |
| `user` | 9 | `925bbba80a6328c592778b8ea021c0d7` |
| `userAchievement` | 14 | `881933ca65ee3469e17828112778f074` |

### Autenticación

Se compararon específicamente los campos sensibles:

| Comprobación | Resultado |
| --- | --- |
| Hash agregado de `passwordHash` | Coincide |
| Hash agregado de correos | Coincide |
| Cantidad de usuarios | 9 en ambos |
| Formato de hashes | `scrypt$...`, preservado |
| `passwordChangedAt` | Preservado |

No se cambió ninguna contraseña ni ningún hash. La igualdad exacta de los
hashes garantiza que las credenciales existentes se comporten igual en Neon.

### Secuencias

| Secuencia | Último valor |
| --- | ---: |
| `achievement_id_seq` | 13 |
| `answerOption_id_seq` | 3118 |
| `assessmentAttempt_id_seq` | 95 |
| `assessment_id_seq` | 182 |
| `course_id_seq` | 235 |
| `lesson_id_seq` | 317 |
| `module_id_seq` | 327 |
| `passwordReset_id_seq` | 30 |
| `questionResponse_id_seq` | 1016 |
| `question_id_seq` | 1040 |
| `userAchievement_id_seq` | 252 |
| `user_id_seq` | 368 |

Todas coinciden con el origen. Los valores altos de algunas secuencias
provienen de pruebas históricas y se preservaron tal cual para evitar
reutilización de identificadores.

### Integridad referencial

Se ejecutaron 16 comprobaciones de huérfanos, una por clave foránea. Todas
devolvieron `0`. La restauración además se ejecutó con claves foráneas activas,
por lo que cualquier violación habría abortado el proceso.

### Esquema

| Comprobación | Origen | Neon |
| --- | ---: | ---: |
| Tablas en `public` | 13 | 13 |
| Índices en `public` | 39 | 39 |
| Restricciones en `public` | 132 | 132 |
| Enums en `public` | 0 | 0 |

Prisma verificó el marcador y el esquema en ambas bases:

```text
Database marker and schema match contract
```

## Prueba funcional contra Neon

Se inició el backend local apuntando a Neon y se ejecutó una prueba HTTP
controlada. Resultados:

| Endpoint | Resultado |
| --- | --- |
| `GET /api/health` | `200 ok` |
| `GET /api/health/database` | `200 connected` |
| `POST /api/auth/login` | `200`, cookie de sesión |
| `GET /api/auth/me` | `200` |
| `GET /api/users/me` | `200` |
| `GET /api/courses` | `200`, 4 cursos |
| `GET /api/achievements` | `200` |
| `GET /api/achievements/summary` | `200` |
| `POST /api/auth/logout` | `204` |

Para la prueba se usó un usuario temporal creado con el flujo real de registro.
Ese usuario se eliminó después:

- No tenía `lessonProgress`, `assessmentAttempt`, `questionResponse`,
  `userAchievement` ni `passwordReset`.
- Se borró solo ese registro.
- La secuencia `user_id_seq` se restauró a `max(id) = 368`.
- La base quedó con 9 usuarios y sin correos `neon-smoke-%`.

La prueba demuestra conectividad, autenticación, sesión y consultas reales
contra Neon. No demuestra una contraseña de un usuario original, porque no se
dispone de esas contraseñas; la igualdad exacta de los hashes es la evidencia
de preservación.

### Verificación a través de producción

También se probó el dominio público de Vercel, que reenvía `/api` a Render:

```text
https://unicyber-academy.vercel.app/api
```

Resultados:

| Endpoint | Resultado |
| --- | --- |
| `GET /api/health` | `200 ok` |
| `GET /api/health/database` | `200 connected` |
| `POST /api/auth/register` | `201` |
| `POST /api/auth/login` | `200` con cookie |
| `GET /api/auth/me` | `200` |
| `GET /api/courses` | `200` |
| `POST /api/auth/logout` | `204` |

El usuario temporal creado desde Vercel se encontró y eliminó en Neon
(`DELETE 1`), lo que confirma que Render está conectado a la base correcta.
Después de la limpieza quedaron 9 usuarios y la secuencia `user_id_seq` volvió
a `368`.

## Diferencias conocidas

### Orden físico de columnas

En `question` y `user`, el orden físico de columnas difiere entre la base local
y Neon:

- Local: columnas agregadas históricamente al final (`explanation`, `hint`,
  `passwordChangedAt`).
- Neon: columnas en orden alfabético porque la tabla se creó desde cero.

Los valores, tipos, restricciones e índices son idénticos. El ORM consulta por
nombre de columna, no por posición. No se reconstruyeron las tablas para
alterar el orden porque eso implicaría un riesgo innecesario.

### Metadatos de Prisma

La tabla `prisma_contract.ledger` local conserva cinco entradas históricas de
firmas/actualizaciones. Neon tiene una entrada de la migración
`20261118T2236_baseline`. Es una diferencia de metadatos internos, no de datos
de la aplicación.

## Recuperación

### Restaurar el respaldo local

Nunca restaurar sobre la base `unicyber` en uso. Crear una base temporal:

```bash
createdb unicyber_restore_check
pg_restore --no-owner --no-privileges \
  --dbname "$RESTORE_DATABASE_URL" \
  backend/backups/unicyber-local-<fecha>.dump
```

Verificar conteos y luego eliminar la base temporal. Si se necesita reemplazar
la base local, hacerlo solo con autorización explícita y con la aplicación
detenida.

### Recuperar Neon

Opciones, en orden de preferencia:

1. Restaurar la rama desde un snapshot o punto en el tiempo de Neon.
2. Crear una rama nueva, aplicar la migración y volver a importar el archivo
   `unicyber-public-data-*.sql`.
3. Si el esquema está bien pero faltan datos, volver a ejecutar únicamente la
   importación de datos.

No ejecutar `TRUNCATE`, `DROP SCHEMA` ni `migrate reset` como primer recurso.

## Limitaciones

- No se dispone de credenciales de Render ni de Vercel para leer logs o
  variables del dashboard; la cadena funcional sí se verificó con tráfico real.
- La autenticación se verificó con un usuario temporal y con igualdad de
  hashes, no con la contraseña de una cuenta original.
- El orden físico de columnas de `question` y `user` no es idéntico.
- Los metadatos `prisma_contract` no se copian; los genera Prisma en cada base.
