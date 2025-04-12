describe("Create Query Snippet", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/query_snippets/new");
  });

  it("creates a query snippet with an empty description", () => {
    // delete existing "example-snippet"
    cy.request("GET", "api/query_snippets")
      .then(({ body }) => body.filter(snippet => snippet.trigger === "example-snippet"))
      .each(snippet => cy.request("DELETE", `api/query_snippets/${snippet.id}`));

    cy.getByTestId("QuerySnippetDialog").within(() => {
      cy.getByTestId("Trigger").type("example-snippet");
      cy.getByTestId("Snippet")
        .find(".ace_text-input")
        .type("SELECT 1", { force: true });
    });

    cy.getByTestId("SaveQuerySnippetButton").click();
  });
});
