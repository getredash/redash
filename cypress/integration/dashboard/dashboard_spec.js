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

const defaultQueryData = {
  name: 'Test Query',
  query: 'select 1',
  data_source_id: 1,
  options: {
    parameters: [],
  },
  schedule: null,
};

function addWidget(queryData = {}) {
  const merged = Object.assign({}, defaultQueryData, queryData);

  // create query
  cy.server();
  return cy.request('POST', '/api/queries', merged)
    // publish it so it's avail for widget
    .then(({ body }) => cy.request('POST', `/api/queries/${body.id}`, { is_draft: false }))
    .then(({ body }) => {
      // create widget
      editDashboard();
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
      assert.isDefined(body, 'Widget api call returns response body');
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
  });

  describe('Widget', () => {
    before(function () {
      cy.login();
      createNewDashboardByAPI('Foo Bar')
        .then(slug => `/dashboard/${slug}`)
        .as('dashboardUrl');
    });

    beforeEach(function () {
      cy.visit(this.dashboardUrl);
    });

    it('adds widget', () => {
      addWidget().then(({ id }) => {
        cy.getByTestId(`WidgetId${id}`).should('exist');
      });
    });

    it('removes widget', () => {
      addWidget().then(({ id }) => {
        cy.getByTestId(`WidgetId${id}`)
          .within(() => {
            cy.get('.widget-menu-remove').click();
          })
          .should('not.exist');
      });
    });

    describe('Auto height for table visualization', () => {
      it('has correct visualization and position config', () => {
        addWidget().then(({ options, visualization }) => {
          expect(visualization.type).to.eq('TABLE');
          expect(options.position.autoHeight).to.be.true;
        });
      });

      it('renders correct height for 2 table rows', () => {
        const queryData = {
          query: 'select s.a FROM generate_series(1,2) AS s(a)',
        };

        addWidget(queryData).then(({ id }) => {
          cy.getByTestId(`WidgetId${id}`)
            .its('0.offsetHeight')
            .should('eq', 235);
        });
      });

      it('renders correct height for 5 table rows', () => {
        const queryData = {
          query: 'select s.a FROM generate_series(1,5) AS s(a)',
        };

        addWidget(queryData).then(({ id }) => {
          cy.getByTestId(`WidgetId${id}`)
            .its('0.offsetHeight')
            .should('eq', 335);
        });
      });
    });
  });
});
