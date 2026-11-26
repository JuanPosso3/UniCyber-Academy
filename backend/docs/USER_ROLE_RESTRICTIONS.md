# Restricciones de asignación de roles

`updateManagedUser` solo admite admin/student y, por compatibilidad de API,
ADMINISTRATIVE/STUDENT. Convierte los primeros a los valores persistidos.
Rechaza TEACHER, VISITOR, MENTOR y cualquier valor arbitrario mediante
`400 INVALID_ROLE`, incluso si coincide con el rol heredado actual.

Se conserva `requireAuth` y `requireAdmin` en las rutas administrativas, la
protección de cambio del propio rol y del último administrador activo.
No se modifica el enum Prisma ni se reescriben cuentas históricas. Los valores
heredados permanecen legibles y no reciben permisos administrativos.

`admin-dashboard.test.ts` verifica asignaciones admin/student, rechazo de
valores no soportados y controles existentes. Los resultados se documentan en
`../../frontend/docs/IMPLEMENTATION_VALIDATION.md`.
