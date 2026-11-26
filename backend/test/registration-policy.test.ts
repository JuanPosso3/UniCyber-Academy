import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRegister, validateLogin } from '../src/application/auth/auth.validation.js';
import { hashPassword, verifyPassword } from '../src/infrastructure/security/password.js';

test('registration policy rejects each missing requirement on client and server', async () => {
  const { hasPasswordComplexity: clientPolicy } = await import(new URL('../../frontend/src/lib/password.ts', import.meta.url).href) as { hasPasswordComplexity: (value: string) => boolean };
  const cases: Array<[string, boolean]> = [
    ['Ab1!', false], ['minuscula1!', false], ['MAYUSCULA1!', false],
    ['SinNumeros!', false], ['SinSimbolos1', false], ['SinSimbolos1 ', false],
    ['Segura123!', true], ['ÁrbolSeguro1!', true],
  ];
  for (const [password, expected] of cases) {
    assert.equal(clientPolicy(password), expected);
    assert.equal(validateRegister({ firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.test', password }).ok, expected);
  }
  assert.equal(validateLogin({ email: 'ana@example.test', password: 'antigua' }).ok, true);
});

test('valid registration password retains salted hashing', async () => {
  const password = 'Segura123!';
  const hash = await hashPassword(password);
  assert.notEqual(hash, password);
  assert.ok(await verifyPassword(password, hash));
  assert.equal(await verifyPassword('Incorrecta1!', hash), false);
});
