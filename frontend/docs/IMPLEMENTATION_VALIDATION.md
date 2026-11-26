# Verificación de las seis mejoras

## Comandos ejecutados (25 de noviembre de 2026)

| Comando desde la raíz | Resultado real |
| --- | --- |
| `pnpm typecheck:all` | Correcto, backend, pruebas y frontend; repetido tras los últimos cambios de código. |
| `pnpm build:all` | Correcto, TypeScript del backend y compilación de producción Vite. |
| `pnpm test` | 10 pruebas aprobadas en esa ejecución: cursos, lecciones, evaluaciones, logros, perfil, administración y política de contraseña. |
| `pnpm --filter backend test:security` | 10 pruebas aprobadas, incluyendo JWT, cookies, validación, CSRF y límites. |
| `pnpm --filter backend exec tsx --test test/registration-http.test.ts test/course-management.test.ts test/admin-dashboard.test.ts` | 3 pruebas aprobadas después de añadir la prueba HTTP y ajustar la reactivación y validación administrativa. |
| `pnpm --filter backend test:security:integration` | Bloqueado antes de las pruebas: exige una base local `unicyber_security_isolated_*`; el entorno usa `localhost/unicyber`. No se desactivó esta protección. |
| `git diff --check` | Sin errores de espacios; Git advierte normalización LF/CRLF. |

El script `pnpm test` incluye ahora también `registration-http.test.ts`: las
11 pruebas distintas de esa suite se verificaron entre la ejecución completa
y la ejecución dirigida posterior. No hay script ni configuración ESLint en
los paquetes inspeccionados; no se ejecutó lint ni se agregó una configuración.

## Cobertura funcional

- Login válido e inválido por HTTP, cookie y hash scrypt; validación de campos
  vacíos y navegación a registro/recuperación en navegador.
- Catálogo: No iniciado, En progreso tras completar lecciones, Completado tras
  aprobar y aislamiento respecto de otra cuenta, mediante prueba de evaluación.
- Cursos y módulos: archivado, reactivación, visibilidad recuperada con los
  mismos identificadores y bloqueo si el padre está archivado. La suite de
  cursos conserva verificaciones de autorización administrativa.
- Registro: cinco incumplimientos individuales rechazados directamente por
  HTTP; registro válido crea STUDENT y conserva hash. Política cliente/servidor
  comparada automáticamente, incluidos espacios y letras acentuadas.
- Roles: admin/student persisten como ADMINISTRATIVE/STUDENT; roles heredados y
  arbitrarios rechazados; protección del propio rol y acceso administrativo.
- Regresión existente de lecciones, laboratorios, exámenes, logros y perfil.

## Navegador

Se ejecutó Vite y el backend local y se verificaron login, registro y política
en documentos embebidos del mismo origen con anchos de 360, 768 y 1366 píxeles.
En los nueve casos, `scrollWidth` no superó el ancho del documento: no hubo
desbordamiento horizontal. Se inspeccionó una captura del login y la jerarquía
de encabezados de la política.

Se comprobó la validación visible de contraseña débil, confirmación diferente
y consentimiento ausente; los campos correspondientes llevan `aria-invalid`.
El desplegable informativo abre correctamente. Los enlaces declaran una nueva
pestaña; se abrió el de privacidad y se verificó `/data-protection`, sus seis
secciones y el enlace de retorno `/register`. Se activó ese enlace y se confirmó
que el formulario de la pestaña original conservaba los datos introducidos.

No se realizó una auditoría completa con lector de pantalla, ni una matriz
de dispositivos físicos o una prueba visual de todas las pantallas privadas.
La suite aislada adicional queda pendiente de preparar su base específica.

## Integridad y límites

No hubo migraciones, cambios de contrato Prisma ni reescritura de usuarios.
Las pruebas integradas usaron registros temporales en la base local y limpiaron
sus propios datos. La reactivación modifica solo estados; no hay borrado de
historial. Los valores heredados de rol detectados en el contrato se conservan.

La política deja pendientes responsable jurídico, canal formal, conservación y
procedimiento de solicitudes. No supone certificación legal. El inicio de un
curso se reconoce mediante progreso académico registrado, no por visitas.
