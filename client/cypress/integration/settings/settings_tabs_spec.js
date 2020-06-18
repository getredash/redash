import { createUser } from "../../support/redash-api";

describe("Settings Tabs", () => {
  const regularUser = {
    name: "Example User",
    email: "user@redash.io",
    password: "password",
  };

  const userTabs = ["Users", "Groups", "Query Snippets", "Account"];
  const adminTabs = ["Data Sources", "Alert Destinations", "Settings"];

  const expectSettingsTabsToBe = expectedTabs =>
    cy.getByTestId("SettingsScreenItem").then($list => {
      const listedPages = $list.toArray().map(el => el.text);
      expect(listedPages).to.have.members(expectedTabs);
    });

  before(() => {
    cy.login().then(() => createUser(regularUser));
  });

  describe("For admin user", () => {
    beforeEach(() => {
      cy.logout().then(() => cy.login());
    });

    it("shows available tabs", () => {
      cy.visit("/users");
      expectSettingsTabsToBe([...userTabs, ...adminTabs]);
    });
  });

  describe("For regular user", () => {
    beforeEach(() => {
      cy.logout().then(() => cy.login(regularUser.email, regularUser.password));
    });

    it("shows available tabs", () => {
      cy.visit("/users");
      expectSettingsTabsToBe(userTabs);
    });
  });
});
