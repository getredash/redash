function createNewDashboard(dashboardName) {
  cy.getByTestId('CreateButton').click();
  cy.get('li[role="menuitem]"').contains('Dashboard').click();
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
    cy.getByTestId('DashboardLayoutContent').as('content');
    cy.get('@content').toMatchSnapshot(); // TODO: make this overwrite https://git.io/fhjRW

    createNewDashboard('Foo Bar');

    let urlPath;
    cy.location().should(({ pathname }) => {
      urlPath = pathname;
      expect(pathname).to.include('dashboard/foo-bar');
    });

    cy.visit('/dashboards');
    cy.get('@content').within(() => {
      cy.get('.table-main-title')
      .should('exist')
      .and('have.attr', 'href', urlPath.substring(1))
      .click();
    });

    archiveCurrentDashboard();

    cy.visit('/dashboards');
    cy.get('@content').toMatchSnapshot();
  });
});
