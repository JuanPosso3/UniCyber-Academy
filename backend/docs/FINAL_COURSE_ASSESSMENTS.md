# UniCyber Academy — Evaluaciones finales de curso

## Resumen

Este documento describe la funcionalidad de **evaluaciones finales de curso** implementada en el backend de UniCyber Academy.

Cada curso tiene exactamente **una** evaluación final. Un estudiante completa el curso solo cuando ha terminado todas las lecciones requeridas **y** ha aprobado la evaluación final con una calificación de al menos 80 % (7 de 8 respuestas correctas).

Se eliminó la lógica de evaluaciones a nivel de módulo: los módulos ya no requieren aprobar una evaluación para desbloquear el siguiente.

## Cambios de base de datos

Se reutilizan las tablas existentes (`assessment`, `question`, `answerOption`, `assessmentAttempt`, `questionResponse`). No se creó ninguna tabla nueva.

Se agregaron dos columnas opcionales a `question`:

| Columna | Tipo | Notas |
|---|---|---|
| `explanation` | `text?` | Explicación educativa de la respuesta correcta. |
| `hint` | `text?` | Orientación para respuestas incorrectas (no revela la respuesta). |

El contrato de Prisma (`contract.prisma`) se actualizó y se aplicó a la base con `pnpm prisma contract emit` + `pnpm prisma db init` (cambios aditivos, sin pérdida de datos).

## Reglas de dominio (`backend/src/domain/assessment.ts`)

Todas las reglas son independientes de HTTP, frontend y base de datos:

- `FINAL_ASSESSMENT_QUESTION_COUNT = 8`: exactamente 8 preguntas por evaluación.
- `FINAL_ASSESSMENT_PASSING_SCORE = 80`: aprobado a partir de 80 %.
- `FINAL_ASSESSMENT_MIN_CORRECT_ANSWERS = 7`: mínimo 7 correctas de 8.
- `FINAL_ASSESSMENT_QUESTION_WEIGHT = 12.5`: cada pregunta vale 12,5 %.
- `validateAssessmentQuestions()`: valida que haya exactamente 8 preguntas, que las de selección múltiple tengan 4 opciones y 1 correcta, que las de verdadero/falso tengan 2 opciones y 1 correcta, que todas tengan enunciado y explicación, y que la evaluación incluya ambos tipos de pregunta.
- `scoreFromCorrectAnswers(n)`: convierte respuestas correctas en porcentaje sin redondeos problemáticos (7 → 87,5 %, 6 → 75 %).
- `isScorePassing(score)`: `score >= 80`.

### Calificación

| Correctas | Porcentaje | Resultado |
|---|---|---|
| 8 de 8 | 100 % | Aprobado |
| 7 de 8 | 87,5 % | Aprobado |
| 6 de 8 | 75 % | No aprobado |
| 5 de 8 | 62,5 % | No aprobado |
| 4 de 8 | 50 % | No aprobado |
| ≤ 3 de 8 | ≤ 37,5 % | No aprobado |

## Capa de aplicación (`backend/src/application/assessments/assessment.service.ts`)

Casos de uso implementados:

- `getCourseFinalAssessmentSummary(courseId, userId, lessonsCompleted)`: resumen para el detalle del curso (estado, preguntas, completa, intentada, aprobada, calificación).
- `getAdminCourseFinalAssessment(courseId)`: vista de administrador con preguntas y opciones (incluye respuestas correctas).
- `createCourseFinalAssessment(courseId, input)`: crea la evaluación final en borrador; impide duplicados y valida el contenido.
- `updateCourseFinalAssessmentMetadata(courseId, input)`: edita título/descripción.
- `replaceCourseFinalAssessmentQuestions(courseId, questions)`: reemplaza todas las preguntas; bloqueado si ya hay intentos registrados (preserva integridad histórica).
- `changeCourseFinalAssessmentStatus(courseId, status)`: publica (ACTIVE) solo si la evaluación está completa (8 preguntas válidas); permite archivar.
- `getStudentFinalAssessment(courseId, userId)`: elegibilidad (curso activo, evaluación publicada y completa, lecciones completas) y preguntas sin revelar respuestas correctas.
- `submitFinalAssessment(courseId, userId, answers)`: valida que las respuestas pertenezcan a la evaluación, registra el intento (único por usuario/evaluación, se sobrescribe en cada reintento), calcula la calificación en el servidor y devuelve resultados con explicaciones/pistas.
- `getStudentAssessmentResults(courseId, userId)`: recupera el último intento y la revisión pregunta por pregunta.

