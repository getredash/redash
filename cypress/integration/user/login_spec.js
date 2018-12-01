describe('Login', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('greets the user', () => {
    cy.contains('h3', 'Login to Redash');
  });

  it('shows message on failed login', () => {
    cy.get('[data-test=Email]').type('admin@redash.io');
    cy.get('[data-test=Password]').type('wrongpassword{enter}');

    cy.get('[data-test=ErrorMessage]').should('contain', 'Wrong email or password.');
  });

  it('navigates to homepage with successful login', () => {
    cy.get('[data-test=Email]').type('admin@redash.io');
    cy.get('[data-test=Password]').type('password{enter}');

    cy.title().should('eq', 'Redash');
    cy.contains('Example Admin');
  });
});
