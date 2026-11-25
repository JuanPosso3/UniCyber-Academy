# Checklist de producción

Estado: acciones manuales pendientes de verificación por el responsable. Ninguna casilla implica que se haya accedido a paneles privados ni que los cambios estén desplegados. La auditoría está cerrada en código y pruebas; estas casillas son la puerta de despliegue.

## Activación del limitador compartido (requiere autorización)

- [ ] Autorizar la creación de la tabla `unicyber_rate_limit` en la base utilizada por Render.
- [ ] Ejecutar `pnpm --filter backend rate-limit:init` con la `DATABASE_URL` correcta; verificar que la tabla y el índice existen.
- [ ] Configurar `RATE_LIMIT_STORE=postgres` en Render.
- [ ] Verificar el fail-closed: si el almacén no responde, las rutas sensibles deben devolver 503 y no conceder el intento.
- [ ] Probar dos instancias: agotar un límite en una y confirmar rechazo en la otra.
- [ ] No exponer la clave de limitación ni correos en logs; el mensaje de error es genérico.

## Vercel

- [ ] Confirmar que `/api` y `/api/:path*` siguen siendo rewrite same-origin hacia Render.
- [ ] Confirmar el dominio público real y configurar `APP_ORIGINS` con ese origen exacto en el backend.
- [ ] Desplegar los headers revisados y comprobar en el sitio público CSP, `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy y no-store.
- [ ] Verificar Google Fonts y estilos de progreso bajo la CSP sin habilitar scripts en línea.
- [ ] Confirmar que no hay secretos en variables `VITE_*` ni en artefactos públicos.

## Render

- [ ] Confirmar `NODE_ENV=production`, cookie `Secure`, `JWT_EXPIRES_IN=2h` y `RESEND_FROM_EMAIL` verificado.
- [ ] Revisar la entropía de `JWT_SECRET` sin imprimirlo; cualquier rotación requiere autorización e invalida sesiones.
- [ ] Verificar número real de instancias, par inmediato y tratamiento de `X-Forwarded-For`; solo entonces completar `TRUSTED_PROXY_CIDRS`. No fijar `trust proxy = 1` sin evidencia.
- [ ] Repetir pruebas CSRF en el dominio real: origen confiable, origen externo, `Origin: null`, Referer ausente, subdominio same-site y logout sin body.
- [ ] Medir scrypt `N=65536` bajo concurrencia de staging antes de desplegar; ajustar infraestructura si la latencia o memoria son inaceptables.
- [ ] Confirmar logs sin credenciales ni datos personales y revisar el envío asíncrono ante reinicios del proceso.
- [ ] Confirmar que el proveedor de correo y el remitente están configurados; la recuperación no debe revelar existencia de cuenta.

## Neon

- [ ] Verificar TLS con verificación completa y privilegios efectivos del usuario de la aplicación.
- [ ] Verificar backups, retención y procedimiento de restauración en entorno aislado.
- [ ] Confirmar restricciones de acceso del plan contratado.
- [ ] No reaplicar baseline ni reimportar datos. Esta auditoría no requiere migración de esquema.

## Puerta de cierre operativo

- [ ] Desplegar los cambios autorizados.
- [ ] Ejecutar regresión de sesión, permisos, cursos, laboratorios y evaluación en staging.
- [ ] Repetir las pruebas de navegador y cabeceras contra el dominio público.
- [ ] Registrar las evidencias reales de producción. Hasta entonces, no afirmar que Vercel, Render o Neon están verificados.
