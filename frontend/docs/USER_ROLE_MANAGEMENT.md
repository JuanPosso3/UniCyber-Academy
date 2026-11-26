# Asignación de roles

El selector de `AdminStatisticsPage.tsx` solo permite **Administrador** (`admin`)
y **Estudiante** (`student`). `services/admin.ts` envía esos valores a la API.
Las respuestas y la persistencia conservan el contrato histórico
`ADMINISTRATIVE` / `STUDENT`; no se cambian permisos ni registros al consultar.

El contrato también contiene TEACHER, VISITOR y MENTOR. Se muestran como rol
heredado pendiente de revisión, sin convertirlos automáticamente al editar un
nombre de usuario. Para asignar un rol debe elegirse explícitamente uno compatible.
No se ha auditado la presencia de estos valores en la base de producción.

El servidor rechaza asignaciones heredadas o arbitrarias y conserva los bloqueos
de cambio del propio rol y del último administrador. Véase
`../../backend/docs/USER_ROLE_RESTRICTIONS.md`.
