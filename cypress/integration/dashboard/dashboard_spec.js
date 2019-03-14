function createNewDashboardByAPI(name) {
  cy.server();
  return cy.request('POST', 'api/dashboards', { name }).then((response) => {
    const slug = Cypress._.get(response, 'body.slug');
    assert.isDefined(slug, 'Dashboard api call returns dashboard slug');
    return slug;
  });
}

function editDashboard() {
  cy.getByTestId('DashboardMoreMenu')
    .click()
    .within(() => {
      cy.get('li')
        .contains('Edit')
        .click();
    });
}

function addTextbox(text) {
  cy.server();
  cy.route('POST', 'api/widgets').as('NewWidget');

  editDashboard();

  cy.contains('a', 'Add Textbox').click();
  cy.get('.add-textbox').within(() => {
    cy.get('textarea').type(text);
  });
  cy.contains('button', 'Add to Dashboard').click();
  cy.get('.add-textbox').should('not.exist');
  cy.contains('button', 'Apply Changes').click();

  return cy.wait('@NewWidget').then((xhr) => {
    const id = Cypress._.get(xhr, 'response.body.id');
    assert.isDefined(id, 'Widget api call returns widget id');
    return cy.getByTestId(`WidgetId${id}`);
  });
}

function addWidget(queryData) {
  const defaultQueryData = { data_source_id: 1, options: { parameters: [] }, schedule: null };
  const merged = Object.assign(defaultQueryData, queryData);

  cy.server();

  // create query
  return cy.request('POST', '/api/queries', merged)
    .then(({ body }) => {
      // publish it so it's avail for widget
      return cy.request('POST', `/api/queries/${body.id}`, { is_draft: false });
    })
    .then(({ body }) => {
      // create widget
      cy.contains('a', 'Add Widget').click();
      cy.getByTestId('AddWidgetDialog').within(() => {
        cy.get(`.query-selector-result[data-test="QueryId${body.id}"]`).click();
      });

      cy.route('POST', 'api/widgets').as('NewWidget');
      cy.contains('button', 'Add to Dashboard').click();
      return cy.wait('@NewWidget');
    })
    .then((xhr) => {
      const body = Cypress._.get(xhr, 'response.body');
      assert.isDefined(body, 'Widget api call returns body');
      return body;
    });
}

describe('Dashboard', () => {
  beforeEach(() => {
    cy.login();
  });

  it('creates new dashboard', () => {
    cy.visit('/dashboards');
    cy.getByTestId('CreateButton').click();
    cy.get('li[role="menuitem"]').contains('Dashboard').click();

    cy.server();
    cy.route('POST', 'api/dashboards').as('NewDashboard');

    cy.getByTestId('EditDashboardDialog').within(() => {
      cy.getByTestId('DashboardSaveButton').should('be.disabled');
      cy.get('input').type('Foo Bar');
      cy.getByTestId('DashboardSaveButton').click();
    });

    cy.wait('@NewDashboard').then((xhr) => {
      const slug = Cypress._.get(xhr, 'response.body.slug');
      assert.isDefined(slug, 'Dashboard api call returns slug');

      cy.visit('/dashboards');
      cy.getByTestId('DashboardLayoutContent').within(() => {
        cy.getByTestId(slug).should('exist');
      });
    });
  });

  it('archives dashboard', function () {
    createNewDashboardByAPI('Foo Bar').then((slug) => {
      cy.visit(`/dashboard/${slug}`);

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

      cy.visit('/dashboards');
      cy.getByTestId('DashboardLayoutContent').within(() => {
        cy.getByTestId(slug).should('not.exist');
      });
    });
  });


  describe('Textbox', () => {
    before(function () {
      cy.login();
      createNewDashboardByAPI('Foo Bar')
        .then(slug => `/dashboard/${slug}`)
        .as('dashboardUrl');
    });

    beforeEach(function () {
      cy.visit(this.dashboardUrl);
      addTextbox('Hello World!').as('textboxEl');
    });

    it('removes textbox from X button', function () {
      editDashboard();

      cy.get('@textboxEl').within(() => {
        cy.get('.widget-menu-remove').click();
      });

      cy.get('@textboxEl').should('not.exist');
    });

    it('removes textbox from menu', function () {
      cy.get('@textboxEl').within(() => {
        cy.get('.widget-menu-regular').click({ force: true }).within(() => {
          cy.get('li a').contains('Remove From Dashboard').click({ force: true });
        });
      });

      cy.get('@textboxEl').should('not.exist');
    });

    it('edits textbox', function () {
      cy.get('@textboxEl').within(() => {
        cy.get('.widget-menu-regular').click({ force: true }).within(() => {
          cy.get('li a').contains('Edit').click({ force: true });
        });
      });

      const newContent = '[edited]';
      cy.get('edit-text-box').should('exist').within(() => {
        cy.get('textarea').clear().type(newContent);
        cy.contains('button', 'Save').click();
      });

      cy.get('@textboxEl').should('contain', newContent);
    });

    it('adds and removes widget', () => {
      const queryData = {
        name: 'Test Query 01',
        query: 'select 1',
      };

      addWidget(queryData).then(({ id }) => {
        cy.getByTestId(`WidgetId${id}`).should('exist').within(() => {
          cy.get('.widget-menu-remove').click();
        });
        cy.getByTestId(`WidgetId${id}`).should('not.exist');
      });
    });

    it('renders widget auto height by table row count', () => {
      const testAutoHeight = (rowCount, expectedWidgetHeight) => {
        const queryData = {
          name: 'Test Query Auto Height',
          query: `select s.a FROM generate_series(1,${rowCount}) AS s(a)`,
        };

        addWidget(queryData).then(({ id, options }) => {
          expect(options.position.autoHeight).to.be.true;
          cy.getByTestId(`WidgetId${id}`)
            .its('0.offsetHeight')
            .should('eq', expectedWidgetHeight);
        });
      }

      testAutoHeight(2, 235);
      testAutoHeight(5, 335);
    });
  });
});
