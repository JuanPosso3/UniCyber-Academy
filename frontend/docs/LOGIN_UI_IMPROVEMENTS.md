# Presentación del inicio de sesión

`Login.tsx` activa la variante `featured` de `AuthLayout`: composición de dos
columnas en escritorio, escudo decorativo y lema exacto «Construye tus
habilidades. Defiende el futuro.». En móvil se apila el contenido y se oculta
la ilustración grande. Se reutilizan los colores, tipografía, Input, Alert y
Button existentes. Los adornos no se anuncian al lector de pantalla; las
etiquetas, foco y mensajes del formulario se conservan.

El cambio visual original no alteró autenticación. Posteriormente se añadió
reCAPTCHA v2 obligatorio al envío y su verificación en el backend; véase
`RECAPTCHA_LOGIN_INTEGRATION.md`. Se conservan cookies, JWT, sesión, diseño y
navegación de recuperación/registro. Resultados históricos del cambio visual
en `IMPLEMENTATION_VALIDATION.md`; pruebas de CAPTCHA en su documento específico.
