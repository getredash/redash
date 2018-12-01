describe('Create Data Source', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/data_sources/new');
  });

  it('creates a new PostgreSQL data source', () => {
    cy.get('[data-test=DatabaseSource]').contains('PostgreSQL').click();

    cy.get('[data-test=TargetName]').type('Redash');
    cy.get('[data-test=Host]').type('{selectall}localhost');
    cy.get('[data-test=User]').type('postgres');
    cy.get('[data-test=Password]').type('postgres');
    cy.get('[data-test="Database Name"]').type('postgres{enter}');

    cy.contains('Saved.');
  });
});
