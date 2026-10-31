# Catálogo de cursos y administración de módulos — frontend

Implementación del **2026-10-21**. Reutiliza el layout, los tokens y los
componentes del `frontendGuide`; no se modificó el prototipo de referencia.

## 1. Alcance

Se implementaron las siguientes experiencias:

- Panel posterior al inicio de sesión.
- Catálogo de cursos publicados con búsqueda local.
- Detalle de curso con sus módulos publicados.
- Gestión administrativa de cursos: listar, crear, editar, publicar y
  archivar.
- Gestión administrativa de módulos: listar, crear, editar, publicar,
  archivar y reordenar.
- Confirmaciones para acciones de archivado.
- Navegación protegida para estudiantes y administradores.

No se agregaron lecciones, evaluaciones, laboratorios, certificados,
gamificación, imágenes, calificaciones ni datos de demostración. Toda la
información mostrada proviene de la API real.

## 2. Rutas

La navegación sigue el patrón del prototipo: estado de React sincronizado con
`window.history`, sin agregar React Router.

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/login` | Inicio de sesión | Público |
| `/register` | Registro | Público |
| `/dashboard` | Panel | Autenticado |
| `/courses` | Catálogo | Autenticado |
| `/courses/:courseId` | Detalle del curso | Autenticado |
| `/admin/courses` | Gestión de cursos | Administrador |
| `/admin/courses/new` | Crear curso | Administrador |
| `/admin/courses/:courseId/edit` | Editar curso | Administrador |
| `/admin/courses/:courseId/modules` | Módulos del curso | Administrador |
| `/admin/courses/:courseId/modules/new` | Crear módulo | Administrador |
| `/admin/courses/:courseId/modules/:moduleId/edit` | Editar módulo | Administrador |

Las rutas profundas sobreviven a una recarga porque Express sirve
`frontend/dist/index.html` para cualquier ruta que no empiece por `/api`. La
navegación interna usa `pushState`, atrás/adelante escucha `popstate` y las
redirecciones de guardia usan `replaceState`.

Si un usuario autenticado sin permisos abre una ruta `/admin/...`, la interfaz
muestra un estado de acceso restringido y lo redirige al catálogo. La API
también rechaza la operación con `403`, por lo que la protección no depende de
la interfaz.

## 3. Pantallas

### Panel

Muestra el nombre del usuario, su correo, el rol efectivo (“Estudiante” o
“Administrador”) y accesos directos al catálogo y, solo para administradores, a
la gestión de cursos.

### Catálogo

- Consume `GET /api/courses`.
- Presenta tarjetas con título, descripción y cantidad de módulos publicados.
- Permite buscar por título o descripción en el cliente.
- Distingue carga, error, catálogo vacío y búsqueda sin coincidencias.
- No muestra cursos en borrador o archivados; el backend ya los excluye.

### Detalle del curso

- Consume `GET /api/courses/:courseId`.
- Muestra el curso y sus módulos publicados en orden.
- Si el backend responde `404`, muestra el error y permite reintentar o volver
  al catálogo.
- No inventa duración, instructor, valoración ni contenido de lecciones.

### Gestión de cursos

- Consume `GET /api/admin/courses`.
- Permite buscar por título/descripción y filtrar por estado.
- Cada curso muestra estado, cantidad total de módulos y fecha de
  actualización.
- Acciones: crear, editar, administrar módulos, publicar borradores y archivar.
- “Publicar” ejecuta `PATCH /api/admin/courses/:id/status` con `ACTIVE`.
- “Archivar” abre un diálogo de confirmación y ejecuta el mismo endpoint con
  `ARCHIVED`.
- Los cursos archivados permanecen visibles para administración, sin acción de
  restauración.
- No existe botón de eliminación.

### Formularios de curso

- Crear: `POST /api/admin/courses`; el curso resultante es borrador y se
  redirige a sus módulos.
- Editar: `PATCH /api/admin/courses/:id`.
- Título obligatorio, máximo 200 caracteres.
- Descripción opcional, máximo 2000 caracteres, con contador visible.
- El estado se muestra como información de solo lectura y se cambia desde la
  lista.

### Gestión de módulos

- Consume `GET /api/admin/courses/:courseId/modules`.
- Muestra el estado del curso y de cada módulo.
- Permite crear, editar, publicar, archivar y mover módulos hacia arriba o
  hacia abajo.
- El reordenamiento usa `PATCH .../order` con `up` o `down`.
- Los controles de borde se deshabilitan en el primer/último módulo.
- “Archivar” abre un diálogo de confirmación.
- Si el curso está archivado, se muestra una advertencia y se deshabilitan las
  acciones de módulos, en línea con la validación del backend.

### Formularios de módulo

- Crear: `POST /api/admin/courses/:courseId/modules`; el módulo resultante es
  borrador y se agrega al final.
- Editar: `PATCH /api/admin/courses/:courseId/modules/:moduleId`.
- Mismas reglas de longitud que los cursos.
- No permiten modificar el estado; las acciones de publicación/archivado están
  en la lista.
- Si el curso está archivado, el formulario queda bloqueado.

## 4. Roles y autorización

La interfaz considera administrador únicamente al rol persistido
`ADMINISTRATIVE` (`frontend/src/lib/auth.ts`). Los demás usuarios ven la
experiencia de estudiante. El rol se obtiene de `/api/auth/me`, no de
almacenamiento manipulable del navegador.

La interfaz nunca sustituye la autorización del servidor. Las rutas
administrativas y sus acciones también se validan en el backend mediante la
sesión y el usuario recargado desde PostgreSQL.

## 5. Estados y retroalimentación

Las pantallas de datos y gestión contemplan:

- carga;
- error con opción de reintento;
- vacío;
- éxito mediante `Alert`;
- errores de API traducidos a mensajes en español;
- errores de validación por campo.

Los avisos de éxito que atraviesan una navegación usan `sessionStorage` mediante
`lib/flash.ts`, evitando agregar un estado global o una dependencia nueva.

## 6. Componentes reutilizables

Se agregaron al sistema de diseño existente:

- `AdminNav`: subnavegación administrativa.
- `AppLayout`, `Sidebar`, `Topbar`, `AuthenticatedLayout`: composición de las
  pantallas autenticadas.
- `Badge` y `ContentStatusBadge`: estados de contenido.
- `Avatar`: iniciales del usuario.
- `Textarea`: campo multilínea accesible.
- `StatePanel`: carga, vacío y error.
- `ConfirmDialog`: confirmación de archivado con foco contenido y cierre con
  `Escape`.

Se conservaron los tokens de `styles/theme.css` y los componentes existentes
(`Button`, `Card`, `Input`, `Alert`, `AuthLayout`). No se agregaron librerías.

## 7. Archivos principales

- `src/App.tsx`: rutas, guardias y composición.
- `src/lib/routes.ts`: análisis de rutas y compatibilidad con la navegación
  anterior.
- `src/lib/auth.ts`: rol administrativo efectivo.
- `src/lib/format.ts`: formato de fechas en español.
- `src/lib/flash.ts`: avisos entre navegaciones.
- `src/services/courses.ts`: cliente de la API de cursos/módulos.
- `src/types/course.ts`: contratos de respuesta.
- `src/components/layout/`: layout autenticado y navegación.
- `src/components/courses/`: estados de contenido y componentes del dominio.
- `src/pages/courses/`: catálogo y detalle.
- `src/pages/admin/`: formularios y gestión.
- `src/pages/dashboard/DashboardPage.tsx`: panel.

## 8. Verificación

```bash
pnpm typecheck:web
pnpm build:web
```

La verificación manual en navegador cubrió inicio de sesión como administrador,
creación de curso, creación y publicación de módulo, publicación de curso,
visualización como estudiante, intento de acceso a `/admin/courses` como
estudiante y archivado de curso con confirmación.

La prueba automatizada de backend (`pnpm test`) cubre el contrato HTTP completo.
El frontend no incorpora un runner de pruebas para no agregar dependencias; su
verificación es typecheck, build de producción y recorrido en navegador.

## 9. Limitaciones conocidas

- No existe restauración de contenido archivado.
- No hay paginación; la búsqueda del catálogo y de administración es local.
- No se implementaron lecciones ni vistas de contenido dentro de un módulo.
- Los roles heredados del contrato se presentan como “Estudiante” salvo
  `ADMINISTRATIVE`, que es el rol administrativo efectivo.
- Los formularios no permiten cambiar el estado; esto es intencional para
  separar edición y publicación.
