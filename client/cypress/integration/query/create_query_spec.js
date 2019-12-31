describe("Create Query", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/queries/new");
  });

  it("executes and saves a query", () => {
    cy.clickThrough(`
      SelectDataSource
      SelectDataSource1
    `);

    cy.getByTestId("QueryEditor")
      .get(".ace_text-input")
      .type("SELECT id, name FROM organizations{esc}", { force: true });
    // QueryEditor::onChange is debounced, so this wait is needed
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting

    cy.getByTestId("ExecuteButton")
      .should("be.enabled")
      .click();

    cy.getByTestId("TableVisualization").should("exist");
    cy.percySnapshot("Edit Query");

    cy.getByTestId("SaveButton").click();
    cy.url().should("match", /\/queries\/\d+\/source/);
  });
});
