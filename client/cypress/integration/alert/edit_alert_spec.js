import { createAlert, createQuery } from '../../support/redash-api';

describe('Edit Alert', () => {
  beforeEach(() => {
    cy.login();
  });

  it('renders the page and takes a screenshot', () => {
    createQuery({ query: 'select 1 as col_name' })
      .then(({ id: queryId }) => createAlert(queryId, { column: 'col_name' }))
      .then(({ id: alertId }) => {
        cy.visit(`/alerts/${alertId}/edit`);
        cy.getByTestId('Criteria').should('exist');
        cy.percySnapshot('Create Alert second screen');
      });
  });
});
