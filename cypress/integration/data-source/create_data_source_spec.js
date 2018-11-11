import NewDataSourcePage from '../../pages/NewDataSourcePage';

describe('Create Data Source', () => {
  const newDataSourcePage = new NewDataSourcePage();

  beforeEach(() => {
    cy.login();
    newDataSourcePage.visit();
  });

  it('creates a new PostgreSQL data source', () => {
    newDataSourcePage.selectSource('PostgreSQL');

    newDataSourcePage
      .fill('TargetName', 'Redash')
      .fill('Host', 'localhost')
      .fill('User', 'postgres')
      .fill('Password', 'postgres')
      .fill('Database Name', 'postgres')
      .submit();

    cy.contains('Saved.');
  });
});
