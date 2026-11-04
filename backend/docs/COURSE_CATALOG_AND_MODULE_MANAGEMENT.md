# Catálogo de cursos y administración de módulos — backend

Implementación del **2026-10-21**. Complementa `docs/AUTH_INTEGRATION.md` y la
documentación histórica del backend.

## 1. Alcance

Se implementó:

- Catálogo de cursos publicados para usuarios autenticados.
- Detalle de un curso publicado con sus módulos publicados.
- Listado administrativo de cursos, con estado y cantidad de módulos.
- Creación y edición de cursos.
- Publicación y archivado de cursos.
- Creación y edición de módulos.
- Publicación y archivado de módulos.
- Reordenamiento de módulos dentro de un curso.

No se implementaron lecciones, evaluaciones, laboratorios, certificados,
gamificación, contenido con IA, eliminación destructiva de cursos ni
restauración de contenido archivado.

## 2. Modelo de datos y migraciones

No fue necesario modificar el contrato Prisma ni crear migraciones. La
funcionalidad utiliza los modelos existentes:

- `Course`: `title`, `description`, `status`, `createdAt`, `updatedAt`.
- `Module`: `courseId`, `title`, `description`, `order`, `status`,
  `createdAt`, `updatedAt`.

`ContentStatus` ya contenía `DRAFT`, `ACTIVE` y `ARCHIVED`. Las restricciones
existentes de unicidad de `Module(courseId, order)` se respetan mediante
transacciones al reordenar.

No se eliminaron ni recrearon tablas, columnas, datos o usuarios.

## 3. Roles y autorización

El contrato histórico conserva cinco valores en `UserRole`. La aplicación
define únicamente dos roles efectivos:

| Rol efectivo | Valor persistido | Acceso |
|---|---|---|
| Estudiante | `STUDENT`, o cualquier valor no administrativo existente | Catálogo y detalle de cursos publicados |
| Administrador | `ADMINISTRATIVE` | Catálogo y administración de cursos/módulos |

`ADMINISTRATIVE` es el valor persistido que ya existía para el rol
administrativo. No se agregó un rol nuevo ni se modificó el enum. El registro
público continúa creando únicamente usuarios `STUDENT`.

La autorización nunca depende de datos enviados por el cliente:

- `requireAuth` valida la cookie JWT y recarga el usuario desde PostgreSQL.
- `requireAdmin` comprueba el rol recargado antes de cada ruta administrativa.
- Todas las rutas de `/api/courses` y `/api/admin/courses` requieren sesión.
- Un usuario autenticado sin rol administrativo recibe `403 FORBIDDEN`.

## 4. Reglas de disponibilidad

- El catálogo solo devuelve cursos con estado `ACTIVE`.
- El detalle de curso solo responde si el curso está `ACTIVE`; en otro caso
  devuelve `404 COURSE_NOT_AVAILABLE`.
- El detalle y el listado de módulos para estudiantes solo incluyen módulos
  `ACTIVE`.
- La cantidad de módulos del catálogo para estudiantes cuenta únicamente
  módulos `ACTIVE`.
- Un curso archivado no aparece en el catálogo ni puede abrirse desde las rutas
  de estudiante, aunque sus módulos sigan existiendo.
- Un módulo publicado dentro de un curso en borrador tampoco se muestra al
  estudiante, porque primero se exige que el curso esté publicado.

## 5. Transiciones de estado

Las transiciones se validan en el backend mediante `domain/content.ts`.

| Estado actual | Estado solicitado | Permitido |
|---|---|---|
| `DRAFT` | `ACTIVE` | Sí |
| `DRAFT` | `ARCHIVED` | Sí |
| `ACTIVE` | `ARCHIVED` | Sí |
| Cualquier estado | El mismo estado | No (`409`) |
| `ARCHIVED` | Cualquier estado | No (`409`) |
| `ACTIVE` | `DRAFT` | No (`409`) |

No se inventó un flujo de restauración porque no formaba parte del alcance. Un
contenido archivado conserva sus datos y puede consultarse desde administración,
pero no cambia de estado desde la API actual.

## 6. Endpoints de estudiante

Base: `/api/courses`. Todos requieren cookie de sesión.

| Método | Ruta | Éxito | Errores relevantes |
|---|---|---|---|
| `GET` | `/` | `200 { courses: CourseSummary[] }` | `401` |
| `GET` | `/:courseId` | `200 { course: CourseDetail }` | `400` id inválido, `401`, `404 COURSE_NOT_AVAILABLE` |
| `GET` | `/:courseId/modules` | `200 { modules: ModuleSummary[] }` | `400`, `401`, `404 COURSE_NOT_AVAILABLE` |

`CourseSummary`:

```json
{
  "id": 1,
  "title": "Fundamentos de redes",
  "description": "Descripción opcional",
  "status": "ACTIVE",
  "moduleCount": 2,
  "createdAt": "2026-10-21T...",
  "updatedAt": "2026-10-21T..."
}
```

`CourseDetail` es `CourseSummary` más `modules`. `ModuleSummary` contiene `id`,
`courseId`, `title`, `description`, `order`, `status`, `createdAt` y
`updatedAt`.

