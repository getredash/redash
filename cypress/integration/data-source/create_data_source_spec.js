describe('Create Data Source', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/data_sources/new');
  });

  it('creates a new PostgreSQL data source', () => {
    cy.getByTestId('DatabaseSource').contains('PostgreSQL').click();

    cy.getByTestId('Name').type('Redash');
    cy.getByTestId('Host').type('{selectall}postgres');
    cy.getByTestId('User').type('postgres');
    cy.getByTestId('Password').type('postgres');
    cy.getByTestId('Database Name').type('postgres{enter}');

    cy.contains('Saved.');
  });
});
