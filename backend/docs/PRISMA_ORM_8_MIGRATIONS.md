# Migraciones con Prisma ORM 8

## Importante: esta versión no usa el flujo de Prisma 6/7

Prisma ORM 8 no usa `schema.prisma`, `@prisma/client`, `prisma migrate dev` ni
`prisma migrate deploy`. En este proyecto el flujo real es:

```text
contract.prisma
  -> prisma contract emit
  -> contract.json / contract.d.ts
  -> prisma migration plan
  -> paquete de migración en migrations/app/
  -> prisma db migrate
```

Los comandos de Prisma 6/7 no son compatibles y no deben introducirse.

## Estado inicial encontrado

El repositorio tenía:

- Cinco snapshots en `backend/migrations/snapshots/`.
- Cero paquetes de migración en `backend/migrations/app/`.
- Una referencia `migrations/app/refs/db.json` que apuntaba a
  `2c3ee0e049a74a92cbc0364ca54d685d3d7279dcc7e2a6739df998e08582fcab`.
- Un grafo vacío: `0 contract(s), 0 migration(s)`.
- Una falla de integridad:

```text
MIGRATION.CHECK_DANGLING_REF
Ref "db" points at 2c3ee0... which does not exist in the migration graph.
```

La base local sí estaba marcada y sincronizada con el contrato
`2c3ee0...`. El problema no era la base de datos: era que los snapshots se
habían creado con operaciones de firma/actualización (`db sign` / `db update`)
y nunca se había generado un paquete de migración.

Un snapshot **no** es una migración. El snapshot guarda el contrato emitido; el
paquete de migración describe la transición entre dos contratos. Por eso la
referencia `db` apuntaba a un hash que existía como snapshot pero no como nodo
del grafo.

## Snapshots existentes

| Snapshot | Fecha | Modelos | Observación |
| --- | --- | ---: | --- |
| `1fd3815e...` | 2026-10-14 | 10 | Contrato inicial sin logros ni recuperación. |
| `d5be31c6...` | 2026-11-05 | 10 | Variante del contrato base. |
| `89e99793...` | 2026-11-05 | 12 | Agrega `Achievement` y `UserAchievement`. |
| `e9f77ebe...` | 2026-11-13 | 13 | Agrega `PasswordReset`. |
| `2c3ee0e0...` | 2026-11-13 | 13 | Contrato canónico actual. |

El `contract.json` actual coincide exactamente con el snapshot `2c3ee0...`
(comparación canónica de JSON, sin depender del orden de claves ni del hash de
archivo). Ese snapshot representa el esquema real de la base local.

No se eliminó ningún snapshot histórico.

## Reconstrucción del grafo

Con el grafo vacío y la referencia `db` apuntando al contrato actual, Prisma
ORM 8 puede generar una línea base desde `null` hasta el contrato referenciado.
Se ejecutó:

```bash
pnpm --filter backend exec prisma migration plan --name baseline_production
```

Resultado real:

```text
from: 2c3ee0e049a74a92cbc0364ca54d685d3d7279dcc7e2a6739df998e08582fcab
to:   2c3ee0e049a74a92cbc0364ca54d685d3d7279dcc7e2a6739df998e08582fcab
baselineDir: migrations/app/20261118T2236_baseline
operations: 56
```

Prisma generó **solo** la línea base `null -> 2c3ee0...`; no inventó un delta
porque el contrato emitido y la referencia eran el mismo contrato.

### Paquete de migración

| Campo | Valor |
| --- | --- |
| Directorio | `backend/migrations/app/20261118T2236_baseline/` |
| Hash de migración | `f8a42cb4d5e2096c9faae6ceff443ee48aa348f6e9a1ebdf69e1b09bfeaa31fb` |
| Contrato origen | `null` (base vacía) |
| Contrato destino | `2c3ee0e049a74a92cbc0364ca54d685d3d7279dcc7e2a6739df998e08582fcab` |
| Operaciones | 56 |
| Tablas creadas | 13 tablas de `public` |

El paquete contiene `migration.json`, `migration.ts` y los artefactos de
soporte que genera Prisma 8.

## Grafo resultante

