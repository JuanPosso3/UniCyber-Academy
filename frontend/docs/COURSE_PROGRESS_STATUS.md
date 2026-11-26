# Estados de avance del catálogo

`CoursesPage.tsx` presenta un Badge por curso: **Completado** (verde),
**En progreso** (azul) o **No iniciado** (neutro). El texto permite distinguir
los estados sin depender del color.

`GET /api/courses` agrega `progressStatus` a cada resumen. El controlador
reutiliza `getStudentCourseDetail` y su resumen académico, con el identificador
de la sesión validada. Una evaluación `passed` implica todas las lecciones
completadas y nota aprobatoria. Un avance de lecciones o intento de examen
produce `in_progress`; sin esas evidencias produce `not_started`.

No se persiste un nuevo progreso. Abrir una lección sin completarla no genera
un registro de inicio: con el modelo actual seguirá figurando No iniciado.
El catálogo se vuelve a consultar al regresar desde lecciones o evaluaciones;
la limpieza del efecto descarta respuestas tras desmontar la pantalla. No hay
peticiones HTTP adicionales por tarjeta ni caché compartida entre cuentas.

La implementación reutiliza el cálculo completo por curso en el servidor;
para catálogos grandes convendría optimizar sus consultas por lotes. Las pruebas
de evaluación cubren los tres estados y el aislamiento entre dos cuentas.
