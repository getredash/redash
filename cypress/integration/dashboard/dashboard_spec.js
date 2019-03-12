function archiveAllDashboards() {
  cy.visit('/dashboards');

  // archive all dashboards
  cy.getByTestId('DashboardLayoutContent').then($wrapper => {
    $wrapper.find('.table-main-title').each((_, { href }) => {
      archiveDashboard(href);
    });
  });
}

function createNewDashboard(dashboardName) {
  cy.visit('/dashboards');
  cy.getByTestId('CreateButton').click();
  cy.get('li[role="menuitem"]')
    .contains('Dashboard')
    .click();
  cy.getByTestId('EditDashboardDialog').within(() => {
    cy.getByTestId('DashboardSaveButton').should('be.disabled');
    cy.get('input').type(dashboardName);
    cy.getByTestId('DashboardSaveButton').click();
  });
}

function archiveDashboard(url) {
  if (url) {
    cy.visit(url);
  }

  cy.getByTestId('DashboardMoreMenu')
    .click()
    .within(() => {
      cy.get('li')
        .contains('Archive')
        .click();
    });

  cy.get('.btn-warning')
    .contains('Archive')
    .click();
  cy.get('.label-tag-archived').should('exist');
}

describe('Dashboard', () => {
  beforeEach(() => {
    cy.login();
    archiveAllDashboards();
  });

  it('creates a new dashboard and archives it', () => {
    // create new
    createNewDashboard('Foo Bar');

    // verify listed in dashboards
    cy.visit('/dashboards');
    cy.getByTestId('DashboardLayoutContent').within(() => {
      cy.get('.table-main-title')
        .contains('Foo Bar')
        .should('exist')
        .click();
    });

    // archive
    archiveDashboard();

    // verify not listed in dashboards
    cy.visit('/dashboards');
    cy.getByTestId('DashboardLayoutContent').within(() => {
      cy.get('.table-main-title').should('not.exist');
    });
  });
});
