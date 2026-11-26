# Presentación del inicio de sesión

`Login.tsx` activa la variante `featured` de `AuthLayout`: composición de dos
columnas en escritorio, escudo decorativo y lema exacto «Construye tus
habilidades. Defiende el futuro.». En móvil se apila el contenido y se oculta
la ilustración grande. Se reutilizan los colores, tipografía, Input, Alert y
Button existentes. Los adornos no se anuncian al lector de pantalla; las
etiquetas, foco y mensajes del formulario se conservan.

No se modificaron el envío de login, validaciones, contexto, cookies, JWT ni
la navegación de recuperación y registro. Resultados de verificación en
`IMPLEMENTATION_VALIDATION.md`.
