# Lesson and Laboratory Learning System

## 1. Scope

This document describes the backend implementation of the lesson and laboratory learning flow added to UniCyber Academy.

The implementation reuses the existing Prisma models:

- `Lesson` and its existing JSON column `content`.
- `LessonProgress` with the composite primary key `(userId, lessonId)`.
- `Assessment` and `AssessmentAttempt` for the existing assessment gate.
- `Module` and `Course` for hierarchy and status.

No tables were added for theory blocks, laboratory activities, partial laboratory progress, course progress, or assessment questions. Course progress is calculated dynamically.

## 2. Content contract

Lesson content is stored in `Lesson.content` as JSON with `schemaVersion: 1`.

### 2.1 Theory content

```json
{
  "schemaVersion": 1,
  "blocks": [
    { "id": "b1", "type": "heading", "content": "Título", "level": 2 },
    { "id": "b2", "type": "paragraph", "content": "Texto" },
    { "id": "b3", "type": "list", "style": "unordered", "items": ["Elemento"] },
    { "id": "b4", "type": "callout", "variant": "IMPORTANT", "content": "Aviso" }
  ]
}
```

Supported block types:

| Type | Required fields | Optional fields |
| --- | --- | --- |
| `heading` | `id`, `content` | `level` (`2` or `3`) |
| `paragraph` | `id`, `content` | - |
| `list` | `id`, `items` | `style` (`ordered` or `unordered`) |
| `table` | `id`, `headers`, `rows` | `caption` |
| `code` | `id`, `content` | `language` |
| `callout` | `id`, `variant`, `content` | - |
| `link` | `id`, `label`, `url` | `description` |

Callout variants: `IMPORTANT`, `WARNING`, `TIP`, `COMMON_MISTAKE`, `INFO`.

The backend validates block identifiers, field types, list sizes, table dimensions, URLs, and text length. Arbitrary HTML is not part of the contract.

### 2.2 Laboratory content

```json
{
  "schemaVersion": 1,
  "introduction": "Introducción",
  "objective": "Objetivo",
  "scenario": "Escenario",
  "activities": []
}
```

Activity types:

- `SINGLE_CHOICE`
- `IDENTIFY_SUSPICIOUS`
- `MULTIPLE_SELECT`
- `DECISION_STEPS`
- `ORDER_PROCEDURE`
- `CHAINED`
- `TERMINAL`

Each leaf activity has an `id`, `title`, `instructions`, optional `required`, optional `hints`, and a `solution` object. Activity solutions are stored in the lesson JSON for administrative preview and are removed from student responses by `sanitizeLabContent`.

Terminal activities are simulated. They contain a whitelist of commands and their outputs. No command is executed on the host or on a real system.

## 3. Server-side rules

### 3.1 Lesson status transitions

Lesson status transitions are:

- `DRAFT -> ACTIVE`
- `DRAFT -> ARCHIVED`
- `ACTIVE -> ARCHIVED`
- `ARCHIVED -> ACTIVE`

Activation validates the stored JSON before changing the status. Archived lessons are excluded from student access, unlocking, and progress denominators.

Course and module transitions remain unchanged:

- `DRAFT -> ACTIVE`
- `DRAFT -> ARCHIVED`
- `ACTIVE -> ARCHIVED`

### 3.2 Creation and ordering

- New lessons are created with `status = DRAFT`.
- New lessons receive `order = max(order) + 1` within the module.
- Reordering uses a temporary negative order inside a transaction and preserves `LessonProgress` records.
- Deleting a lesson is blocked when `LessonProgress` records exist (`LESSON_HAS_PROGRESS`). Archiving is the recommended alternative.

### 3.3 Student access and unlocking

Student access requires:

1. An authenticated user.
2. An `ACTIVE` course.
3. An `ACTIVE` module.
4. An `ACTIVE` lesson.
5. All previous active lessons in the course completed.
6. The previous active module completed.
7. The previous module assessment passed when an active assessment exists.

Sequential unlocking spans the whole course, not only the current module. Archived lessons are omitted from the sequence and do not block the next lesson.

### 3.4 Progress

Course progress is calculated dynamically:

```text
percentage = completed active lessons / total active lessons * 100
```

The percentage is rounded to an integer. The denominator excludes archived lessons. No `CourseProgress` table is used.

### 3.5 Theory completion

Theory lessons are completed when the student opens the lesson page. The frontend triggers the completion request automatically; the backend endpoint is idempotent and creates `LessonProgress` only once.

### 3.6 Laboratory completion

Laboratory completion is validated by the backend:

- The student must have access to the laboratory.
- All required leaf activities must be answered correctly.
- Terminal activities require the configured required commands.
- `LessonProgress` is created only after finalization succeeds.
- Partial laboratory progress is never persisted.

