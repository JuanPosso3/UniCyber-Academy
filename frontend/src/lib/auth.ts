import type { UserRole } from "../types/auth";

/**
 * Rol administrativo efectivo. El contrato histórico de la base de
 * datos conserva `ADMINISTRATIVE`; la interfaz lo presenta como
 * administrador sin introducir roles adicionales ni alterar el enum.
 */
export function isAdminRole(role: UserRole): boolean {
  return role === "ADMINISTRATIVE";
}
