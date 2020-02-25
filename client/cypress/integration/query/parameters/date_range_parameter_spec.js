import { createQuery } from "../../../support/redash-api";
import { expectDirtyStateChange } from "../../../support/query/parameters";

describe("Date Range Parameter", () => {
  const selectCalendarDateRange = (startDate, endDate) => {
    cy.getByTestId("ParameterName-test-parameter")
      .find("input")
      .first()
      .click();

    cy.get(".ant-calendar-date-panel")
      .contains(".ant-calendar-date", startDate)
      .click();

    cy.get(".ant-calendar-date-panel")
      .contains(".ant-calendar-date", endDate)
      .click();
  };

  beforeEach(() => {
    cy.login();

    const queryData = {
      name: "Date Range Parameter",
      query: "SELECT '{{test-parameter.start}} - {{test-parameter.end}}' AS parameter",
      options: {
        parameters: [{ name: "test-parameter", title: "Test Parameter", type: "date-range" }],
      },
    };

    const now = new Date();
    now.setDate(1);
    cy.wrap(now.getTime()).as("now");
    cy.clock(now.getTime(), ["Date"]);

    createQuery(queryData, false).then(({ id }) => cy.visit(`/queries/${id}/source`));
  });

  afterEach(() => {
    cy.clock().then(clock => clock.restore());
  });

  it("updates the results after selecting a date range", function() {
    selectCalendarDateRange("15", "20");

    cy.getByTestId("ParameterApplyButton").click();

    const now = Cypress.moment(this.now);
    cy.getByTestId("TableVisualization").should("contain", now.format("YYYY-MM-15") + " - " + now.format("YYYY-MM-20"));
  });

  it("allows picking a dynamic date range", function() {
    cy.getByTestId("DynamicButton").click();

    cy.getByTestId("DynamicButtonMenu")
      .contains("Last month")
      .click();

    cy.getByTestId("ParameterApplyButton").click();

    const lastMonth = Cypress.moment(this.now).subtract(1, "month");
    cy.getByTestId("TableVisualization").should(
      "contain",
      lastMonth.startOf("month").format("YYYY-MM-DD") + " - " + lastMonth.endOf("month").format("YYYY-MM-DD")
    );
  });

  it("sets dirty state when edited", () => {
    expectDirtyStateChange(() => selectCalendarDateRange("15", "20"));
  });
});
