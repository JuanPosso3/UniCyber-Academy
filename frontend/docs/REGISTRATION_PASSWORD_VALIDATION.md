# Seguridad de contraseña en registro

`src/lib/password.ts` valida al menos ocho caracteres, mayúscula y minúscula
Unicode, dígito 0–9 y símbolo distinto de letra, número o espacio. Se conserva
el máximo de 128 caracteres. Los espacios no satisfacen el requisito de símbolo.

`Register.tsx` impide enviar valores inválidos y muestra en español las reglas.
Un desplegable nativo `details/summary`, con icono informativo junto al campo,
funciona con teclado y dispositivos táctiles. Se mantiene la confirmación y
el resto de validaciones. No cambia el comportamiento de contraseñas antiguas
en login, recuperación o perfil. El backend aplica la misma política al registro;
la prueba `registration-policy.test.ts` compara ambas implementaciones.
