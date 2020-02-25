import { createQuery } from "../../../support/redash-api";
import { expectDirtyStateChange } from "../../../support/query/parameters";

describe("Date Parameter", () => {
  const selectCalendarDate = date => {
    cy.getByTestId("ParameterName-test-parameter")
      .find("input")
      .click();

    cy.get(".ant-calendar-date-panel")
      .contains(".ant-calendar-date", date)
      .click();
  };

  beforeEach(() => {
    cy.login();

    const queryData = {
      name: "Date Parameter",
      query: "SELECT '{{test-parameter}}' AS parameter",
      options: {
        parameters: [{ name: "test-parameter", title: "Test Parameter", type: "date", value: null }],
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

  it("updates the results after selecting a date", function() {
    selectCalendarDate("15");

    cy.getByTestId("ParameterApplyButton").click();

    cy.getByTestId("TableVisualization").should("contain", Cypress.moment(this.now).format("15/MM/YY"));
  });

  it("allows picking a dynamic date", function() {
    cy.getByTestId("DynamicButton").click();

    cy.getByTestId("DynamicButtonMenu")
      .contains("Today/Now")
      .click();

    cy.getByTestId("ParameterApplyButton").click();

    cy.getByTestId("TableVisualization").should("contain", Cypress.moment(this.now).format("DD/MM/YY"));
  });

  it("sets dirty state when edited", () => {
    expectDirtyStateChange(() => selectCalendarDate("15"));
  });
});
