# Lesson and Laboratory UI

## 1. Scope

This document describes the frontend implementation for the lesson and laboratory learning flow.

The frontend keeps the existing URL/state navigation. No React Router dependency was added.

## 2. Routes

### 2.1 Student routes

| Route | Page | Purpose |
| --- | --- | --- |
| `/courses` | `CoursesPage` | Available course catalog |
| `/courses/:courseId` | `CourseDetailPage` | Modules, lessons, locks, and course progress |
| `/courses/:courseId/lessons/:lessonId` | `LessonPage` | Theory or laboratory experience |

### 2.2 Administrative routes

| Route | Page | Purpose |
| --- | --- | --- |
| `/admin/courses` | `AdminCoursesPage` | Course administration |
| `/admin/courses/:courseId/modules` | `CourseModulesPage` | Module administration |
| `/admin/courses/:courseId/modules/:moduleId/lessons` | `CourseLessonsPage` | Lesson list and status actions |
| `/admin/courses/:courseId/modules/:moduleId/lessons/new` | `LessonFormPage` | Create a draft lesson |
| `/admin/courses/:courseId/modules/:moduleId/lessons/:lessonId/edit` | `LessonFormPage` | Edit title, type, and JSON content |
| `/admin/courses/:courseId/modules/:moduleId/lessons/:lessonId/preview` | `LessonPreviewPage` | Preview theory or laboratory content |

The module list includes a **Lecciones** action that opens the lesson list.

## 3. Student course detail

`CourseDetailPage` displays:

- Course title and description.
- Dynamic progress bar.
- Published modules in order.
- Module lock and completion badges.
- Lesson lock, completion, and next-lesson indicators.
- Assessment-pending notice when an active module assessment has not been passed.

Locked lessons are rendered as disabled buttons. The backend still enforces access, so direct URL access cannot bypass the lock.

## 4. Student lesson page

`LessonPage` loads the lesson and navigation state from the backend.

### 4.1 Theory lessons

- Theory content is rendered with `TheoryRenderer`.
- The page automatically sends the completion request when the theory lesson is opened.
- Completion is idempotent on the backend.
- A manual **Marcar como completada** button remains available if automatic completion fails.
- The lesson sidebar updates after completion.

### 4.2 Laboratories

- Laboratory content is rendered with `LaboratoryRenderer`.
- The renderer supports all implemented activity types.
- Hints are available per activity.
- Answers are validated by the backend; the frontend does not know the stored solutions.
- The simulated terminal accepts only the commands defined in the lesson JSON.
- The finalization button is enabled only when every required leaf activity is solved.
- Partial laboratory progress is kept only in component state and is never sent as a progress record.
- After finalization, `LessonProgress` is created by the backend and the page reloads the course state.

### 4.3 Navigation

The page shows previous and next lesson buttons. The next button is disabled when the next lesson is locked. A lock message explains that the current lesson must be completed first.

## 5. Theory renderer

`TheoryRenderer` supports:

- Headings.
- Paragraphs.
- Ordered and unordered lists.
- Tables.
- Code blocks.
- Callouts.
- Links.

Text is rendered through `InlineText`, which supports limited inline emphasis and links without using arbitrary HTML.

## 6. Laboratory UI

### 6.1 Shared activity frame

`ActivityFrame` provides:

- Activity title and instructions.
- Required or optional badge.
- Hints.
- Check button.
- Correct/incorrect feedback.
- Completion state.

### 6.2 Activity views

- `SINGLE_CHOICE`: radio-style options.
- `IDENTIFY_SUSPICIOUS`: multi-select elements.
- `MULTIPLE_SELECT`: multi-select options.
- `DECISION_STEPS`: one decision per step.
- `ORDER_PROCEDURE`: reorder items with up/down controls.
- `CHAINED`: groups child activities and preserves per-child solved state.
- `TERMINAL`: simulated terminal with command history and a command list.

### 6.3 Terminal

The terminal:

- Is visually marked as an isolated environment.
- Sends commands to the backend for validation.
- Displays simulated output.
- Tracks executed commands.
- Marks the activity complete when the required commands have been executed.

No command is executed on the user's machine.

## 7. Administrative lesson editor

`LessonFormPage` provides:

- Title field with the existing length limit.
- Lesson type selector (`THEORY` or `LABORATORY`).
- JSON content editor.
- Theory and laboratory templates.
- Local JSON parsing.
- Server-side content validation before saving.
- Structured validation issue list.
- **Guardar y previsualizar** action.
- Status indicator for existing lessons.

New lessons are created as `DRAFT`. Status changes are performed from the lesson list.

## 8. Administrative preview

`LessonPreviewPage`:

- Loads the saved lesson and validates its stored content.
- Renders theory or laboratory content.
- Allows testing laboratory interactions through preview endpoints.
- Does not create `LessonProgress`.
- Shows validation issues when the stored content is invalid.
- Provides an edit action.

## 9. Assessment dependency

The frontend displays an assessment-pending notice when the backend reports that a module has an active assessment that has not been passed.

There is no assessment execution page because the project does not yet have an assessment authoring, delivery, or attempt workflow. The UI does not invent one. Module unlocking uses the existing `Assessment` and `AssessmentAttempt` data.

## 10. Styling and accessibility

The implementation reuses the existing design system:

- `Card`, `Button`, `Badge`, `Alert`, `Input`, `Textarea`, `StatePanel`, and `ConfirmDialog`.
- Existing color and spacing conventions.
- Accessible labels, roles, and disabled states for interactive controls.

## 11. Verification

Commands used:

```bash
pnpm typecheck
pnpm build
```

The frontend production build completes successfully.

## 12. Known limitations

- The JSON editor is the supported authoring method. A visual block builder is not implemented.
- Assessment authoring and execution are pending.
- The terminal is simulated; it does not provide a real shell.
- Partial laboratory progress is intentionally not persisted.
