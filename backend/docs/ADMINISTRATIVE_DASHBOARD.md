# Panel administrativo y gestión de usuarios

## Acceso

Todas las rutas viven bajo `/api/admin` y aplican `requireAuth` y
`requireAdmin`. La autorización se verifica contra el rol persistido en la base
de datos; ocultar entradas en el frontend no sustituye esta comprobación.

El rol administrativo existente en el contrato es `ADMINISTRATIVE`. En la
interfaz se presenta como **Administrador**. No se introdujeron roles nuevos.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/admin/statistics` | Estadísticas generales y académicas. |
| `GET` | `/api/admin/users?search=` | Listado de usuarios con búsqueda opcional. |
| `PATCH` | `/api/admin/users/:userId` | Edita el nombre de usuario y/o el rol. |

## Estadísticas

`GET /api/admin/statistics` devuelve un único objeto `statistics` calculado con
las tablas existentes. No se generan datos ficticios.

### Resumen general

- `students.total`: usuarios con rol `STUDENT`.
- `students.active` / `students.disabled`: estudiantes por `status`.
- `courses.total`: todos los cursos.
- `courses.published`: cursos con `status = ACTIVE`.
- `courses.unpublished`: `courses.total - courses.published` (incluye `DRAFT` y
  `ARCHIVED`).
- `modules`: todos los registros de `Module`.
- `lessons.theory`: lecciones con `type = THEORY`.
- `lessons.laboratory`: lecciones con `type = LABORATORY`.

### Registros de estudiantes

- `registrations`: últimos 6 meses, agrupados por `User.createdAt`.
- Cada punto incluye `period` (`YYYY-MM`), `label` en español (por ejemplo
  `sep 2026`) y `count`.
- Los meses sin registros se devuelven con `count = 0`; no se inventan valores.
  El frontend muestra un estado vacío cuando todos los conteos son cero.

### Cursos con más estudiantes con progreso

No existe una tabla formal de inscripción. La métrica usa una relación real y
documentada: estudiantes con al menos una lección completada (`LessonProgress`)
en lecciones activas de módulos activos del curso.

- `topCourses`: hasta 5 cursos activos ordenados por esa cantidad.
- La interfaz la etiqueta explícitamente como **estudiantes con progreso**.

### Tasa de aprobación

Se usan únicamente evaluaciones finales (`Assessment.type = COURSE_FINAL`) de
cursos activos y sus `AssessmentAttempt`.

- `attemptedStudents`: cantidad de intentos finales de estudiantes, uno por
  estudiante y curso porque `AssessmentAttempt` es único por
  `(userId, assessmentId)`.
- `passedStudents`: intentos con `score >= 80`.
- `rate = round(passedStudents / attemptedStudents * 100)`; `0` si no hay
  intentos.

No se mezclan evaluaciones de módulo ni se cuentan intentos repetidos como
estudiantes distintos.

### Cursos completados

`completedCourses` cuenta pares únicos (estudiante, curso) que cumplen las
reglas de finalización ya establecidas:

1. Todas las lecciones activas de módulos activos del curso están completadas.
2. Existe un intento de la evaluación final del curso.
3. El puntaje del intento es mayor o igual a 80.

No basta con visitar lecciones: se exige la evaluación final aprobada.

### Evaluaciones presentadas

`assessmentAttempts` cuenta los registros `AssessmentAttempt` de evaluaciones
finales de cursos activos. En el flujo actual un intento se crea o actualiza al
enviar el examen, por lo que representa evaluaciones finales presentadas.

## Gestión de usuarios

### Listado

`GET /api/admin/users?search=` devuelve `{ users: [...] }` con:

`id`, `firstName`, `lastName`, `username`, `email`, `role`, `status`,
`createdAt`.

La búsqueda (opcional) coincide con nombre, apellido, nombre de usuario o
correo, sin distinguir mayúsculas.

### Edición

`PATCH /api/admin/users/:userId`

```json
{ "username": "nuevo_nombre", "role": "MENTOR" }
```

Reglas:

- `username`: 3 a 100 caracteres y único (`409 USERNAME_ALREADY_EXISTS`).
- `role`: debe ser uno de los valores existentes del contrato
  (`STUDENT`, `TEACHER`, `ADMINISTRATIVE`, `VISITOR`, `MENTOR`). Cualquier otro
  valor responde `400 INVALID_ROLE`.
- No se permite cambiar el propio rol (`400 SELF_ROLE_CHANGE`).
- No se permite quitar el rol al último administrador activo
  (`409 LAST_ADMIN`).

## Eliminación de usuarios

La eliminación de usuarios, tanto la autoeliminación como la eliminación desde
el panel, **no está disponible**. Se retiró para preservar la integridad de los
registros académicos y sus relaciones. Los administradores pueden editar nombre
de usuario y rol, pero no borrar cuentas.

## Verificación

Las pruebas de integración `backend/test/admin-dashboard.test.ts` comprueban:

- Rechazo de estudiantes en las rutas administrativas (`403`).
- Cálculo y estructura de las estadísticas para un administrador.
- Listado y búsqueda de usuarios.
- Edición de nombre de usuario y rol.
- Protección del cambio de rol propio.
- Ausencia de la ruta de autoeliminación (`DELETE /api/users/me` → `404`).
