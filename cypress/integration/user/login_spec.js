describe('Login', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('greets the user', () => {
    cy.contains('h3', 'Login to Redash');
  });

  it('shows message on failed login', () => {
    cy.getElement('Email').type('admin@redash.io');
    cy.getElement('Password').type('wrongpassword{enter}');

    cy.getElement('ErrorMessage').should('contain', 'Wrong email or password.');
  });

  it('navigates to homepage with successful login', () => {
    cy.getElement('Email').type('admin@redash.io');
    cy.getElement('Password').type('password{enter}');

    cy.title().should('eq', 'Redash');
    cy.contains('Example Admin');
  });
});
