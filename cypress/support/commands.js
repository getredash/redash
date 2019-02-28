import '@percy/cypress';

Cypress.Commands.add('login', (email = 'admin@redash.io', password = 'password') => cy.request({
  url: '/login',
  method: 'POST',
  form: true,
  body: {
    email,
    password,
  },
}));

Cypress.Commands.add('logout', () => cy.request('/logout'));
Cypress.Commands.add('getByTestId', element => cy.get('[data-test="' + element + '"]'));
