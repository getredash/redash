import { createQuery } from "../../../support/redash-api";
import { expectDirtyStateChange } from "../../../support/query/parameters";

describe("Text Parameter", () => {
  beforeEach(() => {
    cy.login();

    const queryData = {
      name: "Text Parameter",
      query: "SELECT '{{test-parameter}}' AS parameter",
      options: {
        parameters: [{ name: "test-parameter", title: "Test Parameter", type: "text" }],
      },
    };

    createQuery(queryData, false).then(({ id }) => cy.visit(`/queries/${id}`));
  });

  it("updates the results after clicking Apply", () => {
    cy.getByTestId("ParameterName-test-parameter")
      .find("input")
      .type("Redash");

    cy.getByTestId("ParameterApplyButton").click();

    cy.getByTestId("TableVisualization").should("contain", "Redash");
  });

  it("sets dirty state when edited", () => {
    expectDirtyStateChange(() => {
      cy.getByTestId("ParameterName-test-parameter")
        .find("input")
        .type("Redash");
    });
  });
});
