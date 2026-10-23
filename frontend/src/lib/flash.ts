export interface FlashMessage {
  variant: "success" | "error";
  message: string;
}

const STORAGE_KEY = "unicyber.flash";

export function setFlash(message: FlashMessage): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(message));
  } catch {
    // El almacenamiento puede estar deshabilitado; el aviso es opcional.
  }
}

export function consumeFlash(): FlashMessage | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "variant" in parsed &&
      "message" in parsed &&
      (parsed.variant === "success" || parsed.variant === "error") &&
      typeof parsed.message === "string"
    ) {
      return { variant: parsed.variant, message: parsed.message };
    }
  } catch {
    return null;
  }

  return null;
}
