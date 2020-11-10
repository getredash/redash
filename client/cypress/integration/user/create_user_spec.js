describe("Create User", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/users/new");
  });

  const fillUserFormAndSubmit = (name, email) => {
    cy.getByTestId("CreateUserDialog").within(() => {
      cy.getByTestId("Name").type(name);
      cy.getByTestId("Email").type(email);
    });
    cy.getByTestId("SaveUserButton").click();
  };

  it("creates a new user", () => {
    // delete existing "new-user@redash.io"
    cy.request("GET", "api/users?q=new-user")
      .then(({ body }) => body.results.filter(user => user.email === "new-user@redash.io"))
      .each(user => cy.request("DELETE", `api/users/${user.id}`));

    fillUserFormAndSubmit("New User", "admin@redash.io");

    cy.getByTestId("CreateUserErrorAlert").should("contain", "Email already taken");

    fillUserFormAndSubmit("{selectall}New User", "{selectall}new-user@redash.io");
    cy.contains("Saved.");
  });
});
