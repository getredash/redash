describe('Create Data Source', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/data_sources/new');
  });

  it('renders the page and takes a screenshot', () => {
    cy.getByTestId('TypePicker').should('contain', 'PostgreSQL');
    cy.percySnapshot('Create Data Source - Types');
  });

  it('creates a new PostgreSQL data source', () => {
    cy.getByTestId('TypePicker').contains('PostgreSQL').click();

    cy.getByTestId('Name').type('Redash');
    cy.getByTestId('Host').type('{selectall}postgres');
    cy.getByTestId('User').type('postgres');
    cy.getByTestId('Password').type('postgres');
    cy.getByTestId('Database Name').type('postgres{enter}');

    cy.contains('Saved.');
  });
});
