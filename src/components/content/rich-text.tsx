/**
 * Renders admin-authored page bodies safely. Supports a minimal markdown subset
 * (## headings, - lists, [text](url) links, paragraphs) without injecting raw HTML.
 */
function inline(text: string, key: string) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(((?:https?:\/\/|\/|mailto:)[^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<a key={`${key}-${i++}`} href={m[2]}>{m[1]}</a>);
    else parts.push(<strong key={`${key}-${i++}`}>{m[3]}</strong>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function RichText({ body }: { body: string }) {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="prose-lyrit">
      {blocks.map((block, i) => {
        const t = block.trim();
        if (t.startsWith("## ")) return <h2 key={i}>{inline(t.slice(3), `h${i}`)}</h2>;
        const lines = t.split("\n");
        if (lines.every((l) => l.trim().startsWith("- ")))
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.trim().slice(2), `l${i}-${j}`)}</li>)}</ul>;
        return <p key={i}>{inline(t, `p${i}`)}</p>;
      })}
    </div>
  );
}
