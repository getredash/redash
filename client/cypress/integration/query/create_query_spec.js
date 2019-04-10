describe('Create Query', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/queries/new');
  });

  // https://github.com/getredash/redash/issues/3688
  it.skip('executes the query', () => {
    cy.getByTestId('SelectDataSource')
      .click()
      .contains('Test PostgreSQL').click();

    cy.getByTestId('QueryEditor')
      .get('.ace_text-input')
      .type('SELECT id, name FROM organizations{esc}', { force: true });

    cy.getByTestId('ExecuteButton').click();

    cy.getByTestId('DynamicTable').should('exist');
    cy.percySnapshot('Edit Query');
  });
});
