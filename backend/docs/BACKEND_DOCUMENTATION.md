# UniCyber Academy — Documentación técnica del backend

| Campo | Valor |
|---|---|
| Fecha de elaboración | 2026-10-16 |
| Alcance | Carpeta `backend/` (snapshot recibido como `unicyber-academyGuiaEstructuraBackend.rar`) |
| Estado de la documentación | **Borrador verificado solo contra archivos.** Ninguna comprobación en ejecución (servidor, PostgreSQL, CLI) fue realizada por el autor de este documento |
| Proyecto | Prototipo web educativo de concientización en ciberseguridad — proyecto de grado de Ingeniería de Sistemas, Universidad del Valle, sede Tuluá (Colombia) |

> **Actualización (2026-10-19).** Se implementó y verificó la autenticación JWT y el subconjunto de frontend descrito en `docs/AUTH_INTEGRATION.md`. Las secciones 2, 3, 9, 13 y 15 describen el snapshot original (2026-10-16) y se conservan como referencia histórica; el estado vigente está en el apéndice §16. **Actualización posterior (2026-10-19):** el backend y el frontend quedaron separados en proyectos hermanos (`unicyber/backend/` y `unicyber/frontend/`); ver §17.

---

## Tabla de contenido

1. [Cómo leer este documento (niveles de evidencia)](#1-cómo-leer-este-documento-niveles-de-evidencia)
2. [Resumen del estado actual](#2-resumen-del-estado-actual)
3. [Arquitectura por capas](#3-arquitectura-por-capas)
4. [Tecnologías y versiones](#4-tecnologías-y-versiones)
5. [Estructura de carpetas y archivos](#5-estructura-de-carpetas-y-archivos)
6. [Configuración de Prisma 8](#6-configuración-de-prisma-8)
7. [PostgreSQL: esquema de datos y SQL](#7-postgresql-esquema-de-datos-y-sql)
8. [Decisiones de diseño del modelo de datos](#8-decisiones-de-diseño-del-modelo-de-datos)
9. [Servidor Express y endpoints](#9-servidor-express-y-endpoints)
10. [Variables de entorno y seguridad](#10-variables-de-entorno-y-seguridad)
11. [Comandos operativos](#11-comandos-operativos)
12. [Pruebas y estado verificado](#12-pruebas-y-estado-verificado)
13. [Funcionalidades futuras](#13-funcionalidades-futuras)
14. [Instrucciones para futuras IA y desarrolladores](#14-instrucciones-para-futuras-ia-y-desarrolladores)
15. [Limitaciones y pendientes](#15-limitaciones-y-pendientes)

---

## 1. Cómo leer este documento (niveles de evidencia)

Cada afirmación relevante lleva una de estas etiquetas:

| Etiqueta | Significado |
|---|---|
| **[V]** Implementado y verificado | Existe y se comprobó su funcionamiento directamente |
| **[A]** Implementado, sin verificación | Existe en los archivos; no se comprobó su ejecución |
| **[E]** Preparado estructuralmente | Existen carpetas, archivos o contratos, sin lógica |
| **[P]** Planificado | Decisión de arquitectura futura; no existe |
| **[?]** Pendiente de verificar | No hay evidencia suficiente |
| **[R]** Reportado por el usuario | Resultado que el usuario informó haber obtenido; no fue reproducido aquí |

**Procedencia de este documento.** Se analizaron los archivos del repositorio recibidos en un archivo `.rar`. Se extrajo el contenido del backend **excluyendo** las carpetas de skills de agentes (`.agents/`, `.claude/`, `.cursor/`, `.devin/`) y **sin extraer ni leer `.env`** (existe, 136 bytes; su contenido es secreto). El archivo no incluye `node_modules/`.

**No se tuvo acceso** a PostgreSQL, a una terminal con el entorno del proyecto ni a los comandos de Prisma/pnpm/Node del usuario. Por tanto, **ningún elemento de este documento tiene la etiqueta [V]**. Lo que aquí figura como "existente" proviene de la lectura de archivos ([A]/[E]) o de lo informado por el usuario ([R]).

---

## 2. Resumen del estado actual

| Área | Estado |
|---|---|
| Entorno (TypeScript, pnpm, ESM) | [A] Configurado |
| Conexión a PostgreSQL vía `@prisma/orm-postgres/runtime` | [A] Código presente (`src/prisma/db.ts`); funcionamiento [R] |
| Contrato Prisma con 10 modelos y 6 enums | [A] Declarado y emitido (`contract.json`, `contract.d.ts`) |
| Servidor Express con 3 rutas | [A] Código presente; pruebas [R] |
| Capas `application/`, `domain/`, `infrastructure/` | [E] Carpetas **vacías** |
| Autenticación, JWT, autorización por roles | [P] No existe |
| Casos de uso, controladores, reglas de negocio | [P] No existe |
| Pruebas automatizadas, lint | No configurados |
| Carpeta `dist/` | [A] **Desactualizada** respecto a `src/` (ver §15) |

---

## 3. Arquitectura por capas

### 3.1 Arquitectura objetivo (acordada)

```
┌──────────────────────────────────────────────┐
│ Presentación  — Frontend React (Vite)        │
└───────────────────────┬──────────────────────┘
                        │ HTTP / JSON
┌───────────────────────▼──────────────────────┐
│ Aplicación   — Node.js + Express             │
│  rutas/controladores, casos de uso, (JWT)    │
└───────────────────────┬──────────────────────┘
                        │ depende de abstracciones
┌───────────────────────▼──────────────────────┐
│ Dominio      — reglas y conceptos de negocio │
│  independiente de Express, UI y persistencia │
└───────────────────────▲──────────────────────┘
                        │ implementa
┌───────────────────────┴──────────────────────┐
│ Persistencia — PostgreSQL + Prisma 8         │
│  @prisma/orm-postgres/runtime + contrato     │
└──────────────────────────────────────────────┘
```

| Capa | Responsabilidad prevista | Dependencias permitidas | Dependencias a evitar |
|---|---|---|---|
| Presentación (React) | UI; consume servicios HTTP | API del backend | Acceso directo a la BD; lógica de negocio duplicada |
| Aplicación (Express) | Coordinar solicitudes HTTP, casos de uso, flujo; (futuro) autenticación JWT y autorización | Dominio, persistencia (a través de contratos) | Reglas de negocio embebidas en controladores |
| Dominio | Reglas y conceptos de negocio | Ninguna externa | Express, tipos HTTP, Prisma, detalles de SQL |
| Persistencia | Almacenar y consultar datos con PostgreSQL y el runtime de Prisma | Contrato Prisma, `db` | Lógica de negocio; conocimiento de HTTP |

### 3.2 Estado real frente a la arquitectura objetivo

- [E] `src/application/`, `src/domain/` y `src/infrastructure/` existen **pero están vacías**.
- [A] Hoy toda la lógica está en `src/server.ts`, que importa `db` directamente (rutas de salud). Esto es coherente con la etapa de preparación del entorno, no con la arquitectura objetivo final.
- [?] El mapeo exacto de qué va en `infrastructure/` frente a `src/prisma/` no está definido en los archivos; `src/prisma/` actúa hoy como módulo de persistencia.
- [P] Autenticación JWT, autorización por roles, controladores, casos de uso y reglas de negocio se implementarán posteriormente.

---

## 4. Tecnologías y versiones

Fuentes: `package.json` (declarado), `pnpm-lock.yaml` (resuelto), y antecedentes del usuario ([R]). **No se pudo verificar ninguna versión instalada** (no hay `node_modules` ni terminal del proyecto).

### 4.1 Dependencias del backend

| Tecnología | Declarado (`package.json`) | Resuelto (`pnpm-lock.yaml`) | Instalado/comprobado | Propósito |
|---|---|---|---|---|
| pnpm | `pnpm@12.4.2` (`packageManager` y `devEngines`) | `12.4.2` | [?] | Gestor de paquetes |
| Express | `^5.2.1` | `5.2.1` | [?] | Servidor HTTP |
| `@types/express` | `^5.0.6` | `5.0.6` | [?] | Tipos de Express |
| `@prisma/orm-postgres` | `8.0.0-rc.11` (exacta) | `8.0.0-rc.11` | [?] | Runtime y config del ORM para PostgreSQL |
| `prisma` (CLI) | `8.0.0-rc.15` (exacta) | `8.0.0-rc.15` | [R] `8.0.0-rc.15` | CLI: `contract emit`, `db verify`, etc. |
| `@prisma/cli-engine` | `0.4.0` (exacta) | `0.4.0` | [?] | Motor del CLI de Prisma 8 |
| dotenv | `^17.4.2` | `17.4.2` | [?] | Carga de `.env` |
| TypeScript | `^7.0.2` | `7.0.2` | [?] | Tipado y compilación |
| tsx | `^4.23.13` | `4.23.13` | [?] | Ejecución de TypeScript en desarrollo (`watch`) |
| `@types/node` | `^24.13.3` | `24.13.5` | [?] | Tipos de Node.js |

Observación: `@prisma/orm-postgres` (rc.11) y el CLI `prisma` (rc.15) tienen **números de release candidate distintos**. Está declarado así en `package.json` y resuelto igual en el lockfile; no se evaluó si es intencional. No debe alinearse sin una decisión explícita (ver §14).

### 4.2 Entorno de desarrollo (antecedentes, sin re-verificar)

| Elemento | Valor | Estado |
|---|---|---|
| Sistema operativo | Windows 11 | [R] |
| Node.js | `v24.21.0` | [R] |
| PostgreSQL | `18.6` | [R] |
| Base de datos local | `unicyber` | [R] |
| Prisma CLI | `8.0.0-rc.15` | [R]; coincide con `package.json` |
| Requisito de PostgreSQL según plantilla del proyecto | `>= 15` (comentario en `.env.example`, `prisma-8.md`) | [A] |

### 4.3 Frontend (contexto)

React y Vite son parte de la arquitectura acordada. **El repositorio recibido no contiene el frontend**, por lo que no hay evidencia de sus versiones: [?].

---

## 5. Estructura de carpetas y archivos

Árbol real del `backend/` recibido (sin las carpetas de skills ni `node_modules`):

```
backend/
├── .env                      # secreto; existe, NO documentado ni leído
├── .env.example              # plantilla sin secretos
├── .gitattributes            # marca archivos generados (linguist-generated)
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── prisma.config.ts          # configuración del CLI (raíz del backend)
├── prisma-8.md               # guía de Prisma 8 generada por la plantilla
├── tsconfig.json
├── dist/                     # salida de `tsc` (desactualizada, ver §15)
│   ├── server.js(.map)
│   └── prisma/
│       ├── contract.json
│       └── db.js(.map)
├── migrations/               # estado de contrato/migraciones de Prisma 8
│   ├── app/refs/db.json
│   └── snapshots/1fd3815e…2172/
│       ├── contract.json
│       └── contract.d.ts
└── src/
    ├── server.ts             # servidor Express
    ├── test-db.ts            # script manual de prueba de BD
    ├── application/          # VACÍA
    ├── domain/               # VACÍA
    ├── infrastructure/       # VACÍA
    └── prisma/
        ├── contract.prisma   # FUENTE del contrato (se edita a mano)
        ├── contract.json     # GENERADO
        ├── contract.d.ts     # GENERADO
        └── db.ts             # cliente `db`
```

Además existen `.agents/`, `.claude/`, `.cursor/` y `.devin/` con skills de Prisma 8 (no analizadas en detalle; ver nota en §11 sobre `postinstall`).

### 5.1 Clasificación

| Tipo | Archivos |
|---|---|
| Funcionales | `src/server.ts`, `src/prisma/db.ts` |
| Configuración | `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `prisma.config.ts`, `.env.example`, `.gitattributes` |
| Fuente del esquema | `src/prisma/contract.prisma` |
| Generados por Prisma | `src/prisma/contract.json`, `src/prisma/contract.d.ts`, `migrations/snapshots/*`, `migrations/app/refs/db.json` |
| Generados por `tsc` | `dist/**` |
| Prueba manual | `src/test-db.ts` |
| Documentación de plantilla | `prisma-8.md` |
| Preparados para desarrollo futuro (vacíos) | `src/application/`, `src/domain/`, `src/infrastructure/` |

### 5.2 `src/prisma/db.ts` y su consumo

```ts
import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});
```

- Exporta el único cliente `db`, tipado con `Contract`.
- Carga `.env` (`dotenv/config`) como efecto lateral, por lo que cualquier módulo que lo importe tiene `DATABASE_URL` disponible.
- Se consume con `import { db } from './prisma/db'` y consultas del estilo `db.orm.public.<Modelo>`. Uso existente: `db.orm.public.User.all()` en `server.ts` y `test-db.ts`.
- [?] Al importar sin extensión (`'./prisma/db'`), la ejecución con `tsx` lo resuelve; ver §15 sobre `pnpm start`.

---

## 6. Configuración de Prisma 8

El proyecto usa una **versión preliminar (release candidate) de Prisma 8** con sistema de **contratos**. Su configuración **no equivale** a la de Prisma 5/6/7 (no hay `schema.prisma`, `prisma generate` ni `PrismaClient`). No sustituirla por instrucciones genéricas de otras versiones.

### 6.1 `prisma.config.ts` [A]

```ts
/// <reference types="node" />

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

- Indica al CLI dónde está el contrato y cómo conectarse (`DATABASE_URL`).
- Debe permanecer en la **raíz del backend** (no dentro de `src/`). No está incluido en `tsconfig.json` (`include: ["src/**/*.ts"]`).
- `/// <reference types="node" />` aporta los tipos de `process` a este archivo.
- Nota: `prisma-8.md` (plantilla) importa `definePrismaConfig` desde `@prisma/cli-engine`, mientras que el archivo real lo importa desde `prisma/config`. **Manda el archivo real.**

### 6.2 Archivos del contrato

| Archivo | Rol | Edición |
|---|---|---|
| `src/prisma/contract.prisma` | Definición del esquema (modelos, enums, relaciones). Contiene el comentario `// use prisma-8` | **Manual** (con autorización, ver §14) |
| `src/prisma/contract.json` | Contrato compilado: storage (tablas, columnas, FKs, índices, checks), dominio (roots/modelos), capacidades, hashes. Lo consume el runtime | Generado — **no editar** |
| `src/prisma/contract.d.ts` | Tipos TypeScript del contrato (autocompletado y verificación). 106 983 bytes | Generado — **no editar** |
| `src/prisma/db.ts` | Cliente de runtime | Manual |
| `migrations/snapshots/<hash>/` | Copia del contrato asociada al hash de storage | Generado |
| `migrations/app/refs/db.json` | Referencia: `hash` = `1fd3815e…2172`, `invariants: []` | Generado |

Hashes observados en `contract.json`:

- `storageHash`: `1fd3815e02989b0d4c9a59d3f615e490776c2ad62422db5ed523fd3e44572172`
- `executionHash`: `b437da8b8ac02e87ef9ddde1d30e75b781ef71fbf2ae601187963ab145ed8bac`
- `profileHash`: `3916f444a8a17ad749191acf9e08dad97d1a327b88c2f1d45d12f240296aa8b2`

El `storageHash` coincide con el hash de `migrations/app/refs/db.json` y con el nombre de la carpeta de snapshot, y `src/prisma/contract.d.ts` es idéntico byte a byte al del snapshot. Esto es **consistente** con el antecedente [R] de que `db verify` coincidió, pero no lo reemplaza.

`contract.json` declara `targetFamily: "sql"`, `target: "postgres"` y capacidades (`returning`, `lateral`, `jsonAgg`, `distinctOn`, `enums`, `checkConstraint`, etc.).

### 6.3 Flujo contrato → tipos → PostgreSQL

```
contract.prisma ──(prisma contract emit)──► contract.json + contract.d.ts
                                                  │
                       db.ts (runtime) ◄──────────┘   consulta tipada
                                                  │
              prisma db verify ─── compara hash/esquema con PostgreSQL
```

1. Se edita `contract.prisma` (solo con autorización).
2. `pnpm exec prisma contract emit` regenera `contract.json` y `contract.d.ts`.
3. `pnpm exec prisma db verify` comprueba que el marcador y el esquema de la BD coincidan con el contrato.

Ambos comandos fueron ejecutados por el usuario con resultado satisfactorio [R]. **No se repitieron aquí.**

### 6.4 `@prisma/orm-postgres/runtime` y `/config`

- `.../runtime` (default export `postgres`): fábrica del cliente, usada en `db.ts` con `{ contractJson, url }`.
- `.../config` (`defineConfig`): usada en `prisma.config.ts` para declarar `contract` y `db.connection`.

### 6.5 Comandos de Prisma

| Comando | Origen | Estado |
|---|---|---|
| `pnpm exec prisma contract emit` (también `pnpm contract:emit`) | `package.json` / uso del usuario | [R] ejecutado |
| `pnpm exec prisma db verify` | uso del usuario | [R] ejecutado |
| `pnpm prisma db init`, `pnpm prisma migration status` | listados en `prisma-8.md` (plantilla) | Disponibles según la plantilla, [?] no verificados. **No ejecutar `db init`** (la BD ya está inicializada) |
| `prisma skills sync` | script `postinstall` | [A] Se ejecuta tras `pnpm install`; `|| exit 0` evita que falle la instalación. Probable origen de las carpetas de skills (inferencia) |

---

## 7. PostgreSQL: esquema de datos y SQL

> **Procedencia.** Toda esta sección proviene de `contract.prisma` y de `contract.json` (sección `storage`), **no de PostgreSQL**. **No se pudo comparar con la base `unicyber` real** ([?]). El SQL de §7.4 es una **reconstrucción derivada del contrato, no DDL verificado**.

### 7.1 Observaciones generales sobre el esquema

- Todas las tablas están en el esquema `public` (`kind: postgres-schema`, id `public`).
- **Nombres de tabla y columna en lowerCamelCase** (`"user"`, `"lessonProgress"`, `"firstName"`). Deben ir **entre comillas dobles** en SQL. `"user"` y `"order"` son además palabras reservadas de PostgreSQL.
- **Los enums NO son tipos `ENUM` de PostgreSQL.** En `contract.json` cada columna enum tiene `nativeType: text` y una restricción `CHECK (col IN (...))`; los valores se definen como `valueSet`.
- Todas las FK usan `ON DELETE RESTRICT` y `ON UPDATE CASCADE`.
- Todas las columnas de fecha son `timestamptz` (con zona horaria). El codec es `pg/timestamptz-string@1`: el runtime las maneja como cadenas (ver `contract.d.ts` para el tipo exacto: [?]).
- Las columnas `updatedAt` **no tienen `DEFAULT` en la base de datos**; el valor lo genera el runtime (ver §7.5).
- Los nombres de las restricciones `PRIMARY KEY`, `UNIQUE` y `FOREIGN KEY` **no aparecen en el contrato**: [?] (los índices y los `CHECK` sí tienen nombre).

### 7.2 Enums (valores confirmados en el contrato)

| Enum | Valores | Columnas que lo usan |
|---|---|---|
| `UserRole` | `STUDENT`, `TEACHER`, `ADMINISTRATIVE`, `VISITOR`, `MENTOR` | `user.role` |
| `UserStatus` | `ACTIVE`, `DISABLED` | `user.status` (default `ACTIVE`) |
| `ContentStatus` | `DRAFT`, `ACTIVE`, `ARCHIVED` | `course`, `module`, `lesson`, `assessment`, `question` `.status` (default `DRAFT`) |
| `LessonType` | `THEORY`, `LABORATORY` | `lesson.type` |
| `AssessmentType` | `MODULE`, `COURSE_FINAL` | `assessment.type` |
| `QuestionType` | `MULTIPLE_CHOICE`, `TRUE_FALSE` | `question.type` |

Nota: `AnswerOption`, `LessonProgress`, `AssessmentAttempt` y `QuestionResponse` no tienen columna `status`.

### 7.3 Inventario de tablas

Leyenda: **PK** clave primaria · **UQ** único · **FK** foránea · Tipo = tipo PostgreSQL según `contract.json` (tipo Prisma entre paréntesis).

#### `user` (modelo `User`) — cuentas de usuario

| Columna | Tipo | NULL | Default | Notas |
|---|---|---|---|---|
| `id` | `int4` (Int) | No | `autoincrement()` | **PK** |
| `firstName` | `text` (String) | No | — | |
| `lastName` | `text` (String) | No | — | |
| `email` | `text` (String) | No | — | **UQ** |
| `passwordHash` | `text` (String) | No | — | Almacena hash, no contraseña; el algoritmo no está definido ([P]) |
| `role` | `text` (UserRole) | No | — | CHECK `user_role_check_cb8771da` |
| `status` | `text` (UserStatus) | No | `'ACTIVE'` | CHECK `user_status_check_56c81764` |
| `createdAt` | `timestamptz` | No | `now()` | |
| `updatedAt` | `timestamptz` | No | — (generado por runtime) | |

Relaciones: 1–N con `lessonProgress` y `assessmentAttempt`. Índices adicionales: ninguno (el UQ de `email` implica su índice).

#### `course` (modelo `Course`) — cursos

| Columna | Tipo | NULL | Default | Notas |
|---|---|---|---|---|
| `id` | `int4` | No | `autoincrement()` | **PK** |
| `title` | `text` | No | — | |
| `description` | `text` | **Sí** | — | |
| `status` | `text` (ContentStatus) | No | `'DRAFT'` | CHECK `course_status_check_29df5947` |
| `createdAt` | `timestamptz` | No | `now()` | |
| `updatedAt` | `timestamptz` | No | — (runtime) | |

Relaciones: 1–N con `module`; 1–1 opcional con `assessment` (relación `CourseFinalAssessment`, FK en `assessment.courseId`).

#### `module` (modelo `Module`) — módulos de un curso

| Columna | Tipo | NULL | Default | Notas |
|---|---|---|---|---|
| `id` | `int4` | No | `autoincrement()` | **PK** |
| `courseId` | `int4` | No | — | **FK** → `course.id` (RESTRICT / CASCADE) |
| `title` | `text` | No | — | |
| `description` | `text` | Sí | — | |
| `order` | `int4` | No | — | |
| `status` | `text` (ContentStatus) | No | `'DRAFT'` | CHECK `module_status_check_29df5947` |
| `createdAt` | `timestamptz` | No | `now()` | |
| `updatedAt` | `timestamptz` | No | — (runtime) | |

UQ: `(courseId, order)`. Índice: `module_courseId_idx_12f72d2a` sobre `courseId`. Relaciones: N–1 `course`; 1–N `lesson`; 1–1 opcional `assessment` (`ModuleAssessment`).

#### `lesson` (modelo `Lesson`) — lecciones

| Columna | Tipo | NULL | Default | Notas |
|---|---|---|---|---|
| `id` | `int4` | No | `autoincrement()` | **PK** |
| `moduleId` | `int4` | No | — | **FK** → `module.id` (RESTRICT / CASCADE) |
| `title` | `text` | No | — | |
| `content` | `json` (Json) | No | — | Tipo `json` (no `jsonb`) |
| `type` | `text` (LessonType) | No | — | CHECK `lesson_type_check_d5e378c7` |
| `order` | `int4` | No | — | |
| `status` | `text` (ContentStatus) | No | `'DRAFT'` | CHECK `lesson_status_check_29df5947` |
| `createdAt` | `timestamptz` | No | `now()` | |
| `updatedAt` | `timestamptz` | No | — (runtime) | |

UQ: `(moduleId, order)`. Índice: `lesson_moduleId_idx_04fe188b` sobre `moduleId`. Relaciones: N–1 `module`; 1–N `lessonProgress`.

#### `assessment` (modelo `Assessment`) — evaluaciones

| Columna | Tipo | NULL | Default | Notas |
|---|---|---|---|---|
| `id` | `int4` | No | `autoincrement()` | **PK** |
| `title` | `text` | No | — | |
| `description` | `text` | Sí | — | |
| `type` | `text` (AssessmentType) | No | — | CHECK `assessment_type_check_4796802b` |
| `moduleId` | `int4` | **Sí** | — | **UQ**; **FK** → `module.id` (RESTRICT / CASCADE) |
| `courseId` | `int4` | **Sí** | — | **UQ**; **FK** → `course.id` (RESTRICT / CASCADE) |
| `status` | `text` (ContentStatus) | No | `'DRAFT'` | CHECK `assessment_status_check_29df5947` |
| `createdAt` | `timestamptz` | No | `now()` | |
| `updatedAt` | `timestamptz` | No | — (runtime) | |

Sin índices adicionales (los UQ aportan los suyos). Relaciones: 1–N `question`; 1–N `assessmentAttempt`. **No existe un `CHECK` que obligue a que `type = MODULE` implique `moduleId` no nulo (ni `COURSE_FINAL` → `courseId`)**; esa coherencia no está garantizada por la BD y queda para la lógica de negocio ([P]).

#### `question` (modelo `Question`) — preguntas

| Columna | Tipo | NULL | Default | Notas |
|---|---|---|---|---|
| `id` | `int4` | No | `autoincrement()` | **PK** |
| `assessmentId` | `int4` | No | — | **FK** → `assessment.id` (RESTRICT / CASCADE) |
| `statement` | `text` | No | — | Enunciado |
| `type` | `text` (QuestionType) | No | — | CHECK `question_type_check_9cc3fa43` |
| `order` | `int4` | No | — | |
| `status` | `text` (ContentStatus) | No | `'DRAFT'` | CHECK `question_status_check_29df5947` |
| `createdAt` | `timestamptz` | No | `now()` | |
| `updatedAt` | `timestamptz` | No | — (runtime) | |

UQ: `(assessmentId, order)`. Índice: `question_assessmentId_idx_1fe05216`. Relaciones: N–1 `assessment`; 1–N `answerOption`; 1–N `questionResponse`.

#### `answerOption` (modelo `AnswerOption`) — opciones de respuesta

| Columna | Tipo | NULL | Default | Notas |
|---|---|---|---|---|
| `id` | `int4` | No | `autoincrement()` | **PK** |
| `questionId` | `int4` | No | — | **FK** → `question.id` (RESTRICT / CASCADE) |
| `text` | `text` | No | — | |
| `isCorrect` | `bool` | No | `false` | |
| `order` | `int4` | No | — | |

UQ: `(questionId, order)`. Índice: `answerOption_questionId_idx_fdb42076`. Sin `createdAt`/`updatedAt`/`status`. No hay restricción que limite a una sola opción correcta por pregunta.

#### `lessonProgress` (modelo `LessonProgress`) — lecciones completadas por usuario

| Columna | Tipo | NULL | Default | Notas |
|---|---|---|---|---|
| `userId` | `int4` | No | — | **PK (compuesta)**; **FK** → `user.id` (RESTRICT / CASCADE) |
| `lessonId` | `int4` | No | — | **PK (compuesta)**; **FK** → `lesson.id` (RESTRICT / CASCADE) |
| `completedAt` | `timestamptz` | No | `now()` | |

PK: `(userId, lessonId)`. Índices: `lessonProgress_lessonId_idx_e358970d`, `lessonProgress_userId_idx_a489d58a`. La existencia de la fila representa "lección completada".

#### `assessmentAttempt` (modelo `AssessmentAttempt`) — intentos de evaluación

| Columna | Tipo | NULL | Default | Notas |
|---|---|---|---|---|
| `id` | `int4` | No | `autoincrement()` | **PK** |
| `userId` | `int4` | No | — | **FK** → `user.id` (RESTRICT / CASCADE) |
| `assessmentId` | `int4` | No | — | **FK** → `assessment.id` (RESTRICT / CASCADE) |
| `score` | `numeric` (Decimal) | No | — | Sin precisión/escala declaradas |
| `completedAt` | `timestamptz` | No | `now()` | |

UQ: `(userId, assessmentId)`. Índices: `assessmentAttempt_assessmentId_idx_1fe05216`, `assessmentAttempt_userId_idx_a489d58a`. No hay columna de aprobado/no aprobado ni `CHECK` sobre `score`.

#### `questionResponse` (modelo `QuestionResponse`) — respuestas dadas en un intento

| Columna | Tipo | NULL | Default | Notas |
|---|---|---|---|---|
| `id` | `int4` | No | `autoincrement()` | **PK** |
| `attemptId` | `int4` | No | — | **FK** → `assessmentAttempt.id` (RESTRICT / CASCADE) |
| `questionId` | `int4` | No | — | **FK** → `question.id` (RESTRICT / CASCADE) |
| `answerOptionId` | `int4` | No | — | **FK** → `answerOption.id` (RESTRICT / CASCADE) |

UQ: `(attemptId, questionId)`. Índices: `questionResponse_answerOptionId_idx_8aacf1d1`, `questionResponse_attemptId_idx_94f50eb9`, `questionResponse_questionId_idx_fdb42076`. No hay restricción que obligue a que `answerOptionId` pertenezca a `questionId`; esa coherencia depende de la lógica de aplicación.

#### Diagrama de relaciones (texto)

```
user ─┬─< lessonProgress >── lesson >── module >── course
      └─< assessmentAttempt >── assessment ──(0..1)── module
                │                    │      └──(0..1)── course
                └─< questionResponse │
                       │   │         └─< question ─< answerOption
                       │   └───────────────┘             │
                       └───────────────────────────────── ┘
```

### 7.4 SQL reconstruido a partir del contrato (NO verificado contra PostgreSQL)

> Reconstrucción manual desde `contract.json`. Puntos no verificables: (a) cómo se materializa `autoincrement()` (se usa `GENERATED BY DEFAULT AS IDENTITY`; podría ser `SERIAL`); (b) nombres de restricciones PK/UQ/FK (se omiten); (c) orden y sintaxis exacta del DDL emitido por Prisma. **No ejecutar este script en la base existente.**

```sql
-- Esquema: public. Identificadores entre comillas dobles (lowerCamelCase / palabras reservadas).

CREATE TABLE "user" (
  "id"           integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  "firstName"    text        NOT NULL,
  "lastName"     text        NOT NULL,
  "email"        text        NOT NULL UNIQUE,
  "passwordHash" text        NOT NULL,
  "role"         text        NOT NULL,
  "status"       text        NOT NULL DEFAULT 'ACTIVE',
  "createdAt"    timestamptz NOT NULL DEFAULT now(),
  "updatedAt"    timestamptz NOT NULL,
  CONSTRAINT "user_role_check_cb8771da"   CHECK ("role"   IN ('STUDENT','TEACHER','ADMINISTRATIVE','VISITOR','MENTOR')),
  CONSTRAINT "user_status_check_56c81764" CHECK ("status" IN ('ACTIVE','DISABLED'))
);

CREATE TABLE "course" (
  "id"          integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  "title"       text        NOT NULL,
  "description" text,
  "status"      text        NOT NULL DEFAULT 'DRAFT',
  "createdAt"   timestamptz NOT NULL DEFAULT now(),
  "updatedAt"   timestamptz NOT NULL,
  CONSTRAINT "course_status_check_29df5947" CHECK ("status" IN ('DRAFT','ACTIVE','ARCHIVED'))
);

CREATE TABLE "module" (
  "id"          integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  "courseId"    integer     NOT NULL,
  "title"       text        NOT NULL,
  "description" text,
  "order"       integer     NOT NULL,
  "status"      text        NOT NULL DEFAULT 'DRAFT',
  "createdAt"   timestamptz NOT NULL DEFAULT now(),
  "updatedAt"   timestamptz NOT NULL,
  FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE ("courseId", "order"),
  CONSTRAINT "module_status_check_29df5947" CHECK ("status" IN ('DRAFT','ACTIVE','ARCHIVED'))
);
CREATE INDEX "module_courseId_idx_12f72d2a" ON "module" ("courseId");

CREATE TABLE "lesson" (
  "id"        integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  "moduleId"  integer     NOT NULL,
  "title"     text        NOT NULL,
  "content"   json        NOT NULL,
  "type"      text        NOT NULL,
  "order"     integer     NOT NULL,
  "status"    text        NOT NULL DEFAULT 'DRAFT',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL,
  FOREIGN KEY ("moduleId") REFERENCES "module"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE ("moduleId", "order"),
  CONSTRAINT "lesson_type_check_d5e378c7"   CHECK ("type"   IN ('THEORY','LABORATORY')),
  CONSTRAINT "lesson_status_check_29df5947" CHECK ("status" IN ('DRAFT','ACTIVE','ARCHIVED'))
);
CREATE INDEX "lesson_moduleId_idx_04fe188b" ON "lesson" ("moduleId");

CREATE TABLE "assessment" (
  "id"          integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  "title"       text        NOT NULL,
  "description" text,
  "type"        text        NOT NULL,
  "moduleId"    integer     UNIQUE,
  "courseId"    integer     UNIQUE,
  "status"      text        NOT NULL DEFAULT 'DRAFT',
  "createdAt"   timestamptz NOT NULL DEFAULT now(),
  "updatedAt"   timestamptz NOT NULL,
  FOREIGN KEY ("moduleId") REFERENCES "module"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "assessment_type_check_4796802b"   CHECK ("type"   IN ('MODULE','COURSE_FINAL')),
  CONSTRAINT "assessment_status_check_29df5947" CHECK ("status" IN ('DRAFT','ACTIVE','ARCHIVED'))
);

CREATE TABLE "question" (
  "id"           integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  "assessmentId" integer     NOT NULL,
  "statement"    text        NOT NULL,
  "type"         text        NOT NULL,
  "order"        integer     NOT NULL,
  "status"       text        NOT NULL DEFAULT 'DRAFT',
  "createdAt"    timestamptz NOT NULL DEFAULT now(),
  "updatedAt"    timestamptz NOT NULL,
  FOREIGN KEY ("assessmentId") REFERENCES "assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE ("assessmentId", "order"),
  CONSTRAINT "question_type_check_9cc3fa43"   CHECK ("type"   IN ('MULTIPLE_CHOICE','TRUE_FALSE')),
  CONSTRAINT "question_status_check_29df5947" CHECK ("status" IN ('DRAFT','ACTIVE','ARCHIVED'))
);
CREATE INDEX "question_assessmentId_idx_1fe05216" ON "question" ("assessmentId");

CREATE TABLE "answerOption" (
  "id"         integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  "questionId" integer NOT NULL,
  "text"       text    NOT NULL,
  "isCorrect"  boolean NOT NULL DEFAULT false,
  "order"      integer NOT NULL,
  FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE ("questionId", "order")
);
CREATE INDEX "answerOption_questionId_idx_fdb42076" ON "answerOption" ("questionId");

CREATE TABLE "lessonProgress" (
  "userId"      integer     NOT NULL,
  "lessonId"    integer     NOT NULL,
  "completedAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("userId", "lessonId"),
  FOREIGN KEY ("userId")   REFERENCES "user"("id")   ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "lessonProgress_lessonId_idx_e358970d" ON "lessonProgress" ("lessonId");
CREATE INDEX "lessonProgress_userId_idx_a489d58a"   ON "lessonProgress" ("userId");

CREATE TABLE "assessmentAttempt" (
  "id"           integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  "userId"       integer     NOT NULL,
  "assessmentId" integer     NOT NULL,
  "score"        numeric     NOT NULL,
  "completedAt"  timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY ("userId")       REFERENCES "user"("id")       ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("assessmentId") REFERENCES "assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE ("userId", "assessmentId")
);
CREATE INDEX "assessmentAttempt_assessmentId_idx_1fe05216" ON "assessmentAttempt" ("assessmentId");
CREATE INDEX "assessmentAttempt_userId_idx_a489d58a"       ON "assessmentAttempt" ("userId");

CREATE TABLE "questionResponse" (
  "id"             integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  "attemptId"      integer NOT NULL,
  "questionId"     integer NOT NULL,
  "answerOptionId" integer NOT NULL,
  FOREIGN KEY ("attemptId")      REFERENCES "assessmentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("questionId")     REFERENCES "question"("id")          ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("answerOptionId") REFERENCES "answerOption"("id")      ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE ("attemptId", "questionId")
);
CREATE INDEX "questionResponse_answerOptionId_idx_8aacf1d1" ON "questionResponse" ("answerOptionId");
CREATE INDEX "questionResponse_attemptId_idx_94f50eb9"      ON "questionResponse" ("attemptId");
CREATE INDEX "questionResponse_questionId_idx_fdb42076"     ON "questionResponse" ("questionId");
```

### 7.5 `updatedAt` generado por el runtime

`contract.json` (`execution.mutations.defaults`) declara, para las tablas `user`, `course`, `module`, `lesson`, `assessment` y `question`, un generador `timestampNow` aplicado **al crear y al actualizar** la columna `updatedAt`. Como la columna es `NOT NULL` y sin `DEFAULT` SQL, una inserción SQL directa (fuera del runtime) **debe suministrar `updatedAt`**. Este comportamiento se verificó solo en el contrato [A].

### 7.6 Comandos `psql` para inspeccionar la estructura (solo lectura)

Ejecutar contra la base `unicyber` (sin incluir contraseñas en el historial/commits):

```text
\c unicyber
\dt public.*                      -- tablas
\d+ "user"                        -- columnas, índices, FKs y checks de una tabla (repetir por tabla)
\di public.*                      -- índices
\dT+                              -- tipos (se espera que NO haya tipos enum propios)
\dn                               -- esquemas
```

```sql
-- Columnas, tipos, nulabilidad y defaults
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Restricciones (PK, UQ, FK, CHECK) con su definición
SELECT conrelid::regclass AS tabla, conname, contype, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, contype, conname;

-- Índices
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Enums nativos (se espera 0 filas)
SELECT t.typname, e.enumlabel
FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
ORDER BY t.typname, e.enumsortorder;

-- Versión del servidor
SELECT version();
```

---

## 8. Decisiones de diseño del modelo de datos

Verificadas contra `contract.prisma`/`contract.json` (existencia en el contrato; no en la BD real).

| Decisión | ¿Confirmada en el contrato? | Consecuencia para el desarrollo |
|---|---|---|
| Identificadores enteros autoincrementales | **Sí**, `Int @id @default(autoincrement())` en todos los modelos salvo `LessonProgress` | Los IDs los asigna la BD; no generar IDs en la aplicación |
| Fechas con zona horaria | **Sí**, `timestamptz` (`TimestamptzString`) | Se manejan como cadenas en el runtime; no asumir `Date` sin revisar `contract.d.ts` [?] |
| `Lesson.content` en JSON | **Sí**, tipo `json` | Estructura interna no validada por la BD; la forma del JSON la definirá la aplicación [P] |
| `Restrict` en borrados | **Sí**, `onDelete: Restrict` en **todas** las FK (con `onUpdate: Cascade`) | No hay borrado en cascada: para eliminar un padre hay que haber eliminado antes los hijos. El ciclo de vida de contenido se apoya en `status` (`DRAFT/ACTIVE/ARCHIVED`) |
| `LessonProgress` con clave compuesta | **Sí**, `@@id([userId, lessonId])` | Un registro por usuario y lección; no hay `id` propio |
| `AssessmentAttempt` único por usuario y evaluación | **Sí**, `@@unique([userId, assessmentId])` | El modelo admite **un solo intento** por usuario y evaluación; reintentos requerirían cambiar el contrato (decisión que no corresponde a esta tarea) |
| Aprobación calculada desde la puntuación, umbral `70` | **No está en el contrato ni en el código.** Solo existe `score` (numeric); no hay campo `approved` | Regla **[P]**: debe implementarse en la lógica de negocio (dominio) |
| Progreso y finalización de cursos calculados, no almacenados | **Sí**: no existen columnas redundantes de progreso/finalización en ningún modelo | Hay que derivarlos con consultas (lecciones completadas / lecciones totales, evaluaciones aprobadas) [P] |

Otras características del modelo que el desarrollo posterior debe respetar:

- Cada `Module` y cada `Course` pueden tener **como máximo una** `Assessment` (`moduleId` y `courseId` son únicos en `assessment`).
- `order` es único dentro de su padre (`module` por curso, `lesson` por módulo, `question` por evaluación, `answerOption` por pregunta).
- La BD no garantiza coherencia entre `Assessment.type` y qué FK está informada, ni que `QuestionResponse.answerOptionId` pertenezca a `questionId`, ni una única opción correcta por pregunta. Son reglas de dominio pendientes.
- `passwordHash` indica que el sistema guardará hashes; el algoritmo y la política no están definidos.

---

## 9. Servidor Express y endpoints

Archivo: `src/server.ts` [A] (880 bytes). Comportamiento leído del código:

- `express.json()` como único middleware.
- Puerto: `Number(process.env['PORT'] ?? 3000)` (por defecto **3000**). Si `PORT` no es numérico resulta `NaN`.
- Al iniciar escribe: `UniCyber backend ejecutándose en http://localhost:${PORT}`.
- `server.ts` no importa `dotenv` directamente; las variables se cargan porque importa `./prisma/db`, que sí lo hace.
- No hay middleware de errores global, CORS, autenticación ni validación de entrada.

| Método y ruta | Respuesta exitosa | Errores |
|---|---|---|
| `GET /` | `200` `{"message":"UniCyber backend funcionando"}` | — |
| `GET /api/health` | `200` `{"status":"ok","service":"UniCyber backend"}` | — |
| `GET /api/health/database` | `200` `{"status":"ok","database":"connected"}` | `500` `{"status":"error","database":"disconnected"}` si la consulta falla (el error se registra con `console.error`) |

`/api/health/database` ejecuta `await db.orm.public.User.all()` (consulta ORM sobre `user`); el resultado se descarta.

Estado: rutas [A] en código; el antecedente [R] indica que las tres respondieron correctamente en `localhost:3000`. **No existen** rutas de registro, login, logout, cursos, evaluaciones ni otras.

---

## 10. Variables de entorno y seguridad

| Variable | Uso en código | Obligatoria | Formato |
|---|---|---|---|
| `DATABASE_URL` | `db.ts` y `prisma.config.ts` (con `!`: se asume definida) | Sí | `postgresql://<usuario>:<contraseña>@<host>:<puerto>/<base>` |
| `PORT` | `server.ts` | No (por defecto `3000`) | Entero |

`.env.example` contiene:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

Prácticas documentadas:

- `.env` contiene secretos y **no debe versionarse**; `.env.example` es la plantilla pública sin secretos.
- [?] **El snapshot recibido no incluye `.gitignore`**, por lo que no se pudo comprobar que `.env` esté excluido de Git. Verificarlo en el repositorio real.
- Nunca copiar valores reales de `.env`, contraseñas, tokens ni claves privadas a documentación, commits o conversaciones.
- Esta documentación no reproduce ningún valor de `.env`.

---

## 11. Comandos operativos

Todos desde **PowerShell**, en la carpeta `backend/`. Los scripts provienen de `package.json`.

| Objetivo | Comando | Resultado esperado | Estado |
|---|---|---|---|
| Instalar dependencias | `pnpm install` | Instala dependencias y ejecuta `postinstall` (`prisma skills sync`, tolerante a fallos) | [A] |
| Desarrollo con recarga | `pnpm dev` (`tsx watch src/server.ts`) | Servidor en `http://localhost:3000` | [A] |
| Ejecutar un archivo TS | `pnpm exec tsx src/test-db.ts` | Imprime "Conexión con PostgreSQL: correcta" y el número de usuarios; código de salida `1` si falla | [A] |
| Comprobar tipos sin emitir | `pnpm exec tsc --noEmit` | Sin salida si no hay errores | [A] (no hay script dedicado) |
| Compilar | `pnpm build` (`tsc`) | Genera `dist/` (`rootDir ./src`, `outDir ./dist`) | [A] |
| Ejecutar compilado | `pnpm start` (`node dist/server.js`) | Ver advertencia en §15 | [?] |
| Generar contrato | `pnpm exec prisma contract emit` o `pnpm contract:emit` | Regenera `contract.json` y `contract.d.ts` | [R] |
| Verificar contrato vs. BD | `pnpm exec prisma db verify` | Indica que marcador y esquema coinciden con el contrato | [R] |
| Versiones | `node -v`; `pnpm -v`; `pnpm exec prisma --version`; `pnpm exec tsc -v`; `psql --version` | Versiones instaladas | Pendiente de ejecutar |
| Probar rutas | `curl http://localhost:3000/api/health` (en PowerShell: `curl.exe` o `Invoke-RestMethod`) | JSON de §9 | [A] |

- **Lint:** no hay script ni configuración de lint.
- **Pruebas automatizadas:** no existen (no hay script `test`).
- **No ejecutar** `prisma db init`, migraciones ni cambios de esquema salvo decisión expresa.
- `src/test-db.ts` [A]: script manual vigente que consulta `db.orm.public.User.all()` e imprime la cantidad de usuarios. No es una prueba automatizada.

---

## 12. Pruebas y estado verificado

**Verificado directamente en esta tarea:** únicamente la lectura de archivos y la coherencia interna entre ellos (hashes y archivos de snapshot, ver §6.2). Nada en ejecución.

**Antecedentes reportados por el usuario [R] (no reproducidos aquí):**

| Antecedente | Evidencia disponible en archivos |
|---|---|
| El servicio de PostgreSQL estaba en ejecución | Ninguna |
| La conexión del backend a PostgreSQL funcionó | Código de `db.ts` presente |
| `db.orm.public.User.all()` se ejecutó correctamente | `test-db.ts` y `server.ts` lo usan |
| Express respondió en `localhost:3000` | Código de `server.ts` presente |
| `/`, `/api/health` y `/api/health/database` respondieron correctamente | Las tres rutas están en el código |
| `prisma contract emit` se ejecutó correctamente | `contract.json`/`contract.d.ts` generados |
| `prisma db verify` indicó coincidencia con el contrato | El hash de `migrations/app/refs/db.json` coincide con el `storageHash` del contrato |

No hay evidencia de pruebas automatizadas.

---

## 13. Funcionalidades futuras

Nada de lo siguiente existe todavía [P]; describe el comportamiento previsto a nivel de arquitectura y modelo de datos.

- **Usuarios y roles:** el contrato define `STUDENT`, `TEACHER`, `ADMINISTRATIVE`, `VISITOR` y `MENTOR`, y estado `ACTIVE`/`DISABLED`.
- **Contenido:** `Course` → `Module` → `Lesson` (`THEORY` o `LABORATORY`; el contenido en `json`). Laboratorios educativos **estáticos**.
- **Evaluaciones:** `Assessment` de módulo o final de curso, con `Question` (`MULTIPLE_CHOICE`/`TRUE_FALSE`) y `AnswerOption`.
- **Seguimiento:** `LessonProgress`, `AssessmentAttempt` y `QuestionResponse`; progreso y finalización calculados.
- **Seguridad:** autenticación JWT, autorización por roles.
- **Aplicación:** controladores, casos de uso y reglas de negocio en las capas `application/` y `domain/`, con acceso a datos en la capa de persistencia/infraestructura.
- Aprobación de evaluaciones: umbral de referencia `70` sobre `score`, a implementar en el dominio.

---

## 14. Instrucciones para futuras IA y desarrolladores

1. **Leer esta documentación** antes de modificar el backend.
2. **Respetar el contrato** `src/prisma/contract.prisma` y sus archivos generados (`contract.json`, `contract.d.ts`, `migrations/`).
3. **No recrear las tablas existentes.**
4. **No cambiar** nombres de modelos, tablas, columnas, enums ni relaciones sin autorización expresa.
5. **No actualizar Prisma** ni sustituir el sistema de contratos por otro flujo (`schema.prisma`, `prisma generate`, `PrismaClient`) sin una decisión explícita. Esto incluye no alinear las versiones `rc.11`/`rc.15` por iniciativa propia.
6. **Mantener la arquitectura por capas** (§3).
7. **Mantener las reglas de negocio independientes** de Express y PostgreSQL cuando corresponda.
8. **No implementar** funcionalidades fuera del alcance acordado.
9. **No inventar** campos, relaciones, endpoints ni requisitos.
10. **Proteger las variables de entorno**; nunca exponer secretos.
11. **Ejecutar verificaciones** tras cualquier cambio relevante (`pnpm exec tsc --noEmit`, y si se toca el contrato: `contract emit` y `db verify`).
12. **Separar** claramente lo implementado de lo pendiente en cualquier actualización de este documento.

Reglas adicionales derivadas del análisis:

- No editar a mano `contract.json` ni `contract.d.ts`.
- Las consultas usan `db.orm.public.<Modelo>`; el esquema es `public`.
- Insertar filas fuera del runtime exige suministrar `updatedAt` (§7.5).
- No usar instrucciones de `prisma-8.md` que contradigan los archivos reales (p. ej. el origen de `definePrismaConfig`).

---

## 15. Limitaciones y pendientes

### 15.1 No se pudo verificar

- Existencia y estado real de la base `unicyber` y su correspondencia con el contrato (sin acceso a PostgreSQL). El SQL de §7.4 es **derivado del contrato**.
- Nombres de restricciones PK/UQ/FK, y si `autoincrement()` es `IDENTITY` o `SERIAL`.
- Versiones realmente instaladas de Node, pnpm, TypeScript, Prisma, PostgreSQL (solo se conocen las declaradas, las resueltas en el lockfile y las reportadas).
- Ejecución de servidor, rutas, `contract emit`, `db verify` (solo antecedentes [R]).
- Tipo TypeScript exacto de las columnas `timestamptz` en `contract.d.ts`.
- Que `.env` esté excluido de Git (no hay `.gitignore` en el snapshot).
- El frontend (React/Vite): no está en el repositorio recibido.

### 15.2 Hallazgos en el estado actual

- **`dist/` está desactualizada.** `dist/server.js` solo define `GET /` con `PORT = 3000` fijo (sin `/api/health` ni `/api/health/database`, sin `db`), y `dist/prisma/contract.json` (16 793 bytes) no coincide con `src/prisma/contract.json` (77 794 bytes). Se regenera con `pnpm build`.
- **Posible fallo de `pnpm start` con el código actual [?].** `package.json` es `"type": "module"` y `tsconfig.json` usa `"module": "preserve"`, que **conserva los especificadores tal como están escritos**. `src/server.ts` importa `'./prisma/db'` sin extensión; Node en ESM normalmente exige la extensión en imports relativos. Con `tsx` (`pnpm dev`) funciona; el comportamiento de `node dist/server.js` tras compilar **no se comprobó**. Es un pendiente de verificación, no un cambio solicitado.
- `/api/health/database` carga todos los usuarios (`User.all()`) solo para comprobar la conexión; es el comportamiento implementado.
- Versiones distintas de `@prisma/orm-postgres` (`rc.11`) y `prisma` (`rc.15`): documentado, sin evaluar.

### 15.3 Pendientes de implementación (no son errores de configuración)

- Autenticación JWT y autorización por roles.
- Controladores, casos de uso y reglas de negocio (incluida la aprobación con umbral `70`).
- Contenido de `src/application/`, `src/domain/` e `src/infrastructure/` (vacías).
- Pruebas automatizadas y lint.
- Validación coherente de reglas que la BD no garantiza (§8).
- Algoritmo de hash de contraseñas.
- Manejo de errores global, CORS y validación de entrada.

---

## 16. Apéndice: actualización 2026-10-19 — autenticación JWT y frontend

Estado **implementado y verificado** en la máquina de trabajo (Node 24, pnpm 12, PostgreSQL activo). El detalle de endpoints, seguridad y flujo está en `docs/AUTH_INTEGRATION.md`.

- [V] `pnpm exec tsc --noEmit` pasa en `backend/` y en `frontend/`.
- [V] `pnpm build` (backend) y `vite build` (frontend) generan artefactos.
- [V] `pnpm start` (`node dist/server.js`) arranca: los imports relativos del backend ahora usan extensión `.js`, lo que resolvió el riesgo de §15.2 sobre ESM.
- [V] Las rutas existentes `GET /`, `GET /api/health` y `GET /api/health/database` conservan su respuesta.
- [V] `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` y `POST /api/auth/logout` funcionan contra PostgreSQL real; los mensajes de validación están en español.
- [V] La cookie `unicyber_session` es `HttpOnly`, `SameSite=Lax`, `Path=/` y `Secure` con `NODE_ENV=production`.
- [V] Registro, login, error de credenciales, correo duplicado, persistencia tras recarga, cierre de sesión y ruta `/dashboard` protegida verificados en navegador (build de producción y Vite con proxy).
- [V] `.env` contiene `JWT_SECRET` (64 bytes aleatorios) y `.env.example` documenta las variables; `.gitignore` excluye `.env`.
- [P] Siguen pendientes autorización por roles, revocación de tokens, límite de intentos, recuperación de contraseña, pruebas automatizadas y lint. El logout elimina la cookie; al ser JWT sin estado, un token robado sigue siendo válido hasta su expiración.

---

## 17. Apéndice: separación de frontend y backend (2026-10-19)

Se corrigió la estructura física del proyecto para que el backend y el
frontend sean proyectos hermanos dentro de un workspace de pnpm:

```text
unicyber/
├── backend/           # API Express + Prisma (este documento)
├── frontend/          # React + Vite (subconjunto de autenticación)
├── package.json       # scripts de coordinación del workspace
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── README.md
```

La carpeta `unicyber-academyGuiaDiseñoFrontendd/` (prototipo original) se
conserva sin modificaciones.

### Cambios de configuración

- `pnpm-workspace.yaml` se movió a la raíz con `packages: [backend, frontend]`.
- `pnpm-lock.yaml` se movió a la raíz; los importadores pasaron de `.` y
  `frontend` a `backend` y `frontend`, conservando las versiones resueltas.
- `backend/src/app.ts` resuelve el build del frontend como
  `../../frontend/dist` tanto desde `src/` (tsx) como desde `dist/`
  (producción), sin depender del directorio de trabajo.
- El `.gitignore` de la raíz cubre `node_modules`, `backend/dist`,
  `frontend/dist` y `.env`; el `.gitignore` del backend ya no menciona
  `frontend/`.
- No se modificaron endpoints, payloads, respuestas, cookie, modelo `User`,
  contrato de Prisma ni variables de entorno.

### Comandos (desde la raíz `unicyber/`)

| Tarea | Comando |
|---|---|
| Instalar dependencias | `pnpm install` |
| Backend | `pnpm dev` |
| Frontend (Vite) | `pnpm dev:web` |
| Typecheck backend | `pnpm typecheck` |
| Typecheck frontend | `pnpm typecheck:web` |
| Typecheck ambos | `pnpm typecheck:all` |
| Build backend | `pnpm build` → `backend/dist/` |
| Build frontend | `pnpm build:web` → `frontend/dist/` |
| Build ambos | `pnpm build:all` |
| Producción | `pnpm start` → <http://localhost:3000> |

Los scripts previos de `backend/` se conservan (`pnpm dev`, `pnpm dev:web`,
`pnpm typecheck:all`, `pnpm build:all`, etc.). El frontend también se puede
iniciar desde `frontend/` con `pnpm dev`.

### Verificación ejecutada

- [V] `pnpm install` en la raíz resolvió los tres importadores del workspace
  (raíz, `backend`, `frontend`) sin cambiar las versiones resueltas.
- [V] `pnpm typecheck:all` pasó (backend + frontend).
- [V] `pnpm build:all` generó `backend/dist/` y `frontend/dist/`.
- [V] `pnpm start` desde la raíz sirvió `GET /`, `GET /api/health`,
  `GET /api/health/database`, la SPA en `/login`, `/register` y `/dashboard`, y
  el 404 JSON de `/api/*`.
- [V] Registro, correo duplicado, validación, credenciales incorrectas, login,
  `/api/auth/me`, logout y token inválido verificados contra PostgreSQL real,
  tanto en producción como a través del proxy de Vite (`5173` → `3000`).
- [V] Flujo de navegador: registro, login, persistencia de sesión tras recarga,
  `/dashboard` protegido, cierre de sesión y redirección a `/login` sin sesión.
- [V] La cookie `unicyber_session` conserva `HttpOnly`, `SameSite=Lax`,
  `Path=/` y `Max-Age` alineado con el JWT; `Secure` solo se activa en
  producción.

---

*Fin del documento. Para mejorar su estado de verificación: ejecutar los comandos de §7.6 y §11 en el entorno del proyecto y actualizar las etiquetas [?]/[R] con los resultados.*
