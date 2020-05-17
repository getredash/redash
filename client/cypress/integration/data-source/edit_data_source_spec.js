describe("Edit Data Source", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/data_sources/1");
  });

  it("renders the page and takes a screenshot", () => {
    cy.getByTestId("DataSource").within(() => {
      cy.getByTestId("Name").should("have.value", "Test PostgreSQL");
      cy.getByTestId("Host").should("have.value", "postgres");
    });

    cy.percySnapshot("Edit Data Source - PostgreSQL");
  });
});
