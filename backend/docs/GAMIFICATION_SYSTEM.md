# UniCyber Academy — Sistema de Gamificación (Backend)

## Resumen

Este documento describe el sistema de reconocimiento basado en logros y medallas implementado en el backend de UniCyber Academy.

El sistema motiva a los estudiantes mediante el otorgamiento automático de **logros persistentes** vinculados a su progreso académico. No se introducen puntos de experiencia (XP), niveles, rachas diarias, tablas de clasificación ni recompensas económicas.

## Catálogo de logros (13 iniciales)

El catálogo se almacena en la tabla `achievement` y se inicializa mediante el seed académico. Incluye:

### Medallas de curso (5)

Una medalla exclusiva por cada uno de los cinco cursos académicos. Se otorga solo al completar el curso (todas las lecciones + evaluación final aprobada con ≥ 80 %).

| Código | Nombre | Curso |
|---|---|---|
| `PHISHING_COURSE_COMPLETED` | Detector de engaños | Phishing y simulaciones de ataque |
| `PASSWORDS_COURSE_COMPLETED` | Guardián de credenciales | Gestión de contraseñas y autenticación |
| `INCIDENT_RESPONSE_COURSE_COMPLETED` | Respondedor digital | Respuesta a incidentes de seguridad |
| `WIFI_SECURITY_COURSE_COMPLETED` | Explorador de redes | Seguridad en redes WiFi |
| `EMERGING_THREATS_COURSE_COMPLETED` | Vigilante de nuevas amenazas | Amenazas emergentes |

### Rangos de aprendizaje (3)

Acumulativos y basados en la cantidad de cursos completados. No se reemplazan entre sí.

| Código | Nombre | Requisito | Icono |
|---|---|---|---|
| `BASIC_LEARNER` | Aprendiz básico | 2 cursos | Bronce |
| `INTERMEDIATE_LEARNER` | Aprendiz intermedio | 3 cursos | Plata |
| `ADVANCED_LEARNER` | Aprendiz avanzado | 5 cursos | Oro |

### Logros complementarios (5)

| Código | Nombre | Requisito |
|---|---|---|
| `FIRST_STEPS` | Primeros pasos | Completar al menos una lección |
| `FIRST_MODULE_COMPLETED` | Módulo superado | Completar un módulo |
| `FIRST_LAB_COMPLETED` | Manos a la obra | Completar un laboratorio |
| `COURSE_MEDAL_COLLECTOR` | Coleccionista | Obtener las 5 medallas de curso |
| `UNICYBER_EXPERT` | Experto UniCyber | 5 medallas + 3 rangos + 3 complementarios previos |

## Esquema de base de datos

Se agregaron dos tablas al contrato Prisma (`contract.prisma`), aplicadas de forma aditiva mediante `pnpm prisma contract emit` + `pnpm prisma db init`:

### `achievement` (catálogo)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | int4 | PK, autogenerado |
| `code` | text | Único, estable, en inglés |
| `name` | text | Nombre visible (español) |
| `description` | text | Descripción (español) |
| `category` | text | `COURSE_MEDAL`, `LEARNING_RANK`, `COMPLEMENTARY` |
| `icon` | text | Identificador estable del ícono/medalla |
| `condition` | text? | Requisito estructurado (JSON) de referencia |
| `status` | text | `ACTIVE`, `DRAFT`, `ARCHIVED` |
| `order` | int4 | Orden de presentación |
| `createdAt`, `updatedAt` | timestamptz | Convención del proyecto |

### `userAchievement` (logros obtenidos)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | int4 | PK, autogenerado |
| `userId` | int4 | FK → `user.id` |
| `achievementId` | int4 | FK → `achievement.id` |
| `earnedAt` | timestamptz | Fecha y hora de obtención |
| `notifiedAt` | timestamptz? | Fecha en que se mostró la notificación (null = pendiente) |

### Integridad

- `UNIQUE (userId, achievementId)`: impide otorgar el mismo logro dos veces a una persona.
- FK a `user` y `achievement` con `ON DELETE RESTRICT`: no se eliminan en cascada.
- Índices en `userId` y `achievementId` para consultas eficientes.
- No se crea ninguna tabla de progreso académico paralela: se reutilizan `lessonProgress`, `assessmentAttempt` y el estado de completado del curso ya existente.

