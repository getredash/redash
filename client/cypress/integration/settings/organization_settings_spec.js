describe("Settings", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/settings/general");
  });

  it("renders the page and takes a screenshot", () => {
    cy.getByTestId("OrganizationSettings").within(() => {
      cy.getByTestId("TimeFormatSelect").should("contain", "HH:mm");
    });

    cy.percySnapshot("Organization Settings");
  });

  it("can set date format setting", () => {
    cy.getByTestId("DateFormatSelect").click();
    cy.getByTestId("DateFormatSelect:YYYY-MM-DD").click();
    cy.getByTestId("OrganizationSettingsSaveButton").click();

    cy.createQuery({
      name: "test date format",
      query: "SELECT NOW()",
    }).then(({ id: queryId }) => {
      cy.visit(`/queries/${queryId}`);
      cy.findByText("Refresh Now").click();

      // "created at" field is formatted with the date format.
      cy.getByTestId("TableVisualization")
        .findAllByText(/\d{4}-\d{2}-\d{2}/)
        .should("exist");

      // set to a different format and expect a different result in the table
      cy.visit("/settings/general");
      cy.getByTestId("DateFormatSelect").click();
      cy.getByTestId("DateFormatSelect:MM/DD/YY").click();
      cy.getByTestId("OrganizationSettingsSaveButton").click();

      cy.visit(`/queries/${queryId}`);

      cy.getByTestId("TableVisualization")
        .findAllByText(/\d{2}\/\d{2}\/\d{2}/)
        .should("exist");
    });
  });

  it("can set a custom thousands separator", () => {
    cy.intercept("POST", "/api/settings/organization").as("saveSettings");
    cy.getByTestId("ThousandsSeparatorInput").clear().type(" ");
    cy.getByTestId("OrganizationSettingsSaveButton").click();
    cy.wait("@saveSettings");

    // the setting round-trips through the backend
    cy.reload();
    cy.getByTestId("ThousandsSeparatorInput").should("have.value", " ");

    cy.createQuery({
      name: "test thousands separator",
      query: "SELECT 1234567 AS n",
    }).then(({ id: queryId }) => {
      cy.visit(`/queries/${queryId}`);
      cy.findByText("Refresh Now").click();

      // the integer is grouped with the configured space separator
      cy.getByTestId("TableVisualization").should("contain", "1 234 567");
    });
  });
});
