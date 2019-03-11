describe('Create Dashboard', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/dashboards');
  });

  it('creates a new dashboard', () => {
    cy.getByTestId('CreateButton').click();
    cy.get('li[role="menuitem"').contains('Dashboard').click();
    cy.getByTestId('EditDashboardDialog').within(() => {
      cy.getByTestId('DashboardSaveButton').should('be.disabled');
      cy.get('input').type('Foo Bar');
      cy.getByTestId('DashboardSaveButton').click();
    });
    cy.url().should('include', '/dashboard/foo-bar');

    cy.visit('/dashboards');
    cy.get('.table-main-title').contains('Foo Bar').should('exist');
  });

  it('archive', () => {
    cy.get('.table-main-title[href*="dashboard/foo-bar"]').as('listItem');
    cy.get('@listItem').click();
    cy.getByTestId('DashboardMoreMenu')
      .click()
      .within(() => {
        cy.get('li').contains('Archive').click();
      });

    cy.get('.btn-warning').contains('Archive').click();
    cy.get('.label-tag-archived').should('exist');
    
    cy.visit('/dashboards');
    cy.get('@listItem').should('not.exist');
  });
});
