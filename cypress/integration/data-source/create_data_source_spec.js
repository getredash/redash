describe('Create Data Source', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/data_sources');
  });

  it('creates a new PostgreSQL data source', () => {
    cy.contains('New Data Source').click();
    cy.contains('PostgreSQL').click();

    cy.get('[name=targetName]').type('Redash');
    cy.get('[data-cy=Host]').type('{selectall}localhost');
    cy.get('[data-cy=User]').type('postgres');
    cy.get('[data-cy=Password]').type('postgres');
    cy.get('[data-cy="Database Name"]').type('postgres{enter}');

    cy.contains('Saved.');
  });
});
