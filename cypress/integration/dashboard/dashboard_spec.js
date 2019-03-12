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

function addTextbox() {
  cy.contains('a', 'Add Textbox').click();
  cy.get('.add-textbox').within(() => {
    cy.get('textarea').type('Hello world!');
  });
  cy.contains('button', 'Add to Dashboard').click();
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

  describe.only('Textbox', () => {
    beforeEach(() => {
      createNewDashboard('Foo Bar');
      cy.contains('button', 'Apply Changes').click();
      cy.getByTestId('DashboardMoreMenu')
        .click()
        .within(() => {
          cy.get('li')
            .contains('Edit')
            .click();
        });
    });

    it('adds and removes textbox (from button)', () => {
      addTextbox();

      cy.get('.widget-text').within(() => {
        cy.get('.widget-menu-remove').click();
      });

      cy.get('.widget-text').should('not.exist');
    });

    it('adds and removes textbox (from menu)', () => {
      addTextbox();
      cy.contains('button', 'Apply Changes').click();

      cy.get('.widget-text').within(() => {
        cy.get('.widget-menu-regular').click({ force: true }).within(() => {
          cy.get('li a').contains('Remove From Dashboard').click({ force: true });
        });
      });

      cy.get('.widget-text').should('not.exist');
    });

    it('adds, opens edit dialog and removes textbox', () => {
      addTextbox();
      cy.contains('button', 'Apply Changes').click();

      cy.get('.widget-text').within(() => {
        cy.get('.widget-menu-regular').click({ force: true }).within(() => {
          cy.get('li a').contains('Edit').click({ force: true });
        });
      });

      const newContent = '[edited]';
      cy.get('edit-text-box').should('exist').within(() => {
        cy.get('textarea').clear().type(newContent);
        cy.contains('button', 'Save').click();
      });

      cy.get('.widget-text')
        .should('contain', newContent)
        .within(() => {
          cy.get('.widget-menu-regular').click({ force: true }).within(() => {
            cy.get('li a').contains('Remove From Dashboard').click({ force: true });
          });
        });
    });
  });
});
