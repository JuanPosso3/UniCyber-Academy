# Política de contraseña de registro

`application/auth/auth.validation.ts` invoca `domain/password-policy.ts` antes
de crear cuentas: mínimo ocho caracteres, una mayúscula, una minúscula, un
dígito y un símbolo no blanco. Se mantienen el máximo de 128 y el formato
`VALIDATION_ERROR`, con mensaje español en `fields.password`.

No se modifica `hashPassword`: scrypt con sal aleatoria y parámetros actuales.
No se registran contraseñas ni se alteran cuentas existentes. Login, cambio y
recuperación conservan sus validaciones previas para no ampliar el alcance.

`registration-policy.test.ts` verifica cada requisito, equivalencia con el
cliente, aceptación válida y hash. `registration-http.test.ts` verifica envíos
HTTP directos inválidos, registro válido, hash persistido e inicio de sesión.
`security-integration.test.ts` también incorpora estos rechazos dentro de su
suite aislada, cuya ejecución depende de la base específica de seguridad.
Resultados y limitaciones en `../../frontend/docs/IMPLEMENTATION_VALIDATION.md`.
