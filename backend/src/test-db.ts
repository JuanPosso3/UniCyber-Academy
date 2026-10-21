import { db } from './prisma/db.js';

async function testDatabase() {
  try {
    const users = await db.orm.public.User.all();

    console.log('Conexión con PostgreSQL: correcta');
    console.log('Consulta de usuarios ejecutada correctamente');
    console.log('Usuarios encontrados:', users.length);
  } catch (error) {
    console.error('Error al consultar PostgreSQL:', error);
    process.exitCode = 1;
  }
}

testDatabase();
