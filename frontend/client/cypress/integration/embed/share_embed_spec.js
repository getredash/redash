describe("Embedded Queries", () => {
  beforeEach(() => {
    cy.login();
    cy.updateOrgSettings({ disable_public_urls: false });
  });

  it("is unavailable when public urls feature is disabled", () => {
    cy.createQuery({ query: "select name from users order by name" }).then(query => {
      cy.visit(`/queries/${query.id}/source`);
      cy.getByTestId("ExecuteButton").click();
      cy.getByTestId("QueryPageVisualizationTabs", { timeout: 10000 }).should("exist");
      cy.clickThrough(`
          QueryControlDropdownButton
          ShowEmbedDialogButton
        `);
      cy.getByTestId("EmbedIframe")
        .invoke("text")
        .then(embedUrl => {
          // disable the feature
          cy.updateOrgSettings({ disable_public_urls: true });

          // check the feature is disabled
          cy.visit(`/queries/${query.id}/source`);
          cy.getByTestId("QueryPageVisualizationTabs", { timeout: 10000 }).should("exist");
          cy.getByTestId("QueryPageHeaderMoreButton").click();
          cy.get(".ant-dropdown-menu-item")
            .should("exist")
            .should("not.contain", "Show API Key");
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
    cy.createQuery({ query: "select name from users order by name" }).then(query => {
      cy.visit(`/queries/${query.id}/source`);
      cy.getByTestId("ExecuteButton").click();
      cy.getByTestId("QueryPageVisualizationTabs", { timeout: 10000 }).should("exist");
      cy.clickThrough(`
          QueryControlDropdownButton
          ShowEmbedDialogButton
        `);
      cy.getByTestId("EmbedIframe")
        .invoke("text")
        .then(embedUrl => {
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
    cy.visit("/queries/new");
    cy.getByTestId("QueryEditor")
      .get(".ace_text-input")
      .type("SELECT name, slug FROM organizations WHERE id='{{}{{}id}}'{esc}", { force: true });

    cy.getByTestId("TextParamInput").type("1");
    cy.getByTestId("ParameterApplyButton").click();
    cy.clickThrough(`
      ParameterSettings-id
      ParameterTypeSelect
      NumberParameterTypeOption
      SaveParameterSettings
      SaveButton
    `);

    // Add a little waiting - page is not updated fast enough
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting

    cy.location("search").should("eq", "?p_id=1");
    cy.clickThrough(`
      QueryControlDropdownButton
      ShowEmbedDialogButton
    `);

    cy.getByTestId("EmbedIframe")
      .invoke("text")
      .then(embedUrl => {
        cy.logout();
        cy.visit(embedUrl);
        cy.getByTestId("VisualizationEmbed", { timeout: 10000 }).should("exist");
        cy.getByTestId("TimeAgo", { timeout: 10000 }).should("exist");
        cy.getByTestId("TableVisualization").should("exist");
        cy.percySnapshot("Successfully Embedded Parameterized Query");
      });
  });

  it("cannot be shared with unsafe parameters", () => {
    cy.visit("/queries/new");
    cy.getByTestId("QueryEditor")
      .get(".ace_text-input")
      .type("SELECT name, slug FROM organizations WHERE name='{{}{{}name}}'{esc}", { force: true });

    cy.getByTestId("TextParamInput").type("Redash");
    cy.getByTestId("ParameterApplyButton").click();
    cy.clickThrough(`
      ParameterSettings-name
      ParameterTypeSelect
      TextParameterTypeOption
      SaveParameterSettings
      SaveButton
    `);

    // Add a little waiting - page is not updated fast enough
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting

    cy.location("search").should("eq", "?p_name=Redash");
    cy.clickThrough(`
      QueryControlDropdownButton
      ShowEmbedDialogButton
    `);

    cy.getByTestId("EmbedIframe").should("not.exist");
    cy.getByTestId("EmbedErrorAlert").should("exist");
  });
});
