import { createQuery } from "../../support/redash-api";

describe("Create Alert", () => {
  beforeEach(() => {
    cy.login();
  });

  it("renders the initial page and takes a screenshot", () => {
    cy.visit("/alerts/new");
    cy.getByTestId("QuerySelector").should("exist");
    cy.percySnapshot("Create Alert initial screen");
  });

  it("selects query and takes a screenshot", () => {
    createQuery({ name: "Create Alert Query" }).then(({ id: queryId }) => {
      cy.visit("/alerts/new");
      cy.getByTestId("QuerySelector")
        .click()
        .type("Create Alert Query");
      cy.get(`.query-selector-result[data-test="QueryId${queryId}"]`).click();
      cy.getByTestId("Criteria").should("exist");
      cy.percySnapshot("Create Alert second screen");
    });
  });
});
