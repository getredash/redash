describe("Create Data Source", () => {
  beforeEach(() => {
    cy.login();
  });

  it("opens the creation dialog when clicking in the create link or button", () => {
    cy.visit("/data_sources");
    cy.server();
    cy.route("**/api/data_sources", []); // force an empty response

    ["CreateDataSourceButton", "CreateDataSourceLink"].forEach(createElementTestId => {
      cy.getByTestId(createElementTestId).click();
      cy.getByTestId("CreateSourceDialog").should("exist");
      cy.getByTestId("CreateSourceCancelButton").click();
      cy.getByTestId("CreateSourceDialog").should("not.exist");
    });
  });

  it("renders the page and takes a screenshot", function() {
    cy.visit("/data_sources/new");
    cy.server();
    cy.route("**/api/data_sources/types").as("DataSourceTypesRequest");

    cy.wait("@DataSourceTypesRequest")
      .then(({ response }) => response.body.filter(type => type.deprecated))
      .then(deprecatedTypes => deprecatedTypes.map(type => type.type))
      .as("deprecatedTypes");

    cy.getByTestId("PreviewItem")
      .then($previewItems => Cypress.$.map($previewItems, item => Cypress.$(item).attr("data-test-type")))
      .then(availableTypes => expect(availableTypes).not.to.contain.members(this.deprecatedTypes));

    cy.getByTestId("CreateSourceDialog").should("contain", "PostgreSQL");
    cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.percySnapshot("Create Data Source - Types");
  });

  it("creates a new PostgreSQL data source", () => {
    cy.visit("/data_sources/new");
    cy.getByTestId("SearchSource").type("PostgreSQL");
    cy.getByTestId("CreateSourceDialog")
      .contains("PostgreSQL")
      .click();

    cy.getByTestId("Name").type("Redash");
    cy.getByTestId("Host").type("postgres");
    cy.getByTestId("User").type("postgres");
    cy.getByTestId("Password").type("postgres");
    cy.getByTestId("Database Name").type("postgres{enter}");
    cy.getByTestId("CreateSourceSaveButton").click({ force: true });

    cy.contains("Saved.");
  });
});
