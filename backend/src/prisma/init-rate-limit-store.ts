import 'dotenv/config';
import { initializeRateLimitTable } from '../infrastructure/security/rate-limit.js';

/**
 * Crea la tabla del limitador compartido de intentos.
 *
 * Es una operación explícita: no se ejecuta al arrancar la aplicación.
 * Requiere autorización antes de aplicarse a una base de producción.
 */
async function main(): Promise<void> {
  await initializeRateLimitTable();
  console.log('Tabla unicyber_rate_limit creada o ya existente.');
}

await main();
