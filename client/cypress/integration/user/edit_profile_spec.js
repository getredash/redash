function fillProfileDataAndSave(name, email) {
  cy.getByTestId("Name").type(`{selectall}${name}`);
  cy.getByTestId("Email").type(`{selectall}${email}{enter}`);
  cy.contains("Saved.");
}

function fillChangePasswordAndSave(currentPassword, newPassword, repeatPassword) {
  cy.getByTestId("CurrentPassword").type(currentPassword);
  cy.getByTestId("NewPassword").type(newPassword);
  cy.getByTestId("RepeatPassword").type(`${repeatPassword}{enter}`);
}

describe("Edit Profile", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/users/me");
  });

  it("updates the user after Save", () => {
    fillProfileDataAndSave("Jian Yang", "jian.yang@redash.io");
    cy.logout();
    cy.login("jian.yang@redash.io")
      .its("status")
      .should("eq", 200);
    cy.visit("/users/me");
    cy.contains("Jian Yang");
    fillProfileDataAndSave("Example Admin", "admin@redash.io");
  });

  it("regenerates API Key", () => {
    cy.getByTestId("ApiKey").then($apiKey => {
      const previousApiKey = $apiKey.val();

      cy.getByTestId("RegenerateApiKey").click();
      cy.get(".ant-btn-primary")
        .contains("Regenerate")
        .click({ force: true });

      cy.getByTestId("ApiKey").should("not.eq", previousApiKey);
    });
  });

  it("renders the page and takes a screenshot", () => {
    cy.getByTestId("Groups").should("contain", "admin");
    cy.percySnapshot("User Profile");
  });

  context("changing password", () => {
    beforeEach(() => {
      cy.getByTestId("ChangePassword").click();
    });

    it("updates user password when password is correct", () => {
      fillChangePasswordAndSave("password", "newpassword", "newpassword");
      cy.contains("Saved.");
      cy.logout();
      cy.login(undefined, "newpassword")
        .its("status")
        .should("eq", 200);
      cy.visit("/users/me");
      cy.getByTestId("ChangePassword").click();
      fillChangePasswordAndSave("newpassword", "password", "password");
      cy.contains("Saved.");
    });

    it("shows an error when current password is wrong", () => {
      fillChangePasswordAndSave("wrongpassword", "newpassword", "newpassword");
      cy.contains("Incorrect current password.");
    });
  });
});
