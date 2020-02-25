import { createQuery } from "../../../support/redash-api";
import { expectDirtyStateChange } from "../../../support/query/parameters";

describe("Number Parameter", () => {
  beforeEach(() => {
    cy.login();

    const queryData = {
      name: "Number Parameter",
      query: "SELECT '{{test-parameter}}' AS parameter",
      options: {
        parameters: [{ name: "test-parameter", title: "Test Parameter", type: "number" }],
      },
    };

    createQuery(queryData, false).then(({ id }) => cy.visit(`/queries/${id}`));
  });

  it("updates the results after clicking Apply", () => {
    cy.getByTestId("ParameterName-test-parameter")
      .find("input")
      .type("{selectall}42");

    cy.getByTestId("ParameterApplyButton").click();

    cy.getByTestId("TableVisualization").should("contain", 42);

    cy.getByTestId("ParameterName-test-parameter")
      .find("input")
      .type("{selectall}31415");

    cy.getByTestId("ParameterApplyButton").click();

    cy.getByTestId("TableVisualization").should("contain", 31415);
  });

  it("sets dirty state when edited", () => {
    expectDirtyStateChange(() => {
      cy.getByTestId("ParameterName-test-parameter")
        .find("input")
        .type("{selectall}42");
    });
  });
});
