import { createAlert, createQuery } from '../../support/redash-api';

describe('View Alert', () => {
  beforeEach(() => {
    cy.login();
  });

  it('renders the page and takes a screenshot', () => {
    createQuery({ query: 'select 1 as col_name' })
      .then(({ id: queryId }) => createAlert(queryId, { column: 'col_name' }))
      .then(({ id: alertId }) => {
        cy.visit(`/alerts/${alertId}`);
        cy.getByTestId('Criteria').should('exist');
        cy.percySnapshot('View Alert screen');
      });
  });
});
