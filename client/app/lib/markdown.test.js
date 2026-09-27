import sanitize from "@/services/sanitize";
import markdownToHtml from "./markdown";

describe("markdownToHtml", () => {
  test("renders Markdown", () => {
    expect(markdownToHtml("**bold** and [link](https://redash.io)")).toBe(
      '<p><strong>bold</strong> and <a href="https://redash.io">link</a></p>\n'
    );
  });

  test("shows raw HTML as text", () => {
    expect(markdownToHtml("<b>bold</b> text")).toBe("<p>&lt;b&gt;bold&lt;/b&gt; text</p>\n");
    expect(markdownToHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  test("renders GitHub-flavored Markdown", () => {
    expect(markdownToHtml("~~old~~ https://redash.io")).toBe(
      '<p><del>old</del> <a href="https://redash.io">https://redash.io</a></p>\n'
    );
    expect(markdownToHtml("| a | b |\n| - | - |\n| 1 | 2 |")).toContain("<table>");
  });

  test("unsafe links don't survive sanitization", () => {
    const scheme = "javascript"; // (not written as a script URL, which linters flag)
    const html = sanitize(markdownToHtml(`[click](${scheme}:alert(1))`));
    expect(html).not.toContain(scheme);
    expect(html).toContain("click");
  });

  test("handles empty input", () => {
    expect(markdownToHtml(undefined)).toBe("");
    expect(markdownToHtml(null)).toBe("");
  });
});
