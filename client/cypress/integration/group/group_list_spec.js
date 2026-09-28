describe("Group List", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/groups");
  });

  it("renders the page", () => {
    cy.getByTestId("GroupList").should("exist").and("contain", "admin").and("contain", "default");
  });
});