The finalization endpoint accepts the student's answers and returns `LAB_NOT_COMPLETED` with the missing activity identifiers when requirements are not met.

### 3.7 Assessment integration

The existing assessment model supports module and course assessments. The current project does not have an assessment execution workflow. Therefore:

- The lesson system does not create a parallel assessment system.
- The module unlocking gate reads existing `Assessment` records with `status = ACTIVE`.
- An `AssessmentAttempt` with `score >= 70` marks the assessment as passed.
- The academic seed creates `DRAFT` module assessments without questions. They do not affect students until an assessment workflow is implemented and the records are activated.
- The missing assessment authoring and execution workflow is documented as a dependency, not simulated.

## 4. API endpoints

All routes are mounted under `/api`.

### 4.1 Student endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/courses/:courseId` | Course learning state with modules, lessons, locks, and progress |
| `GET` | `/courses/:courseId/lessons/:lessonId` | Student lesson content, completion state, and navigation |
| `POST` | `/courses/:courseId/lessons/:lessonId/complete` | Complete a theory lesson |
| `POST` | `/courses/:courseId/lessons/:lessonId/activities/:activityId/check` | Validate a laboratory activity answer |
| `POST` | `/courses/:courseId/lessons/:lessonId/activities/:activityId/terminal` | Execute a simulated terminal command |
| `POST` | `/courses/:courseId/lessons/:lessonId/finalize` | Validate and finalize a laboratory |

### 4.2 Administrative endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/admin/courses/:courseId/modules/:moduleId/lessons` | List lessons with progress counts |
| `POST` | `/admin/courses/:courseId/modules/:moduleId/lessons` | Create a draft lesson |
| `POST` | `/admin/courses/:courseId/modules/:moduleId/lessons/validate` | Validate unsaved content |
| `GET` | `/admin/courses/:courseId/modules/:moduleId/lessons/:lessonId` | Get a lesson for editing |
| `PATCH` | `/admin/courses/:courseId/modules/:moduleId/lessons/:lessonId` | Update title, type, or content |
| `PATCH` | `/admin/courses/:courseId/modules/:moduleId/lessons/:lessonId/status` | Change lesson status |
| `PATCH` | `/admin/courses/:courseId/modules/:moduleId/lessons/:lessonId/order` | Move a lesson up or down |
| `DELETE` | `/admin/courses/:courseId/modules/:moduleId/lessons/:lessonId` | Delete a lesson when no progress exists |
| `POST` | `/admin/courses/:courseId/modules/:moduleId/lessons/:lessonId/validate` | Validate stored content |
| `POST` | `/admin/courses/:courseId/modules/:moduleId/lessons/:lessonId/preview/activities/:activityId/check` | Preview activity validation |
| `POST` | `/admin/courses/:courseId/modules/:moduleId/lessons/:lessonId/preview/activities/:activityId/terminal` | Preview simulated terminal |

The JSON request body limit is `1mb` to accommodate lesson and laboratory content.

Errors use the existing format:

```json
{
  "error": {
    "code": "INVALID_CONTENT",
    "message": "El contenido de la lección no es válido.",
    "fields": {},
    "details": []
  }
}
```

`details` contains structured content-validation issues when applicable.

## 5. Academic seed

Command:

```bash
pnpm seed:academic
```

The seed:

- Validates all content before writing anything.
- Creates missing courses, modules, lessons, and module assessments.
- Preserves existing records with the same title and module.
- Creates lessons with `status = DRAFT`.
- Creates module assessments with `status = DRAFT` and no questions.
- Merges the source-level laboratory module into the third module so the database has 15 modules, 30 theory lessons, and 5 laboratories.
- Is idempotent: rerunning it does not duplicate the academic structure.

The resulting structure is:

- 5 courses.
- 15 modules.
- 30 theory lessons.
- 5 laboratories.
- 15 draft module assessments.

## 6. Verification

Commands used:

```bash
pnpm typecheck
pnpm test
pnpm typecheck:all
pnpm build
```

The test suite covers:

- Admin lesson CRUD and authorization.
- Content validation errors.
- Draft creation and activation.
- Sequential unlocking.
- Direct access rejection for locked lessons.
- Theory completion and progress calculation.
- Laboratory answer validation.
- Solution stripping from student responses.
- Simulated terminal commands.
- Finalization requirements.
- Assessment gate using `AssessmentAttempt.score >= 70`.
- Archived lesson exclusion from progress.
- Lesson reactivation.
- Deletion protection when progress exists.

## 7. Known dependency

The assessment execution workflow is not part of this implementation. The module assessment gate is integrated with the existing models, but authoring questions, delivering assessments, and recording attempts through a UI remain pending. The academic seed intentionally leaves module assessments in `DRAFT` without questions.
