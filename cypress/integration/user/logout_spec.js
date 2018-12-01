describe('Logout', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/');
  });

  it('shows login page after logout', () => {
    cy.getElement('ProfileDropdown').click();
    cy.contains('Log out').click();

    cy.title().should('eq', 'Login to Redash');
  });
});
