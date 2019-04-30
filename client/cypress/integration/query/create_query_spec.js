describe('Create Query', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/queries/new');
  });

  it('executes and saves a query', () => {
    cy.getByTestId('SelectDataSource')
      .click()
      .contains('Test PostgreSQL').click();

    cy.getByTestId('QueryEditor')
      .get('.ace_text-input')
      .type('SELECT id, name FROM organizations{esc}', { force: true });

    cy.getByTestId('ExecuteButton').click();

    cy.getByTestId('DynamicTable').should('exist');
    cy.percySnapshot('Edit Query');

    cy.getByTestId('SaveButton').click();
    cy.url().should('match', /\/queries\/\d+\/source/);
  });
});
