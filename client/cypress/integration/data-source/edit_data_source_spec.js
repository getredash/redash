describe("Edit Data Source", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/data_sources/1");
  });

  it("renders the page", () => {
    cy.getByTestId("DataSource").within(() => {
      cy.getByTestId("Name").should("have.value", "Test PostgreSQL");
      cy.getByTestId("Host").should("have.value", "postgres");
    });
  });
});
