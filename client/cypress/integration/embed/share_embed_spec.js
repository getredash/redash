describe("Embedded Queries", () => {
  function ensureDataSourceSelected() {
    cy.getByTestId("SelectDataSource")
      .should("be.visible")
      .then(($select) => {
        const selectedText = $select.text().trim();

        if (selectedText && selectedText !== "Choose data source...") {
          return;
        }

        cy.wrap($select).click();
        cy.get(".ant-select-item-option").filter(":visible").first().click();
      });
  }

  function createParameterizedQueryThroughUI(query, parameterName, value, parameterTypeOption, waitForResults = true) {
    cy.visit("/queries/new");
    ensureDataSourceSelected();
    cy.getByTestId("QueryEditor").typeInAce(query, { replace: true, delay: 5 });

    cy.getByTestId(`ParameterSettings-${parameterName}`, { timeout: 10000 }).should("exist");
    cy.getByTestId(`ParameterSettings-${parameterName}`).click();
    cy.getByTestId("ParameterTypeSelect").click();
    cy.getByTestId(parameterTypeOption).filter(":visible").click({ force: true });
    cy.getByTestId("SaveParameterSettings").click();

    cy.getByTestId(`ParameterName-${parameterName}`).find("input").clear().type(value);
    cy.getByTestId("ParameterApplyButton").click();

    if (waitForResults) {
      cy.getByTestId("ExecuteButton").should("be.enabled").click();
      cy.getByTestId("TableVisualization", { timeout: 10000 }).should("exist");
    }

    cy.getByTestId("SaveButton").should("not.be.disabled").click();
    cy.location("pathname", { timeout: 10000 }).should("match", /^\/queries\/\d+\/source$/);
  }

  beforeEach(() => {
    cy.login();
    cy.updateOrgSettings({ disable_public_urls: false });
  });

  it("is unavailable when public urls feature is disabled", () => {
    cy.createQuery({ query: "select name from users order by name" }).then((query) => {
      cy.visit(`/queries/${query.id}/source`);
      cy.wait(1500); // eslint-disable-line cypress/no-unnecessary-waiting
      cy.getByTestId("ExecuteButton").click();
      cy.getByTestId("QueryPageVisualizationTabs", { timeout: 10000 }).should("exist");
      cy.clickThrough(`
          QueryControlDropdownButton
          ShowEmbedDialogButton
        `);
      cy.getByTestId("EmbedIframe")
        .invoke("text")
        .then((embedUrl) => {
          // disable the feature
          cy.updateOrgSettings({ disable_public_urls: true });

          // check the feature is disabled
          cy.visit(`/queries/${query.id}/source`);
          cy.getByTestId("QueryPageVisualizationTabs", { timeout: 10000 }).should("exist");
          cy.getByTestId("QueryPageHeaderMoreButton").click();
          cy.get(".ant-dropdown-menu-item").should("exist").should("not.contain", "Show API Key");
          cy.getByTestId("QueryControlDropdownButton").click();
          cy.get(".ant-dropdown-menu-item").should("exist");
          cy.getByTestId("ShowEmbedDialogButton").should("not.exist");

          cy.logout();
          cy.visit(embedUrl);
          cy.wait(1500); // eslint-disable-line cypress/no-unnecessary-waiting
          cy.getByTestId("TableVisualization").should("not.exist");

          cy.login();
          cy.updateOrgSettings({ disable_public_urls: false });
        });
    });
  });

  it("can be shared without parameters", () => {
    cy.createQuery({ query: "select name from users order by name" }).then((query) => {
      cy.visit(`/queries/${query.id}/source`);
      cy.wait(1500); // eslint-disable-line cypress/no-unnecessary-waiting
      cy.getByTestId("ExecuteButton").click();
      cy.getByTestId("QueryPageVisualizationTabs", { timeout: 10000 }).should("exist");
      cy.clickThrough(`
          QueryControlDropdownButton
          ShowEmbedDialogButton
        `);
      cy.getByTestId("EmbedIframe")
        .invoke("text")
        .then((embedUrl) => {
          cy.logout();
          cy.visit(embedUrl);
          cy.getByTestId("VisualizationEmbed", { timeout: 10000 }).should("exist");
          cy.getByTestId("TimeAgo", { timeout: 10000 }).should("exist");
          cy.getByTestId("TableVisualization").should("exist");
          cy.percySnapshot("Successfully Embedded Non-Parameterized Query");
        });
    });
  });

  it("can be shared with safe parameters", () => {
    createParameterizedQueryThroughUI(
      "SELECT name, slug FROM organizations WHERE id={{id}}",
      "id",
      "1",
      "NumberParameterTypeOption"
    );

    cy.location("search").should("eq", "?p_id=1");
    cy.clickThrough(`
      QueryControlDropdownButton
      ShowEmbedDialogButton
    `);

    cy.getByTestId("EmbedIframe")
      .invoke("text")
      .then((embedUrl) => {
        cy.logout();
        cy.visit(embedUrl);
        cy.getByTestId("VisualizationEmbed", { timeout: 10000 }).should("exist");
        cy.getByTestId("TimeAgo", { timeout: 10000 }).should("exist");
        cy.getByTestId("TableVisualization").should("exist");
        cy.percySnapshot("Successfully Embedded Parameterized Query");
      });
  });

  it("cannot be shared with unsafe parameters", () => {
    createParameterizedQueryThroughUI(
      "SELECT name, slug FROM organizations WHERE name='{{name}}'",
      "name",
      "Redash",
      "TextParameterTypeOption",
      false
    );

    cy.location("search").should("eq", "?p_name=Redash");
    cy.clickThrough(`
      QueryControlDropdownButton
      ShowEmbedDialogButton
    `);

    cy.getByTestId("EmbedIframe").should("not.exist");
    cy.getByTestId("EmbedErrorAlert").should("exist");
  });
});
