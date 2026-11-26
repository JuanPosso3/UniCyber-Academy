# Panel administrativo (frontend)

## Ruta y acceso

`/admin/statistics` — **Estadísticas**. Solo se muestra a usuarios con rol
`ADMINISTRATIVE` y el backend rechaza a cualquier otro rol con `403`.

La entrada **Estadísticas** de la barra lateral y la pestaña del mismo nombre en
`AdminNav` solo aparecen para administradores. La protección real está en el
backend.

## Componentes

- Página: `frontend/src/pages/admin/AdminStatisticsPage.tsx`.
- Servicios: `frontend/src/services/admin.ts`.
- Navegación: `Sidebar`, `AdminNav`, rutas en `frontend/src/lib/routes.ts`.

## Contenido

### Resumen general

Tarjetas con:

- Total de estudiantes, con activos y deshabilitados.
- Total de cursos.
- Cursos publicados y no publicados.
- Total de módulos.
- Lecciones teóricas y laboratorios.
- Intentos de evaluación final.

### Actividad de estudiantes

- **Nuevos registros de estudiantes:** gráfico de barras de los últimos seis
  meses construido con CSS y datos reales de `createdAt`. No se añadió una
  librería de gráficos porque el proyecto no la tenía instalada. Si todos los
  conteos son cero se muestra un estado vacío.
- **Cursos con más estudiantes con progreso:** lista de hasta cinco cursos
  según estudiantes con lecciones completadas.

### Resultados académicos

- Tasa de aprobación de evaluaciones finales, con estudiantes aprobados sobre
  estudiantes que presentaron.
- Cursos completados (pares únicos estudiante-curso con lecciones y evaluación
  final aprobada).
- Evaluaciones finales presentadas.

### Gestión de usuarios

- Buscador por nombre, nombre de usuario o correo.
- Tabla con usuario, correo, rol, estado y fecha de registro.
- Edición en línea del nombre de usuario y del rol.
- Roles asignables: Estudiante y Administrador, con valores de asignación
  `student` y `admin`. La API conserva los valores persistidos históricos.
  Véase `USER_ROLE_MANAGEMENT.md` para tratamiento de roles heredados.
- Confirmación visual de éxito o error mediante `Alert`.

No se ofrece eliminación de usuarios: se retiró para conservar la integridad de
los registros académicos. Tampoco se permite cambiar el rol propio ni dejar la
plataforma sin administradores activos; esas reglas se validan en el backend y
se informan en la interfaz.

## Estados

- Carga inicial con `StatePanel`.
- Error de carga con opción de reintentar.
- Estado vacío en el gráfico y en la lista de cursos.
- Tabla vacía cuando la búsqueda no tiene resultados.
- Botones deshabilitados mientras se guarda una edición.

## Datos

Todas las cifras provienen de `GET /admin/statistics` y
`GET /admin/users`. No se usan datos de ejemplo ni valores hardcodeados.
