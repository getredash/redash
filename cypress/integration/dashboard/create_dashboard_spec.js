function createNewDashboard(dashboardName) {
  cy.getByTestId('CreateButton').click();
  cy.get('li[role="menuitem"').contains('Dashboard').click();
  cy.getByTestId('EditDashboardDialog').within(() => {
    cy.getByTestId('DashboardSaveButton').should('be.disabled');
    cy.get('input').type(dashboardName);
    cy.getByTestId('DashboardSaveButton').click();
  });
}

function archiveCurrentDashboard() {
  cy.getByTestId('DashboardMoreMenu').click().within(() => {
    cy.get('li').contains('Archive').click();
  });

  cy.get('.btn-warning').contains('Archive').click();
  cy.get('.label-tag-archived').should('exist');
}

describe('Dashboard', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/dashboards');
  });

  it('creates a new dashboard and archives it', () => {
    createNewDashboard('Foo Bar');
    cy.url().should('include', '/dashboard/foo-bar');

    cy.visit('/dashboards');
    cy.percySnapshot('Dashboards List');

    cy.get('.table-main-title[href*="dashboard/foo-bar"]')
      .should('exist')
      .and('contain', 'Foo Bar')
      .click();

    archiveCurrentDashboard();

    cy.visit('/dashboards');
    cy.percySnapshot('Dashboards List');
  });
});
