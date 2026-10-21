import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases condicionales (clsx) y resuelve conflictos de utilidades
 * de Tailwind (tailwind-merge). Usada por todos los componentes del
 * Design System en src/components/ui y src/components/layout.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
