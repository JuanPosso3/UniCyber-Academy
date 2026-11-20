# Arquitectura de base de datos

## Resumen

UniCyber usa un único contrato de datos de Prisma ORM 8 para PostgreSQL. El
backend Express no usa `@prisma/client` ni `schema.prisma`: usa el contrato
`src/prisma/contract.prisma`, sus artefactos emitidos `contract.json` y
`contract.d.ts`, y el runtime `@prisma/orm-postgres/runtime` a través de
`src/prisma/db.ts`.

La misma arquitectura funciona contra PostgreSQL local y contra Neon. No hay
configuraciones paralelas, ORM alternativo ni SQL manual para crear el esquema.

## Versiones verificadas

| Componente | Versión |
| --- | --- |
| Node.js | 24.21.0 |
| pnpm | 12.4.2 |
| Prisma CLI | 8.0.0-rc.15 |
| `@prisma/orm-postgres` | 8.0.0-rc.11 |
| PostgreSQL local | 18.6 |
| PostgreSQL en Neon | 18.7 |
| `psql` / `pg_dump` local | 18.6 |

PostgreSQL 15 o superior es obligatorio. La versión local y la de Neon cumplen
ese requisito.

## Archivos principales

```text
backend/
├── prisma.config.ts
├── migrations/
│   ├── app/
│   │   ├── refs/db.json
│   │   └── 20261118T2236_baseline/
│   └── snapshots/
│       └── <hash-de-almacenamiento>/
│           ├── contract.json
│           └── contract.d.ts
└── src/prisma/
    ├── contract.prisma
    ├── contract.json
    ├── contract.d.ts
    ├── db.ts
    └── seed-academic-content.ts
```

- `contract.prisma` es la fuente canónica editable.
- `contract.json` y `contract.d.ts` son artefactos generados. No se editan a
  mano.
- `db.ts` crea el cliente tipado con `contractJson` y `DATABASE_URL`.
- `migrations/snapshots/` es el almacén de contratos ya emitidos, identificado
  por hash.
- `migrations/app/` contiene los paquetes de migración y la referencia `db`.

## Configuración de Prisma ORM 8

`backend/prisma.config.ts` conserva la configuración del proyecto:

```typescript
import 'dotenv/config';
import { definePrismaConfig } from 'prisma/config';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

export default definePrismaConfig({
  orm: ormConfig({
    contract: './src/prisma/contract.prisma',
    db: {
      connection: process.env['DATABASE_URL']!,
    },
  }),
});
```

Prisma ORM 8 usa una sola conexión (`db.connection`) para CLI y runtime. No
existe en esta versión un `directUrl` separado equivalente al de Prisma 6/7.
Por eso la producción usa la conexión **directa** de Neon, no la conexión
pooled, para que las migraciones y la aplicación compartan una configuración
compatible.

## Runtime

`backend/src/prisma/db.ts`:

```typescript
import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});
```

Las consultas se escriben con `db.orm.public.<Model>` y las relaciones se
resuelven con el contrato. Los servicios de autenticación, cursos, lecciones,
evaluaciones, logros y administración reutilizan este mismo cliente.

## Modelo de datos

El contrato canónico contiene 13 modelos:

- `User`
- `Course`
- `Module`
- `Lesson`
- `LessonProgress`
- `Assessment`
- `AssessmentAttempt`
- `Question`
- `AnswerOption`
- `QuestionResponse`
- `Achievement`
- `UserAchievement`
- `PasswordReset`

Los roles (`STUDENT`, `TEACHER`, `ADMINISTRATIVE`, `VISITOR`, `MENTOR`) y los
estados se representan con columnas `String` y restricciones `CHECK`, no con
tipos `enum` de PostgreSQL. La base de producción tiene **0 enums** en el
esquema `public`.

## Esquemas de PostgreSQL

| Esquema | Contenido | Origen |
| --- | --- | --- |
| `public` | 13 tablas de la aplicación | Contrato y migraciones |
| `prisma_contract` | `marker`, `ledger`, `contract` | Herramienta de Prisma ORM 8 |

`prisma_contract` es metadato interno de Prisma. No forma parte de los datos
académicos y no se transfiere con el volcado de datos de la aplicación.

### Tablas de aplicación

| Tabla | Filas locales verificadas |
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

## Ambientes

### Desarrollo local

- PostgreSQL local, base `unicyber`.
- `DATABASE_URL` en `backend/.env`.
- Las pruebas de integración usan la base local, salvo que se indique otra
  `DATABASE_URL`.

### Producción

- Neon, proyecto `little-wind-13359085`.
- Organización `org-super-pine-33914094`.
- Rama `production`.
- Base de datos `neondb`, rol `neondb_owner`.
- `DATABASE_URL` se configura como variable de entorno en Render. Nunca se
  escribe en el repositorio.

Ver `NEON_CONFIGURATION.md` y `PRODUCTION_DATABASE_DEPLOYMENT.md`.

## Reglas de integridad

- No se ejecuta `prisma migrate reset`.
- No se elimina ni se sobrescribe la base local.
- No se crean tablas con SQL manual.
- No se usa sincronización destructiva de esquema.
- Los cambios de esquema se hacen con `contract emit`, `migration plan` y
  `db migrate`.
- Los datos existentes se transfieren después de crear el esquema, nunca como
  sustituto de la migración.
- No se eliminan cuentas de usuario: los registros académicos dependen de
  ellas.

## Comandos de verificación

Desde `backend/`:

```bash
pnpm db:check
pnpm db:verify
pnpm exec prisma migration graph
pnpm exec prisma migration list
```

Para verificar una base concreta sin cambiar `DATABASE_URL`:

```bash
pnpm exec prisma db verify --db "$DATABASE_URL"
```

El resultado esperado es:

```text
Database marker and schema match contract
```

## Documentación relacionada

- `PRISMA_ORM_8_MIGRATIONS.md`: historial, grafo, referencias y flujo de
  cambios.
- `NEON_CONFIGURATION.md`: proyecto, rama, conexión y SSL.
- `DATABASE_DATA_MIGRATION.md`: respaldo, transferencia y verificación.
- `PRODUCTION_DATABASE_DEPLOYMENT.md`: Render, orden de despliegue y
  recuperación.
