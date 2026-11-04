import type { ReactNode } from "react";

const TOKEN_PATTERN =
  /(\*\*[^*]+\*\*|==[^=]+==|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function renderLink(token: string, key: number): ReactNode {
  const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);

  if (!match) {
    return token;
  }

  const label = match[1]!;
  const url = match[2]!.trim();

  if (!isSafeUrl(url)) {
    return label;
  }

  return (
    <a
      key={key}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:text-white"
    >
      {label}
    </a>
  );
}

/**
 * Renderiza el formato básico permitido sin interpretar HTML.
 *
 * Marcas admitidas: **negrita**, *cursiva*, ==resaltado== y
 * [texto](https://url). Los enlaces solo aceptan http/https.
 */
export function InlineText({ text }: { text: string }) {
  const parts = text.split(TOKEN_PATTERN);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) {
          return null;
        }

        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }

        if (part.startsWith("==") && part.endsWith("==")) {
          return (
            <mark
              key={index}
              className="rounded bg-warning/20 px-0.5 text-warning"
            >
              {part.slice(2, -2)}
            </mark>
          );
        }

        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={index}>{part.slice(1, -1)}</em>;
        }

        if (part.startsWith("[") && part.includes("](")) {
          return renderLink(part, index);
        }

        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
