describe('User List', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/users');
  });

  it('renders the page and takes a screenshot', () => {
    cy.percySnapshot('Users');
  });
});
