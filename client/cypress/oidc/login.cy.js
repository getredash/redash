/* global Cypress, cy */

// Run against an isolated Redash instance configured with tests/oidc_provider.py.
function login(email) {
  cy.visit("/logout");
  cy.contains("Login with OIDC").click();
  cy.origin(Cypress.env("OIDC_ISSUER"), { args: { email } }, ({ email: account }) => {
    cy.get('input[name="email"]').type(account);
    cy.get('input[name="password"]').type("test-only");
    cy.contains("button", "Sign in").click();
  });
}

describe("Generic OIDC login", () => {
  it("authenticates with a signed ID token", () => {
    login("verified@example.com");
    cy.contains("Welcome to Redash").should("be.visible");
    cy.request("/api/session").its("body.user.email").should("eq", "verified@example.com");
  });

  it("supports email claims supplied by UserInfo", () => {
    login("userinfo@example.com");
    cy.contains("Welcome to Redash").should("be.visible");
    cy.request("/api/session").its("body.user.email").should("eq", "userinfo@example.com");
  });

  it("rejects an unverified email", () => {
    login("unverified@example.com");
    cy.contains("Email not verified.").should("be.visible");
    cy.location("pathname").should("eq", "/login");
  });

  it("rejects an account outside the allowed domains", () => {
    login("outsider@other.com");
    cy.contains("Your account (outsider@other.com) isn't allowed.").should("be.visible");
    cy.location("pathname").should("eq", "/login");
  });

  it("persists OIDC-only login settings", () => {
    login("verified@example.com");
    cy.intercept("POST", "/api/settings/organization").as("saveSettings");
    cy.visit("/settings/general");
    cy.contains("label", "Password Login Enabled").find('input[type="checkbox"]').check();
    cy.contains("button", "Save").click();
    cy.wait("@saveSettings").its("response.statusCode").should("eq", 200);
    cy.contains("Settings changes saved.").should("be.visible");
    cy.contains("label", "Password Login Enabled").find('input[type="checkbox"]').uncheck();
    cy.contains("button", "Save").click();
    cy.wait("@saveSettings").its("response.statusCode").should("eq", 200);
    cy.reload();
    cy.contains("label", "Password Login Enabled").find('input[type="checkbox"]').should("not.be.checked");
    cy.request("/logout");
    // Synchronize the anonymous session after Cypress's cross-origin login.
    cy.clearCookies();
    cy.visit("/login");
    cy.contains("Login with OIDC").should("be.visible");
    cy.get('form[name="login"]').should("not.exist");
  });
});
