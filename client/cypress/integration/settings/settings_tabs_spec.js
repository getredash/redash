import { createUser } from "../../support/redash-api";

describe("Settings Tabs", () => {
  before(() => {
    cy.login();
    createUser({
      name: "Example User",
      email: "user@redash.io",
      password: "password",
    });
  });

  const userTabs = ["Users", "Groups", "Query Snippets", "Account"];
  const adminTabs = ["Data Sources", "Alert Destinations", "Settings"];

  const expectSettingsTabsToBe = expectedTabs =>
    cy.getByTestId("SettingsScreenItem").then($list => {
      const listedPages = $list.toArray().map(el => el.text);
      expect(listedPages).to.have.members(expectedTabs);
    });

  it("shows all tabs for admins", () => {
    cy.visit("/users");
    expectSettingsTabsToBe([...userTabs, ...adminTabs]);
  });

  it("hides unavailable tabs for users", () => {
    cy.logout()
      .then(() => cy.login("user@redash.io", "password"))
      .then(() => cy.visit("/users"));

    expectSettingsTabsToBe(userTabs);
  });
});
