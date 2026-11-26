# Página informativa de tratamiento de datos

`DataProtectionPage.tsx`, registrada en `lib/routes.ts` y `App.tsx`, se sirve
en `/data-protection` sin exigir sesión. Incluye finalidad, categorías, uso,
confidencialidad, análisis, derechos y aceptación (`#conditions`). Usa los
tokens existentes, estructura semántica y ancho de lectura adaptable.

Los dos enlaces del registro remiten al documento o su sección de condiciones.
Se abren en otra pestaña, anunciada en la etiqueta accesible, para conservar
el formulario original y sus contraseñas solo en memoria. La página explica
cómo regresar a esa pestaña e incluye un enlace a `/register`. La casilla
conserva la validación obligatoria y añade el atributo `required`.

La descripción se basa en los modelos, autorización, scrypt, infraestructura
prevista Vercel/Render/Neon y envío de recuperación mediante Resend. No se
atribuye autorización institucional ni se certifica cumplimiento legal.
Pendientes: responsable jurídico, contacto formal, conservación, procedimiento
de solicitudes y condiciones de proveedores. La aceptación continúa siendo
validada en el formulario; no se añadió un registro probatorio de consentimiento.
