import { describe, expect, it } from "vitest";
import { isSafeUrl, parsePost, renderInline, renderMarkdown } from "./markdown.mjs";

const post = (front: string, body = "Hello **world**.") => `---\n${front}\n---\n\n${body}\n`;
const valid = [
  "title: A good post",
  "description: A description that is long enough to pass the fifty character minimum.",
  "date: 2026-11-05",
].join("\n");

describe("renderMarkdown", () => {
  it("escapes raw HTML everywhere, so a post can never inject markup or scripts", () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n## <img src=x onerror=alert(1)>\n\n- <b>x</b>\n\n> <iframe>\n\n`<code>`');
    expect(html).not.toMatch(/<script|<img|<b>|<iframe|onerror=alert\(1\)>/);
    expect(html).toContain("&lt;script&gt;");
  });

  it("only allows http(s), mailto, site-relative and #anchor links", () => {
    expect(renderInline("[ok](/faq/)")).toBe('<a href="/faq/">ok</a>');
    expect(renderInline("[ok](https://example.org/a?b=1&c=2)")).toBe('<a href="https://example.org/a?b=1&amp;c=2" rel="noopener">ok</a>');
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.example/x", "vbscript:x"]) {
      expect(isSafeUrl(bad), bad).toBe(false);
      expect(() => renderInline(`[x](${bad})`), bad).toThrow();
    }
  });

  it("renders the supported subset", () => {
    const html = renderMarkdown("## Title\n\nPara with `code`, **bold** and *em*.\n\n- a\n- b\n\n1. one\n2. two\n\n```js\nconst a = 1 < 2;\n```\n\n---\n\n> quoted");
    expect(html).toContain('<h2 id="title">Title</h2>');
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>em</em>");
    expect(html).toContain("<ul><li>a</li><li>b</li></ul>");
    expect(html).toContain("<ol><li>one</li><li>two</li></ol>");
    expect(html).toContain('<pre><code class="language-js">const a = 1 &lt; 2;</code></pre>');
    expect(html).toContain("<hr>");
    expect(html).toContain("<blockquote><p>quoted</p></blockquote>");
  });

  it("refuses a # heading (the title is the page's only h1) and unclosed code blocks", () => {
    expect(() => renderMarkdown("# Big")).toThrow(/##/);
    expect(() => renderMarkdown("```\nnever closed")).toThrow(/Unclosed/);
  });

  it("gives repeated headings unique ids", () => {
    expect(renderMarkdown("## Same\n\n## Same")).toContain('id="same-2"');
  });
});

describe("parsePost", () => {
  it("reads a valid post", () => {
    const p = parsePost("2026-11-05-a-good-post.md", post(`${valid}\ntags: news, vibe coding\nauthor: Team`));
    expect(p).toMatchObject({ slug: "a-good-post", date: "2026-11-05", updated: "2026-11-05", draft: false, tags: ["news", "vibe coding"], author: "Team" });
    expect(p.html).toBe("<p>Hello <strong>world</strong>.</p>");
  });

  it("rejects bad file names, missing or invalid fields and unknown fields", () => {
    expect(() => parsePost("Bad Name.md", post(valid))).toThrow(/YYYY-MM-DD-slug/);
    expect(() => parsePost("2026-11-05-x.md", "no front matter")).toThrow(/front matter/);
    expect(() => parsePost("2026-11-05-x.md", post(valid.replace("A good post", "")))).toThrow(/title/);
    expect(() => parsePost("2026-11-05-x.md", post(valid.replace(/description: .*/, "description: short")))).toThrow(/description/);
    expect(() => parsePost("2026-11-06-x.md", post(valid))).toThrow(/must match/);
    expect(() => parsePost("2026-11-05-x.md", post(valid.replace("2026-11-05", "2026-02-30")))).toThrow(/date/);
    expect(() => parsePost("2026-11-05-x.md", post(`${valid}\nupdated: 2026-01-01`))).toThrow(/updated/);
    expect(() => parsePost("2026-11-05-x.md", post(`${valid}\ndraft: maybe`))).toThrow(/draft/);
    expect(() => parsePost("2026-11-05-x.md", post(`${valid}\nscript: x`))).toThrow(/unknown/);
  });

  it("marks drafts", () => {
    expect(parsePost("2026-11-05-x.md", post(`${valid}\ndraft: true`)).draft).toBe(true);
  });
});
