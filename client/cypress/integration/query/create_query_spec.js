describe("Create Query", () => {
  const DEFAULT_DATA_SOURCE_NAME = "Test PostgreSQL";

  function ensureDataSourceSelected() {
    cy.getByTestId("SelectDataSource")
      .should("be.visible")
      .then(($select) => {
        const selectedText = $select.text().trim();

        if (selectedText.includes(DEFAULT_DATA_SOURCE_NAME)) {
          return;
        }

        cy.wrap($select).click();
        cy.contains(".ant-select-item-option:visible", DEFAULT_DATA_SOURCE_NAME).click();
      });
  }

  beforeEach(() => {
    cy.login();
    cy.visit("/queries/new");
  });

  it("executes and saves a query", () => {
    ensureDataSourceSelected();

    cy.getByTestId("QueryEditor").typeInAce("SELECT id, name FROM organizations", {
      replace: true,
      delay: 5,
    });

    cy.getByTestId("ExecuteButton").should("be.enabled").click();

    cy.getByTestId("QueryPageVisualizationTabs", { timeout: 10000 }).should("exist");
    cy.getByTestId("TableVisualization").should("exist");
    cy.percySnapshot("Edit Query");

    cy.getByTestId("SaveButton").click();
    cy.url().should("match", /\/queries\/.+\/source/);
  });
});
