import { ExternalLink } from "lucide-react";
import { InlineText } from "./InlineText";
import { TheoryCallout } from "./TheoryCallout";
import type {
  TheoryBlock,
  TheoryContent,
  TheoryHeadingBlock,
  TheoryListBlock,
  TheoryTableBlock,
} from "../../types/lesson";

function HeadingBlock({ block }: { block: TheoryHeadingBlock }) {
  const className =
    block.level === 3
      ? "text-base font-semibold text-white"
      : "text-lg font-bold text-white";

  if (block.level === 3) {
    return (
      <h3 className={className}>
        <InlineText text={block.content} />
      </h3>
    );
  }

  return (
    <h2 className={className}>
      <InlineText text={block.content} />
    </h2>
  );
}

function ListBlock({ block }: { block: TheoryListBlock }) {
  const items = block.items.map((item, index) => (
    <li key={`${block.id}-${index}`} className="pl-1">
      <InlineText text={item} />
    </li>
  ));

  if (block.style === "ordered") {
    return (
      <ol className="list-decimal space-y-2 pl-6 text-sm leading-7 text-muted-foreground">
        {items}
      </ol>
    );
  }

  return (
    <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-muted-foreground">
      {items}
    </ul>
  );
}

function TableBlock({ block }: { block: TheoryTableBlock }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        {block.caption && (
          <caption className="border-b border-border bg-white/5 px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
            {block.caption}
          </caption>
        )}
        <thead className="bg-white/5">
          <tr>
            {block.headers.map((header, index) => (
              <th
                key={`${block.id}-header-${index}`}
                scope="col"
                className="border-b border-border px-4 py-3 text-xs font-bold uppercase tracking-wide text-white"
              >
                <InlineText text={header} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={`${block.id}-row-${rowIndex}`} className="odd:bg-white/[0.02]">
              {row.map((cell, cellIndex) => (
                <td
                  key={`${block.id}-cell-${rowIndex}-${cellIndex}`}
                  className="border-b border-border/70 px-4 py-3 align-top text-muted-foreground last:border-b-0"
                >
                  <InlineText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({
  content,
  language,
}: {
  content: string;
  language?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-[#0A1020]">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {language ?? "Código ilustrativo"}
        </span>
        <span className="text-[10px] text-muted-foreground">No ejecutable</span>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6 text-slate-200">
        <code>{content}</code>
      </pre>
    </div>
  );
}

function Block({ block }: { block: TheoryBlock }) {
  switch (block.type) {
    case "heading":
      return <HeadingBlock block={block} />;
    case "paragraph":
      return (
        <p className="text-sm leading-7 text-muted-foreground">
          <InlineText text={block.content} />
        </p>
      );
    case "list":
      return <ListBlock block={block} />;
    case "table":
      return <TableBlock block={block} />;
    case "code":
      return <CodeBlock content={block.content} language={block.language} />;
    case "callout":
      return <TheoryCallout variant={block.variant} content={block.content} />;
    case "link":
      return (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-2xl border border-border bg-white/5 p-4 transition-colors hover:border-accent/40 hover:bg-accent/5"
        >
          <ExternalLink
            size={16}
            className="mt-0.5 flex-shrink-0 text-accent"
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">
              <InlineText text={block.label} />
            </span>
            {block.description && (
              <span className="mt-1 block text-xs text-muted-foreground">
                <InlineText text={block.description} />
              </span>
            )}
            <span className="mt-1 block truncate text-[11px] text-accent">
              {block.url}
            </span>
          </span>
        </a>
      );
    default:
      return null;
  }
}

export function TheoryRenderer({ content }: { content: TheoryContent }) {
  return (
    <div className="space-y-5">
      {content.blocks.map((block) => (
        <Block key={block.id} block={block} />
      ))}
    </div>
  );
}
