/**
 * Solo se permiten enlaces absolutos HTTP/HTTPS. Evita que valores
 * almacenados como `javascript:`, `data:` o `vbscript:` lleguen a un
 * atributo `href`.
 */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
