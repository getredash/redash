describe('Create Data Source', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/data_sources/new');
  });

  it('creates a new PostgreSQL data source', () => {
    cy.getElement('DatabaseSource').contains('PostgreSQL').click();

    cy.getElement('TargetName').type('Redash');
    cy.getElement('Host').type('{selectall}localhost');
    cy.getElement('User').type('postgres');
    cy.getElement('Password').type('postgres');
    cy.getElement('Database Name').type('postgres{enter}');

    cy.contains('Saved.');
  });
});
