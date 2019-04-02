import '@percy/cypress'; // eslint-disable-line import/no-extraneous-dependencies, import/no-unresolved

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
Cypress.Commands.add('clickThrough', (elements) => {
  elements
    .trim()
    .split(/\s/)
    .filter(Boolean)
    .forEach(element => cy.getByTestId(element).click());
  return undefined;
});
