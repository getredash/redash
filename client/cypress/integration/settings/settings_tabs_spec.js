describe("Settings Tabs", () => {
  const regularUser = {
    name: "Example User",
    email: "user@redash.io",
    password: "password",
  };

  const userTabs = ["Users", "Groups", "Query Snippets", "Account"];
  const adminTabs = ["Data Sources", "Alert Destinations", "General"];

  const expectSettingsTabsToBe = expectedTabs =>
    cy.getByTestId("SettingsScreenItem").then($list => {
      const listedPages = $list.toArray().map(el => el.text);
      expect(listedPages).to.have.members(expectedTabs);
    });

  before(() => {
    cy.login().then(() => cy.createUser(regularUser));
  });

  describe("For admin user", () => {
    beforeEach(() => {
      cy.logout();
      cy.login();
      cy.visit("/");
    });

    it("settings link should lead to Data Sources settings", () => {
      cy.getByTestId("SettingsLink")
        .should("exist")
        .should("have.attr", "href", "data_sources");
    });

    it("all tabs should be available", () => {
      cy.getByTestId("SettingsLink").click();
      expectSettingsTabsToBe([...userTabs, ...adminTabs]);
    });
  });

  describe("For regular user", () => {
    beforeEach(() => {
      cy.logout();
      cy.login(regularUser.email, regularUser.password);
      cy.visit("/");
    });

    it("settings link should lead to Users settings", () => {
      cy.getByTestId("SettingsLink")
        .should("exist")
        .should("have.attr", "href", "users");
    });

    it("limited set of settings tabs should be available", () => {
      cy.getByTestId("SettingsLink").click();
      expectSettingsTabsToBe(userTabs);
    });
  });
});
