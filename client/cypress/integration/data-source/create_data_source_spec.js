describe("Create Data Source", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/data_sources/new");
  });

  it("renders the page and takes a screenshot", () => {
    cy.getByTestId("CreateSourceDialog").should("contain", "PostgreSQL");
    cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.percySnapshot("Create Data Source - Types");
  });

  it("creates a new PostgreSQL data source", () => {
    cy.getByTestId("SearchSource").type("PostgreSQL");
    cy.getByTestId("CreateSourceDialog")
      .contains("PostgreSQL")
      .click();

    cy.getByTestId("Name").type("Redash");
    cy.getByTestId("Host").type("postgres");
    cy.getByTestId("User").type("postgres");
    cy.getByTestId("Password").type("postgres");
    cy.getByTestId("Database Name").type("postgres{enter}");
    cy.getByTestId("CreateSourceButton").click();

    cy.contains("Saved.");
  });
});