## 7. Endpoints administrativos

Base: `/api/admin/courses`. Todos requieren sesión y rol administrativo.

| Método | Ruta | Cuerpo | Éxito |
|---|---|---|---|
| `GET` | `/` | — | `200 { courses }` |
| `POST` | `/` | `{ title, description? }` | `201 { course }` |
| `GET` | `/:courseId` | — | `200 { course }` con todos los módulos |
| `PATCH` | `/:courseId` | `{ title?, description? }` | `200 { course }` |
| `PATCH` | `/:courseId/status` | `{ status }` | `200 { course }` |
| `GET` | `/:courseId/modules` | — | `200 { course: { id, title, status }, modules }` |
| `POST` | `/:courseId/modules` | `{ title, description? }` | `201 { module }` |
| `GET` | `/:courseId/modules/:moduleId` | — | `200 { module }` |
| `PATCH` | `/:courseId/modules/:moduleId` | `{ title?, description? }` | `200 { module }` |
| `PATCH` | `/:courseId/modules/:moduleId/status` | `{ status }` | `200 { module }` |
| `PATCH` | `/:courseId/modules/:moduleId/order` | `{ direction: "up" \| "down" }` | `200 { modules }` |

Observaciones:

- Crear un curso siempre produce `DRAFT`, aunque el cuerpo intente enviar
  `status`. El estado se cambia únicamente por la ruta `/status`.
- Crear un módulo siempre produce `DRAFT` y lo coloca al final del curso.
- El curso debe existir y el módulo debe pertenecer a ese curso.
- No se permite crear, editar, reordenar ni cambiar el estado de módulos de un
  curso archivado (`409 COURSE_ARCHIVED`).
- Al archivar un curso no se eliminan sus módulos ni otros registros
  relacionados.
- Un curso archivado todavía puede editar su título y descripción desde
  administración.

## 8. Validación

Validación aplicada en el servidor:

- `title`: obligatorio, recortado, máximo 200 caracteres.
- `description`: opcional, recortada, se guarda como `null` si queda vacía,
  máximo 2000 caracteres.
- `status`: debe ser `DRAFT`, `ACTIVE` o `ARCHIVED`.
- `direction`: debe ser `up` o `down`.
- Los identificadores de ruta deben ser enteros positivos.

Formato de error uniforme:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos.",
    "fields": {
      "title": "Este campo es obligatorio."
    }
  }
}
```

Códigos principales: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`,
`COURSE_NOT_FOUND`, `COURSE_NOT_AVAILABLE`, `MODULE_NOT_FOUND`,
`INVALID_STATUS_TRANSITION`, `COURSE_ARCHIVED`, `MODULE_ORDER_BOUNDARY`.

## 9. Orden de módulos

- Al crear un módulo se calcula el siguiente `order` dentro de una transacción.
- El reordenamiento intercambia dos posiciones dentro de una transacción.
- Se usa una posición temporal negativa para no violar la restricción única
  `(courseId, order)` durante el intercambio.
- Si una transacción falla, PostgreSQL revierte el cambio.
- Los módulos archivados conservan su posición histórica; no se eliminan ni se
  compacta el orden de forma destructiva.

## 10. Archivos principales

- `src/domain/content.ts`: estados y transiciones.
- `src/domain/user.ts`: rol administrativo efectivo.
- `src/infrastructure/http/admin.middleware.ts`: autorización administrativa.
- `src/application/courses/course.routes.ts`: rutas de estudiante.
- `src/application/courses/admin-course.routes.ts`: rutas administrativas.
- `src/application/courses/course.controller.ts`: validación HTTP y respuestas.
- `src/application/courses/course.service.ts`: consultas y reglas de negocio.
- `src/application/courses/course.validation.ts`: validación de cuerpos.
- `src/application/courses/course.types.ts`: contratos internos.
- `src/app.ts`: montaje de `/api/courses` y `/api/admin/courses`.

## 11. Pruebas

Se agregó una prueba de integración con el runner nativo de Node y `tsx`, sin
dependencias nuevas:

```bash
pnpm test
```

La prueba crea usuarios y un curso temporales, ejerce las rutas HTTP reales y
verifica:

- rechazo de estudiante en rutas administrativas;
- validación de título vacío;
- curso en borrador oculto para estudiantes;
- publicación de curso y módulos;
- módulos en borrador excluidos del detalle y del conteo del catálogo;
- orden inicial y reordenamiento;
- módulo archivado oculto para estudiantes;
- curso archivado oculto y detalle no disponible;
- bloqueo de módulos nuevos en curso archivado;
- rechazo de restauración de curso archivado.

Al finalizar, elimina los datos temporales y conserva los usuarios y cursos
preexistentes.

## 12. Limitaciones conocidas

- No existe restauración de cursos o módulos archivados.
- No existe eliminación física desde la API, por diseño.
- No hay paginación ni búsqueda del lado del servidor; el catálogo y la lista
  administrativa están pensados para el volumen actual del prototipo.
- Los roles heredados del contrato no se eliminaron para no romper datos
  existentes. Solo `ADMINISTRATIVE` recibe permisos administrativos.
- No se implementaron lecciones ni otros contenidos dentro de los módulos.
