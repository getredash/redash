describe("Login", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("greets the user and take a screenshot", () => {
    cy.contains("h3", "Login to Redash");

    cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.percySnapshot("Login");
  });

  it("shows message on failed login", () => {
    cy.getByTestId("Email").type(Cypress.env("CYPRESS_LOGIN_EMAIL"));
    cy.getByTestId("Password").type("wrongpassword{enter}");

    cy.getByTestId("ErrorMessage").should("contain", "Wrong email or password.");
  });

  it("navigates to homepage with successful login", () => {
    cy.getByTestId("Email").type(Cypress.env("CYPRESS_LOGIN_EMAIL"));
    cy.getByTestId("Password").type(`${Cypress.env("CYPRESS_LOGIN_PASSWORD")}{enter}`);

    cy.title().should("eq", "Redash");
    cy.get(`img.profile__image_thumb[alt="Example Admin"]`).should("exist");

    cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.percySnapshot("Homepage");
  });
});
