import { createQuery } from "../../../support/redash-api";
import { expectDirtyStateChange } from "../../../support/query/parameters";

describe("Date and Time Parameter", () => {
  beforeEach(() => {
    cy.login();

    const queryData = {
      name: "Date and Time Parameter",
      query: "SELECT '{{test-parameter}}' AS parameter",
      options: {
        parameters: [{ name: "test-parameter", title: "Test Parameter", type: "datetime-local", value: null }],
      },
    };

    const now = new Date();
    now.setDate(1);
    cy.wrap(now.getTime()).as("now");
    cy.clock(now.getTime(), ["Date"]);

    createQuery(queryData, false).then(({ id }) => cy.visit(`/queries/${id}`));
  });

  afterEach(() => {
    cy.clock().then(clock => clock.restore());
  });

  it("updates the results after selecting a date and clicking in ok", function() {
    cy.getByTestId("ParameterName-test-parameter")
      .find("input")
      .as("Input")
      .click();

    cy.get(".ant-calendar-date-panel")
      .contains(".ant-calendar-date", "15")
      .click();

    cy.get(".ant-calendar-ok-btn").click();

    cy.getByTestId("ParameterApplyButton").click();

    cy.getByTestId("TableVisualization").should("contain", Cypress.moment(this.now).format("YYYY-MM-15 HH:mm"));
  });

  it("shows the current datetime after clicking in Now", function() {
    cy.getByTestId("ParameterName-test-parameter")
      .find("input")
      .as("Input")
      .click();

    cy.get(".ant-calendar-date-panel")
      .contains("Now")
      .click();

    cy.getByTestId("ParameterApplyButton").click();

    cy.getByTestId("TableVisualization").should("contain", Cypress.moment(this.now).format("YYYY-MM-DD HH:mm"));
  });

  it("allows picking a dynamic date", function() {
    cy.getByTestId("DynamicButton").click();

    cy.getByTestId("DynamicButtonMenu")
      .contains("Today/Now")
      .click();

    cy.getByTestId("ParameterApplyButton").click();

    cy.getByTestId("TableVisualization").should("contain", Cypress.moment(this.now).format("YYYY-MM-DD HH:mm"));
  });

  it("sets dirty state when edited", () => {
    expectDirtyStateChange(() => {
      cy.getByTestId("ParameterName-test-parameter")
        .find("input")
        .click();

      cy.get(".ant-calendar-date-panel")
        .contains("Now")
        .click();
    });
  });
});
