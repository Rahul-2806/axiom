"use client";

interface Props { content: string }

export function MessageBody({ content }: Props) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={key++} style={{
          background: "#1A1208", borderRadius: 8, margin: "12px 0", overflow: "hidden",
          border: "1px solid rgba(196,146,42,0.15)"
        }}>
          {lang && (
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(196,146,42,0.5)",
              padding: "6px 14px 4px", borderBottom: "1px solid rgba(255,255,255,0.06)",
              letterSpacing: "0.1em", textTransform: "uppercase" as const
            }}>{lang}</div>
          )}
          <pre style={{ margin: 0, padding: "12px 14px", overflowX: "auto" as const }}>
            <code style={{
              fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#E8DDD0",
              lineHeight: 1.7, whiteSpace: "pre" as const
            }}>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // H1
    if (line.startsWith("# ")) {
      elements.push(<h1 key={key++} style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#1A1208", margin: "18px 0 8px", lineHeight: 1.3 }}>{parseInline(line.slice(2))}</h1>);
      i++; continue;
    }

    // H2
    if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: "#1A1208", margin: "16px 0 6px", lineHeight: 1.3 }}>{parseInline(line.slice(3))}</h2>);
      i++; continue;
    }

    // H3
    if (line.startsWith("### ")) {
      elements.push(<h3 key={key++} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#2C1E0F", margin: "14px 0 5px" }}>{parseInline(line.slice(4))}</h3>);
      i++; continue;
    }

    // Horizontal rule
    if (line.trim() === "---" || line.trim() === "***") {
      elements.push(<hr key={key++} style={{ border: "none", borderTop: "1px solid #E8DDD0", margin: "14px 0" }} />);
      i++; continue;
    }

    // Table
    if (line.includes("|") && lines[i + 1]?.includes("---")) {
      const headers = line.split("|").map(h => h.trim()).filter(Boolean);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(lines[i].split("|").map(c => c.trim()).filter(Boolean));
        i++;
      }
      elements.push(
        <div key={key++} style={{ overflowX: "auto" as const, margin: "12px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
            <thead>
              <tr>
                {headers.map((h, j) => (
                  <th key={j} style={{ background: "#F4F1EC", color: "#6B5B3E", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" as const, padding: "7px 12px", textAlign: "left" as const, borderBottom: "2px solid #E8DDD0" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? "#fff" : "#FAF9F7" }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: "7px 12px", borderBottom: "1px solid #E8DDD0", color: "#1A1208", verticalAlign: "top" as const }}>
                      {parseInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Bullet list
    if (line.match(/^[\*\-] /)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^[\*\-] /)) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} style={{ margin: "8px 0", paddingLeft: 20, display: "flex", flexDirection: "column" as const, gap: 4 }}>
          {listItems.map((item, j) => (
            <li key={j} style={{ fontSize: 13, color: "#2C1E0F", lineHeight: 1.7 }}>{parseInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        listItems.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={key++} style={{ margin: "8px 0", paddingLeft: 22, display: "flex", flexDirection: "column" as const, gap: 4 }}>
          {listItems.map((item, j) => (
            <li key={j} style={{ fontSize: 13, color: "#2C1E0F", lineHeight: 1.7 }}>{parseInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: 8 }} />);
      i++; continue;
    }

    // Normal paragraph
    elements.push(
      <p key={key++} style={{ fontSize: 13, color: "#2C1E0F", lineHeight: 1.8, margin: 0 }}>
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return (
    <div style={{ paddingLeft: 33, fontFamily: "'DM Sans', sans-serif" }}>
      {elements}
    </div>
  );
}

// Parse inline: **bold**, *italic*, `code`, [link](url)
function parseInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|`[^`]+`|\[.*?\]\(.*?\))/g;
  let last = 0;
  let match;
  let k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const m = match[0];
    if (m.startsWith("**")) {
      parts.push(<strong key={k++} style={{ fontWeight: 600, color: "#1A1208" }}>{m.slice(2, -2)}</strong>);
    } else if (m.startsWith("*")) {
      parts.push(<em key={k++} style={{ fontStyle: "italic" as const }}>{m.slice(1, -1)}</em>);
    } else if (m.startsWith("`")) {
      parts.push(<code key={k++} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11.5, background: "#F4F1EC", border: "1px solid #E8DDD0", padding: "1px 5px", borderRadius: 4, color: "#C4922A" }}>{m.slice(1, -1)}</code>);
    } else if (m.startsWith("[")) {
      const linkText = m.match(/\[(.*?)\]/)?.[1] ?? "";
      const href = m.match(/\((.*?)\)/)?.[1] ?? "#";
      parts.push(<a key={k++} href={href} target="_blank" rel="noreferrer" style={{ color: "#185FA5", textDecoration: "underline" }}>{linkText}</a>);
    }
    last = match.index + m.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : parts;
}
