import { createQuery } from "../../../support/redash-api";

describe("Apply Changes", () => {
  const expectAppliedChanges = apply => {
    cy.getByTestId("ParameterName-test-parameter-1")
      .find("input")
      .as("Input")
      .type("Redash");

    cy.getByTestId("ParameterName-test-parameter-2")
      .find("input")
      .type("Redash");

    cy.location("search").should("not.contain", "Redash");

    cy.server();
    cy.route("POST", "api/queries/*/results").as("Results");

    apply(cy.get("@Input"));

    cy.location("search").should("contain", "Redash");
    cy.wait("@Results");
  };

  beforeEach(() => {
    cy.login();

    const queryData = {
      name: "Testing Apply Button",
      query: "SELECT '{{test-parameter-1}} {{ test-parameter-2 }}'",
      options: {
        parameters: [
          { name: "test-parameter-1", title: "Test Parameter 1", type: "text" },
          { name: "test-parameter-2", title: "Test Parameter 2", type: "text" },
        ],
      },
    };

    createQuery(queryData, false).then(({ id }) => cy.visit(`/queries/${id}/source`));
  });

  it("shows and hides according to parameter dirty state", () => {
    cy.getByTestId("ParameterApplyButton").should("not.be", "visible");

    cy.getByTestId("ParameterName-test-parameter-1")
      .find("input")
      .as("Param")
      .type("Redash");

    cy.getByTestId("ParameterApplyButton").should("be", "visible");

    cy.get("@Param").clear();

    cy.getByTestId("ParameterApplyButton").should("not.be", "visible");
  });

  it("updates dirty counter", () => {
    cy.getByTestId("ParameterName-test-parameter-1")
      .find("input")
      .type("Redash");

    cy.getByTestId("ParameterApplyButton")
      .find(".ant-badge-count p.current")
      .should("contain", "1");

    cy.getByTestId("ParameterName-test-parameter-2")
      .find("input")
      .type("Redash");

    cy.getByTestId("ParameterApplyButton")
      .find(".ant-badge-count p.current")
      .should("contain", "2");
  });

  it('applies changes from "Apply Changes" button', () => {
    expectAppliedChanges(() => {
      cy.getByTestId("ParameterApplyButton").click();
    });
  });

  it('applies changes from "alt+enter" keyboard shortcut', () => {
    expectAppliedChanges(input => {
      input.type("{alt}{enter}");
    });
  });

  it('disables "Execute" button', () => {
    cy.getByTestId("ParameterName-test-parameter-1")
      .find("input")
      .as("Input")
      .type("Redash");
    cy.getByTestId("ExecuteButton").should("be.disabled");

    cy.get("@Input").clear();
    cy.getByTestId("ExecuteButton").should("be.enabled");
  });
});
