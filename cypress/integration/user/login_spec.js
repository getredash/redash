describe('Login', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('greets the user', () => {
    cy.contains('h3', 'Login to Redash');
  });

  it('shows message on failed login', () => {
    cy.get('#inputEmail').type('admin@redash.io');
    cy.get('#inputPassword').type('wrongpassword{enter}');

    cy.get('.alert').should('contain', 'Wrong email or password.');
  });

  it('navigates to homepage with successful login', () => {
    cy.get('#inputEmail').type('admin@redash.io');
    cy.get('#inputPassword').type('password{enter}');

    cy.title().should('eq', 'Redash');
    cy.contains('Example Admin');
  });
});