## Capa de dominio (`backend/src/domain/gamification.ts`)

Contiene las reglas de elegibilidad independientes de HTTP, frontend y base de datos:

- `ACHIEVEMENT_RULES`: definición de los 13 logros con nombre, descripción, categoría, ícono, orden y función `isEligible(context)`.
- `GamificationContext`: estado académico de la persona (cursos completados, mapa curso→medalla, códigos ya obtenidos, indicadores de lección/módulo/laboratorio completados).
- `evaluateEligibleAchievements(rules, context)`: devuelve los códigos elegibles y aún no obtenidos, en orden de catálogo.
- `COURSE_MEDAL_CODES`, `LEARNING_RANK_THRESHOLDS` (2/3/5), `EXPERT_REQUIRED_COMPLEMENTARY`.

## Capa de aplicación (`backend/src/application/assessments/assessment.service.ts`)

Casos de uso:

- `getAchievementCatalog()`: catálogo público de logros.
- `getStudentAchievementCollection(userId)`: colección de la persona con estado (obtenido/bloqueado), fecha de obtención y estado de notificación.
- `evaluateAndUnlockAchievements(userId)`: evalúa elegibilidad y persiste los logros recién obtenidos (transaccional). Devuelve los recién desbloqueados.
- `getAchievementDashboardSummary(userId)`: resumen para el panel (cursos completados, medallas, rango actual, próximo logro, progreso, notificaciones pendientes).
- `getPendingAchievementNotifications(userId)`: logros obtenidos cuya notificación aún no se ha mostrado (`notifiedAt IS NULL`).
- `markAchievementNotificationViewed(userId, userAchievementId)`: marca una notificación como vista.

## Integración con el flujo académico (desbloqueo automático)

La evaluación y otorgamiento de logros se dispara tras confirmar un evento académico, nunca se solicita desde el frontend:

1. **Lección completada** → `completeLessonForStudent` (usado por completar teoría y finalizar laboratorio).
2. **Laboratorio completado** → mismo punto que la lección.
3. **Curso completado** → `submitFinalAssessment` tras registrar el intento aprobado.

En cada evento se invoca `evaluateAndUnlockAchievements(userId)` dentro del flujo existente, y los logros recién obtenidos se persisten antes de considerar finalizada la operación. Si una operación satisface varias condiciones, se otorgan todos los elegibles. Los intentos repetidos o concurrentes no crean duplicados gracias a la restricción única de la base de datos y a la comprobación de códigos ya obtenidos.

## API y autorización

Todas las rutas se montan bajo `/api/achievements` y requieren autenticación (`requireAuth`). Operan sobre la persona autenticada; nunca se expone el progreso de otra persona.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/achievements` | Catálogo de logros. |
| GET | `/api/achievements/collection` | Colección de la persona (estado, fechas). |
| GET | `/api/achievements/summary` | Resumen para el panel del estudiante. |
| GET | `/api/achievements/notifications/pending` | Notificaciones pendientes (`notifiedAt IS NULL`). |
| POST | `/api/achievements/notifications/:userAchievementId/view` | Marca una notificación como vista (204). |

No existe un endpoint para otorgar logros manualmente: el otorgamiento es exclusivamente backend y automático.

## Notificaciones

- Al obtener uno o más logros, se generan notificaciones pendientes (`notifiedAt IS NULL`).
- La página "Mis logros" y el panel muestran las pendientes mediante un componente de notificación (modal con medalla, nombre, descripción, felicitación y botón de continuar/ver logros).
- Al cerrar/ver la notificación, se marca como vista (`notifiedAt` se establece) para no repetirla.
- Las notificaciones no bloquean la navegación.

## Semilla académica

`seed-academic-content.ts` inicializa los 13 logros de forma idempotente: crea los que faltan y actualiza los existentes si difieren; nunca elimina ni toca los registros de usuarios que ya los obtuvieron. Se ejecuta en cada `pnpm seed:academic` sin duplicar registros.

## Limitaciones

- No se implementó un CRUD de administrador para el catálogo: el catálogo inicial se define por código y se sincroniza por seed. Si se requieren cambios futuros, deben hacerse por código y seed.
- Los umbrales de los rangos (2/3/5) están centralizados en `LEARNING_RANK_THRESHOLDS`; si se añaden cursos, deben ajustarse de forma controlada sin revocar logros ya otorgados.
