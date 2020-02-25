import { createQuery } from "../../../support/redash-api";

describe("Parameter Settings", () => {
  beforeEach(() => {
    cy.login();

    const queryData = {
      name: "Draggable",
      query: "SELECT '{{parameter}}' AS parameter",
      options: {
        parameters: [{ name: "parameter", title: "Parameter", type: "text" }],
      },
    };

    createQuery(queryData, false).then(({ id }) => cy.visit(`/queries/${id}/source`));

    cy.getByTestId("ParameterSettings-parameter").click();
  });

  it("changes the parameter title", () => {
    cy.getByTestId("ParameterTitleInput").type("{selectall}New Parameter Name");
    cy.getByTestId("SaveParameterSettings").click();

    cy.contains("Query saved");
    cy.reload();

    cy.getByTestId("ParameterName-parameter").contains("label", "New Parameter Name");
  });
});