```text
(empty)
  └── 20261118T2236_baseline
        └── 2c3ee0e0...  [ref: db]
```

Comprobaciones reales:

```bash
pnpm --filter backend exec prisma migration check
# All checks passed

pnpm --filter backend exec prisma migration graph
# 1 space(s), 2 contract(s), 1 migration(s)

pnpm --filter backend exec prisma migration list
# 1 migration(s) on disk
```

La referencia `db` ya resuelve a un nodo del grafo y no hay referencias
colgantes.

## Historial en la base de datos

La tabla interna `prisma_contract.ledger` registra las operaciones aplicadas.

- Base local: cinco entradas históricas sin nombre de migración, producidas
  por los ciclos de firma/actualización anteriores. No son paquetes de
  migración.
- Neon: una entrada correspondiente a `20261118T2236_baseline`.

Esta diferencia es esperada y no afecta los datos académicos. El marcador
(`prisma_contract.marker`) coincide en ambas bases con `2c3ee0...`.

## Flujo para cambios futuros

1. Editar `backend/src/prisma/contract.prisma`.
2. Emitir el contrato:

   ```bash
   pnpm --filter backend exec prisma contract emit
   ```

3. Planificar la migración:

   ```bash
   pnpm --filter backend exec prisma migration plan --name nombre_del_cambio
   ```

4. Revisar `migration.ts`. Si el cambio requiere transformar datos, editar ese
   archivo y volver a emitir según el flujo de Prisma 8. No editar hashes ni
   snapshots a mano.
5. Validar integridad:

   ```bash
   pnpm --filter backend exec prisma migration check
   ```

6. Aplicar primero en local:

   ```bash
   pnpm --filter backend db:migrate
   pnpm --filter backend db:verify
   ```

7. Probar la aplicación y los tests.
8. Aplicar en producción con el procedimiento de
   `PRODUCTION_DATABASE_DEPLOYMENT.md`.
9. Versionar juntos: `contract.prisma`, `contract.json`, `contract.d.ts`,
   `migrations/app/` y `migrations/snapshots/`.

## Advertencia sobre la línea base automática

`migration plan` elige el punto de partida según la referencia `db`, la última
migración o `null`. Si el grafo está vacío y existe una referencia válida,
Prisma puede generar una línea base automática. Antes de aceptar un plan:

- Revisar `from` y `to`.
- Confirmar que `from` no es `null` en una base que ya tiene datos.
- Ejecutar `migration check`.
- Usar `db migrate --show` para ver la ruta sin aplicar nada.

Nunca se debe aceptar un plan que cree un esquema desde cero sobre una base con
datos.

## Diagnóstico de errores

### `MIGRATION.CHECK_DANGLING_REF`

La referencia apunta a un contrato que no tiene nodo en el grafo. La solución
correcta es registrar una línea base o la migración que corresponda. **No** se
debe borrar la referencia ni el snapshot para ocultar el error.

### `MIGRATION.HASH_MISMATCH`

El contrato emitido no coincide con el destino de una migración. Ejecutar
`contract emit`, revisar el plan y crear la migración necesaria. No modificar
hashes manualmente.

### El marcador no coincide (`db verify`)

Hay migraciones pendientes o la base fue alterada por fuera del flujo. Revisar
`db migrate --show`, aplicar la ruta pendiente y volver a verificar. No usar
`db sign` para declarar una base sincronizada sin corregir el esquema.

### Una migración falla a mitad de camino

No ejecutar `migrate reset`. Revisar el error, el estado del marcador y el
ledger, corregir la migración en una nueva migración y restaurar desde respaldo
solo si es necesario. Ver `DATABASE_DATA_MIGRATION.md`.

## Verificación realizada

| Comprobación | Resultado |
| --- | --- |
| `migration check` | `All checks passed` |
| `migration graph` | 1 migración, 2 contratos, 0 referencias colgantes |
| `migration list` | 1 migración en disco |
| `db verify` local | Marcador y esquema coinciden con el contrato |
| `db verify` Neon | Marcador y esquema coinciden con el contrato |
| Ruta pendiente en Neon | `Already up to date — nothing to run` |
