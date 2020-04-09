describe("Search Query", () => {
  beforeEach(() => {
    cy.login();

    cy.request("POST", "api/queries", {
      name: "Users Count",
      data_source_id: 1,
      query: "SELECT 1",
    });

    cy.request("POST", "api/queries", {
      name: "Dashboards Count",
      data_source_id: 1,
      query: "SELECT 1",
    });

    cy.visit("/");
  });

  it("finds queries by name", () => {
    cy.getByTestId("AppHeaderSearch").type("Users{enter}");
    cy.contains("Users Count");
  });
});
