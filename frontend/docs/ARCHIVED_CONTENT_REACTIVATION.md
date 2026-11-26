# Reactivación de contenido archivado

`AdminCoursesPage.tsx` ofrece **Reactivar curso** y `CourseModulesPage.tsx`
ofrece **Reactivar módulo** para contenido archivado. Siguen el patrón de
reactivación directa de `CourseLessonsPage`: botón, petición de cambio a
ACTIVE, bloqueo durante el envío, actualización local y aviso de resultado.
El archivado conserva su diálogo de confirmación.

Se reutilizan `changeCourseStatusRequest` y `changeModuleStatusRequest`.
Un curso archivado bloquea las operaciones de sus módulos, con explicación
visible. Primero debe reactivarse el curso. Reactivar no publica los hijos:
solo los módulos y lecciones activos vuelven a ser visibles bajo padres activos.
No se eliminan relaciones ni historiales. Reglas y endpoints en
`../../backend/docs/COURSE_CATALOG_AND_MODULE_MANAGEMENT.md`.
