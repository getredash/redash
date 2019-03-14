function createNewDashboard(dashboardName) {
  cy.visit('/dashboards');
  cy.getByTestId('CreateButton').click();
  cy.get('li[role="menuitem"]')
    .contains('Dashboard')
    .click();

  cy.server();
  cy.route('POST', 'api/dashboards').as('NewDashboard');

  cy.getByTestId('EditDashboardDialog').within(() => {
    cy.getByTestId('DashboardSaveButton').should('be.disabled');
    cy.get('input').type(dashboardName);
    cy.getByTestId('DashboardSaveButton').click();
  });

  return cy.wait('@NewDashboard').then((xhr) => {
    const slug = Cypress._.get(xhr, 'response.body.slug');
    assert.isDefined(slug, 'Dashboard api call returns slug');
    return slug;
  });
}

function archiveCurrentDashboard() {
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
  });

  it('creates a new dashboard and archives it', () => {
    createNewDashboard('Foo Bar').then((slug) => {
      cy.visit('/dashboards');
      cy.getByTestId('DashboardLayoutContent').within(() => {
        cy.getByTestId(slug).should('exist').click();
      });

      archiveCurrentDashboard();

      cy.visit('/dashboards');
      cy.getByTestId('DashboardLayoutContent').within(() => {
        cy.getByTestId(slug).should('not.exist');
      });
    });
  });
});
