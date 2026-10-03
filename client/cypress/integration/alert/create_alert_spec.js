describe("Create Alert", () => {
  beforeEach(() => {
    cy.login();
  });

  it("renders the initial page", () => {
    cy.visit("/alerts/new");
    cy.getByTestId("QuerySelector").should("exist");
  });

  it("selects query", () => {
    cy.createQuery({ name: "Create Alert Query" }).then(({ id: queryId }) => {
      cy.visit("/alerts/new");
      cy.getByTestId("QuerySelector").click().type("Create Alert Query");
      cy.get(`.query-selector-result[data-test="QueryId${queryId}"]`).click();
      cy.getByTestId("Criteria").should("exist");
    });
  });
});
