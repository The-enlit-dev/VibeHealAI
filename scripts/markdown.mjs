// Blog post parsing for the static site generator (no dependencies).
//
// A post is a Markdown file in site/blog/ named YYYY-MM-DD-slug.md, with front matter:
//
//   ---
//   title: Introducing VibeHeal
//   description: One or two sentences for search results and the blog index.
//   date: 2026-11-05
//   updated: 2026-11-06        (optional)
//   author: The VibeHeal team  (optional)
//   tags: launch, vibe coding  (optional, comma-separated)
//   draft: true                (optional; drafts are never published)
//   ---
//
// The Markdown subset is deliberately small and safe: raw HTML is always escaped, and links may only
// point to http(s), mailto, site-relative paths or #anchors. Supported: ## to #### headings,
// paragraphs, - and 1. lists, > quotes, ``` code blocks, `code`, **bold**, *italic*, [links](url), ---.

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);

export function isSafeUrl(url) {
  return /^(https?:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|\/(?!\/)[^\s"'<>]*|#[\w-]+)$/i.test(url);
}

/** Inline Markdown on one line of text. Escapes first, so nothing in the source can become HTML. */
export function renderInline(text) {
  const codeSpans = [];
  // The private-use character marks code spans below, so strip any from the source first.
  let out = String(text).replace(/\uE000/g, "").replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(`<code>${escape(code)}</code>`);
    return `\uE000${codeSpans.length - 1}\uE000`;
  });
  out = escape(out);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, rawUrl) => {
    const url = rawUrl.replace(/&amp;/g, "&");
    if (!isSafeUrl(url)) throw new Error(`Unsafe or unsupported link in blog post: ${url}`);
    const external = /^https?:\/\//i.test(url);
    return `<a href="${escape(url)}"${external ? ' rel="noopener"' : ""}>${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return out.replace(/\uE000(\d+)\uE000/g, (_, i) => codeSpans[Number(i)]);
}

/** Block-level Markdown to HTML. Headings start at <h2> because the page title is the <h1>. */
export function renderMarkdown(source) {
  const lines = String(source).replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  let i = 0;
  const ids = new Set();

  const headingId = (text) => {
    const base = text.toLowerCase().replace(/`/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
    let id = base;
    for (let n = 2; ids.has(id); n += 1) id = `${base}-${n}`;
    ids.add(id);
    return id;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    const fence = /^```\s*([\w-]*)\s*$/.exec(line);
    if (fence) {
      const code = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
      if (i >= lines.length) throw new Error("Unclosed ``` code block in blog post");
      i += 1;
      const lang = fence[1] ? ` class="language-${escape(fence[1])}"` : "";
      html.push(`<pre><code${lang}>${escape(code.join("\n"))}</code></pre>`);
      continue;
    }
    const heading = /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      if (heading[1].length === 1) throw new Error("Use ## for headings in a blog post; the title is the page's only # heading");
      const level = heading[1].length;
      html.push(`<h${level} id="${headingId(heading[2])}">${renderInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      html.push("<hr>");
      i += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ""));
      html.push(`<blockquote>${renderMarkdown(quote.join("\n"))}</blockquote>`);
      continue;
    }
    const listMatch = /^(\s*)([-*]|\d+\.)\s+/.exec(line);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[2]);
      const items = [];
      while (i < lines.length) {
        const item = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
        if (item && /\d/.test(item[1]) === ordered) {
          items.push(item[2]);
          i += 1;
        } else if (items.length > 0 && /^\s{2,}\S/.test(lines[i])) {
          items[items.length - 1] += ` ${lines[i].trim()}`;
          i += 1;
        } else break;
      }
      const tag = ordered ? "ol" : "ul";
      html.push(`<${tag}>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`);
      continue;
    }
    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(```|#{1,4}\s|>\s?|(\s*)([-*]|\d+\.)\s+|(-{3,}|\*{3,})\s*$)/.test(lines[i])
    ) {
      paragraph.push(lines[i++].trim());
    }
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }
  return html.join("\n");
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  if (!DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Parse one post file. Throws with the file name on any problem, so a bad post fails the build. */
export function parsePost(fileName, source) {
  const name = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/.exec(fileName);
  if (!name) throw new Error(`${fileName}: blog files must be named YYYY-MM-DD-slug.md (lowercase letters, digits, hyphens)`);
  const text = String(source).replace(/\r\n?/g, "\n");
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!fm) throw new Error(`${fileName}: missing front matter (--- ... ---) at the top`);

  const meta = {};
  for (const raw of fm[1].split("\n")) {
    if (raw.trim() === "" || raw.trim().startsWith("#")) continue;
    const kv = /^([a-z]+):\s*(.*)$/.exec(raw);
    if (!kv) throw new Error(`${fileName}: cannot read front matter line "${raw}"`);
    meta[kv[1]] = kv[2].trim().replace(/^"(.*)"$/, "$1");
  }
  const allowed = new Set(["title", "description", "date", "updated", "author", "tags", "draft"]);
  for (const key of Object.keys(meta)) if (!allowed.has(key)) throw new Error(`${fileName}: unknown front matter field "${key}"`);

  if (!meta.title || meta.title.length > 90) throw new Error(`${fileName}: title is required (at most 90 characters)`);
  if (!meta.description || meta.description.length < 50 || meta.description.length > 300) {
    throw new Error(`${fileName}: description is required (50 to 300 characters)`);
  }
  if (!validDate(meta.date ?? "")) throw new Error(`${fileName}: date must be YYYY-MM-DD`);
  if (meta.date !== name[1]) throw new Error(`${fileName}: date (${meta.date}) must match the file name date (${name[1]})`);
  if (meta.updated && (!validDate(meta.updated) || meta.updated < meta.date)) {
    throw new Error(`${fileName}: updated must be YYYY-MM-DD and not before date`);
  }
  if (meta.draft && !["true", "false"].includes(meta.draft)) throw new Error(`${fileName}: draft must be true or false`);

  const body = text.slice(fm[0].length);
  return {
    slug: name[2],
    file: fileName,
    title: meta.title,
    description: meta.description,
    date: meta.date,
    updated: meta.updated || meta.date,
    author: meta.author || "",
    tags: meta.tags ? meta.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    draft: meta.draft === "true",
    html: renderMarkdown(body),
    words: body.split(/\s+/).filter(Boolean).length,
  };
}
