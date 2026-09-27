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

  test("handles empty input", () => {
    expect(markdownToHtml(undefined)).toBe("");
    expect(markdownToHtml(null)).toBe("");
  });
});
