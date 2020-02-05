import { createAlert, createQuery } from "../../support/redash-api";

describe("Edit Alert", () => {
  beforeEach(() => {
    cy.login();
  });

  it("renders the page and takes a screenshot", () => {
    createQuery({ query: "select 1 as col_name" })
      .then(({ id: queryId }) => createAlert(queryId, { column: "col_name" }))
      .then(({ id: alertId }) => {
        cy.visit(`/alerts/${alertId}/edit`);
        cy.getByTestId("Criteria").should("exist");
        cy.percySnapshot("Edit Alert screen");
      });
  });

  it("edits the notification template and takes a screenshot", () => {
    createQuery()
      .then(({ id: queryId }) => createAlert(queryId, { custom_subject: "FOO", custom_body: "BAR" }))
      .then(({ id: alertId }) => {
        cy.visit(`/alerts/${alertId}/edit`);
        cy.getByTestId("AlertCustomTemplate").should("exist");
        cy.percySnapshot("Alert Custom Template screen");
      });
  });

  it("previews rendered template correctly", () => {
    const options = {
      value: "123",
      op: "==",
      custom_subject: "{{ ALERT_CONDITION }}",
      custom_body: "{{ ALERT_THRESHOLD }}",
    };

    createQuery()
      .then(({ id: queryId }) => createAlert(queryId, options))
      .then(({ id: alertId }) => {
        cy.visit(`/alerts/${alertId}/edit`);
        cy.get(".alert-template-preview").click();
        cy.getByTestId("CustomSubject").should("have.value", options.op);
        cy.getByTestId("CustomBody").should("have.value", options.value);
      });
  });
});
