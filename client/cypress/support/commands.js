/* global Cypress */

import '@percy/cypress'; // eslint-disable-line import/no-extraneous-dependencies, import/no-unresolved

const { each } = Cypress._;

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

/* Clicks a series of elements. Pass in a newline-seperated string in order to click all elements by their test id,
 or enclose the above string in an object with 'button' as key to click the buttons by name. For example:

  cy.clickThrough(`
    TestId1
    TestId2
    TestId3
    `, { button: `
    Label of button 4
    Label of button 5
    ` }, `
    TestId6
    TestId7`);
*/
Cypress.Commands.add('clickThrough', (...args) => {
  args.forEach((elements) => {
    const names = elements.button || elements;

    const click = element => (elements.button ?
      cy.contains('button', element.trim()) :
      cy.getByTestId(element.trim())).click();

    names.trim().split(/\n/).filter(Boolean).forEach(click);
  });

  return undefined;
});

Cypress.Commands.add('fillInputs', (elements) => {
  each(elements, (value, testId) => {
    cy.getByTestId(testId).clear().type(value);
  });
});