## API y autorización

### Rutas de administrador (`/api/admin/courses/:courseId/assessment`)

Requieren rol `admin`:

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/assessment` | Ver evaluación final del curso. |
| POST | `/assessment` | Crear evaluación final (borrador). |
| PATCH | `/assessment` | Editar título/descripción. |
| PUT | `/assessment/questions` | Reemplazar preguntas (bloqueado con intentos). |
| PATCH | `/assessment/status` | Cambiar estado (publicar/archivar). |

### Rutas de estudiante (`/api/courses/:courseId/assessment`)

Requieren rol `student`:

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/assessment` | Consultar elegibilidad y preguntas del examen. |
| POST | `/assessment/submit` | Entregar respuestas y obtener calificación. |
| GET | `/assessment/results` | Obtener resultados del último intento. |

Reglas de seguridad:

- Solo `admin` puede crear, editar, reemplazar o publicar evaluaciones.
- Los estudiantes no pueden ver respuestas correctas antes de enviar.
- El backend valida que las respuestas enviadas pertenezcan a la evaluación (máximo 8 respuestas, una por pregunta, opciones válidas).
- La calificación se calcula en el servidor; nunca se confía en el cliente.

## Compleción del curso

Un curso se considera completado solo cuando:

1. El estudiante completó todas las lecciones activas requeridas.
2. El estudiante presentó la evaluación final del curso.
3. El último intento tiene calificación ≥ 80 %.

Esto se deriva de `lessonProgress` y el intento más reciente de `assessmentAttempt`. No se creó una tabla `CourseProgress` ni un porcentaje almacenado.

## Semillas académicas (`backend/src/prisma/seed-academic-content.ts` + `academic-final-assessments.ts`)

La carga inicial elimina las antiguas evaluaciones de módulo (borradores sin preguntas ni intentos) y crea una evaluación final completa y publicada (ACTIVE) para cada uno de los 5 cursos académicos:

1. Phishing y simulaciones de ataque
2. Gestión de contraseñas y autenticación
3. Respuesta a incidentes de seguridad
4. Seguridad en redes WiFi
5. Amenazas emergentes

Cada evaluación tiene 8 preguntas (4 selección múltiple + 4 verdadero/falso), escritas a partir del contenido real de las lecciones del curso, con enunciado, opciones, respuesta correcta, explicación y orientación.

El seed es idempotente: no modifica evaluaciones que ya tienen intentos registrados.

## Eliminación de la lógica de evaluación por módulo

Se removió de `lesson.service.ts` (`buildLearningState`) la lectura de evaluaciones de módulo, el cálculo de `assessmentRequired`/`assessmentPassed` y el desbloqueo condicionado a `score >= 70`. Los módulos se desbloquean solo por completar las lecciones anteriores. Los campos desaparecieron de la respuesta del detalle del curso y de la lección.

## Pruebas

- `backend/test/assessment.test.ts`: prueba de integración del flujo completo (crear, validar inválido, duplicado, publicar, elegibilidad con lecciones pendientes, intento fallido 6/8 = 75 %, reintento ilimitado 8/8 = 100 %, resultados, protección de contenido con intentos, rechazo de opciones ajenas, prohibición para estudiantes).
- `backend/test/lesson-learning.test.ts`: actualizada para afirmar que las evaluaciones de módulo ya no bloquean el avance.
- `pnpm test`: 4 de 4 pruebas pasan.
- `pnpm typecheck:all` y `pnpm build:all`: sin errores.

## Limitaciones

- No se implementó versionado de evaluaciones: una vez que un estudiante tiene intentos registrados, las preguntas no se pueden reemplazar (se bloquea con `ASSESSMENT_HAS_ATTEMPTS`). Si se necesita corregir preguntas tras intentos, habría que diseñar un proceso de migración de resultados.
- La creación y edición de preguntas se realiza mediante reemplazo completo del conjunto de 8 preguntas.
