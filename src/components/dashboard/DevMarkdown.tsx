import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * A product's progress file, rendered as collapsible sections (one per "##" heading) so a
 * 1,000-line tracker stays readable on a phone. Raw HTML in the files is dropped, images are not
 * loaded, and relative links resolve to the file on GitHub and open in a new tab.
 */
export function DevMarkdown({ markdown, base, openSections = 2 }: { markdown: string; base: string; openSections?: number }) {
  const { intro, sections } = splitSections(markdown);
  const components: Components = {
    a: ({ href, children }) => {
      const url = resolve(href, base);
      if (!url) return <>{children}</>;
      if (url.startsWith("#")) return <a href={url}>{children}</a>;
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
    img: () => null,
    h1: () => null, // the section already carries the file's title
  };
  const md = (text: string) => (
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
      {text}
    </ReactMarkdown>
  );
  return (
    <div className="dash-md">
      {intro.trim() ? <div className="dash-md-intro">{md(intro)}</div> : null}
      {sections.map((s, i) => (
        <details key={`${i}-${s.title}`} open={i < openSections} className="dash-md-section">
          <summary>{s.title.replace(/[*_`]/g, "")}</summary>
          <div className="dash-md-body">{md(s.body)}</div>
        </details>
      ))}
    </div>
  );
}

function splitSections(markdown: string): { intro: string; sections: { title: string; body: string }[] } {
  const lines = markdown.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const sections: { title: string; body: string }[] = [];
  const intro: string[] = [];
  let current: { title: string; lines: string[] } | null = null;
  let fence = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const h2 = !fence && line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (h2) {
      if (current) sections.push({ title: current.title, body: current.lines.join("\n") });
      current = { title: h2[1], lines: [] };
    } else if (current) current.lines.push(line);
    else intro.push(line);
  }
  if (current) sections.push({ title: current.title, body: current.lines.join("\n") });
  return { intro: intro.join("\n"), sections };
}

function resolve(href: string | undefined, base: string): string | null {
  if (!href) return null;
  if (href.startsWith("#")) return href;
  try {
    const u = new URL(href, base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
