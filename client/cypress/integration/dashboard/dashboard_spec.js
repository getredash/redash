const DRAG_PLACEHOLDER_SELECTOR = '.grid-stack-placeholder';

function createNewDashboardByAPI(name) {
  return cy.request('POST', 'api/dashboards', { name }).then(({ body }) => body);
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

function addTextboxByAPI(text, dashId) {
  const data = {
    width: 1,
    dashboard_id: dashId,
    visualization_id: null,
    text: 'text',
    options: {
      position: { col: 0, row: 0, sizeX: 3, sizeY: 3 },
    },
  };

  return cy.request('POST', 'api/widgets', data).then(({ body }) => {
    const id = Cypress._.get(body, 'id');
    assert.isDefined(id, 'Widget api call returns widget id');
    return `WidgetId${id}`;
  });
}

function addQueryByAPI(data, shouldPublish = true) {
  const merged = Object.assign(
    {
      name: 'Test Query',
      query: 'select 1',
      data_source_id: 1,
      options: {
        parameters: [],
      },
      schedule: null,
    },
    data,
  );

  // eslint-disable-next-line cypress/no-assigning-return-values
  const request = cy.request('POST', '/api/queries', merged);
  if (shouldPublish) {
    request.then(({ body }) => cy.request('POST', `/api/queries/${body.id}`, { is_draft: false }));
  }

  return request.then(({ body }) => body);
}

function addWidgetByAPI(dashId, queryData = {}) {
  const data = {
    width: 1,
    dashboard_id: dashId,
    visualization_id: null,
    options: {
      position: { col: 0, row: 0, sizeX: 3, sizeY: 3 },
    },
  };

  return addQueryByAPI(queryData)
    .then((query) => {
      const visId = Cypress._.get(query, 'visualizations.0.id');
      assert.isDefined(visId, 'Query api call returns at least one visualization with id');
      data.visualization_id = visId;

      return cy.request('POST', 'api/widgets', data);
    })
    .then(({ body }) => {
      const id = Cypress._.get(body, 'id');
      assert.isDefined(id, 'Widget api call returns widget id');
      return `WidgetId${id}`;
    });
}

function dragBy(wrapper, offsetTop = 0, offsetLeft = 0) {
  let start;
  let end;
  return wrapper
    .then(($el) => {
      start = $el.offset();
      return wrapper
        .trigger('mousedown', { pageX: start.left, pageY: start.top, which: 1 })
        .trigger('mousemove', { pageX: start.left + offsetLeft, pageY: start.top + offsetTop, which: 1 });
    })
    .then(() => {
      // getting end position from placeholder instead of $el
      // cause on mouseup, $el animates back to position
      // and this is simpler than waiting for animationend
      end = Cypress.$(DRAG_PLACEHOLDER_SELECTOR).offset();
      return wrapper.trigger('mouseup');
    })
    .then(() => ({
      left: end.left - start.left,
      top: end.top - start.top,
    }));
}

describe('Dashboard', () => {
  beforeEach(() => {
    cy.login();
  });

  it('creates new dashboard', () => {
    cy.visit('/dashboards');
    cy.getByTestId('CreateButton').click();
    cy.get('li[role="menuitem"]')
      .contains('Dashboard')
      .click();

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

  it('archives dashboard', () => {
    createNewDashboardByAPI('Foo Bar').then(({ slug }) => {
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
    beforeEach(function () {
      createNewDashboardByAPI('Foo Bar').then(({ slug, id }) => {
        this.dashboardId = id;
        this.dashboardUrl = `/dashboard/${slug}`;
      });
    });

    it('adds textbox', function () {
      cy.visit(this.dashboardUrl);
      editDashboard();
      cy.contains('a', 'Add Textbox').click();
      cy.getByTestId('TextboxDialog').within(() => {
        cy.get('textarea').type('Hello World!');
      });
      cy.contains('button', 'Add to Dashboard').click();
      cy.getByTestId('TextboxDialog').should('not.exist');
      cy.get('.textbox').should('exist');
    });

    it('removes textbox by X button', function () {
      addTextboxByAPI('Hello World!', this.dashboardId).then((elTestId) => {
        cy.visit(this.dashboardUrl);
        editDashboard();

        cy.getByTestId(elTestId)
          .within(() => {
            cy.get('.widget-menu-remove').click();
          })
          .should('not.exist');
      });
    });

    it('removes textbox by menu', function () {
      addTextboxByAPI('Hello World!', this.dashboardId).then((elTestId) => {
        cy.visit(this.dashboardUrl);
        cy.getByTestId(elTestId)
          .within(() => {
            cy.get('.widget-menu-regular')
              .click({ force: true })
              .within(() => {
                cy.get('li a')
                  .contains('Remove From Dashboard')
                  .click({ force: true });
              });
          })
          .should('not.exist');
      });
    });

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('allows opening menu after removal', function () {
      let elTestId1;
      addTextboxByAPI('txb 1', this.dashboardId)
        .then((elTestId) => {
          elTestId1 = elTestId;
          return addTextboxByAPI('txb 2', this.dashboardId);
        })
        .then((elTestId2) => {
          cy.visit(this.dashboardUrl);
          editDashboard();

          // remove 1st textbox and make sure it's gone
          cy.getByTestId(elTestId1)
            .as('textbox1')
            .within(() => {
              cy.get('.widget-menu-remove').click();
            });
          cy.get('@textbox1').should('not.exist');

          // remove 2nd textbox and make sure it's gone
          cy.getByTestId(elTestId2)
            .as('textbox2')
            .within(() => {
              // unclickable https://github.com/getredash/redash/issues/3202
              cy.get('.widget-menu-remove').click();
            });
          cy.get('@textbox2').should('not.exist'); // <-- fails because of the bug
        });
    });

    it('edits textbox', function () {
      addTextboxByAPI('Hello World!', this.dashboardId).then((elTestId) => {
        cy.visit(this.dashboardUrl);
        cy.getByTestId(elTestId)
          .as('textboxEl')
          .within(() => {
            cy.get('.widget-menu-regular')
              .click({ force: true })
              .within(() => {
                cy.get('li a')
                  .contains('Edit')
                  .click({ force: true });
              });
          });

        const newContent = '[edited]';
        cy.getByTestId('TextboxDialog')
          .should('exist')
          .within(() => {
            cy.get('textarea')
              .clear()
              .type(newContent);
            cy.contains('button', 'Save').click();
          });

        cy.get('@textboxEl').should('contain', newContent);
      });
    });
  });

  describe('Grid compliant widgets', () => {
    beforeEach(function () {
      cy.viewport(1215, 800);
      createNewDashboardByAPI('Foo Bar')
        .then(({ slug, id }) => {
          this.dashboardUrl = `/dashboard/${slug}`;
          return addTextboxByAPI('Hello World!', id);
        })
        .then((elTestId) => {
          cy.visit(this.dashboardUrl);
          cy.getByTestId(elTestId).as('textboxEl');
        });
    });

    describe('Draggable', () => {
      describe('Grid snap', () => {
        beforeEach(() => {
          editDashboard();
        });

        it('stays put when dragged under snap threshold', () => {
          dragBy(cy.get('@textboxEl'), 0, 90).then((delta) => {
            expect(delta.left).to.eq(0);
          });
        });

        it('moves one column when dragged over snap threshold', () => {
          dragBy(cy.get('@textboxEl'), 0, 110).then((delta) => {
            expect(delta.left).to.eq(200);
          });
        });

        it('moves two columns when dragged over snap threshold', () => {
          dragBy(cy.get('@textboxEl'), 0, 330).then((delta) => {
            expect(delta.left).to.eq(400);
          });
        });
      });

      it('discards drag on cancel', () => {
        let start;
        cy.get('@textboxEl')
          // save initial position, drag textbox 1 col
          .then(($el) => {
            start = $el.offset();
            editDashboard();
            return dragBy(cy.get('@textboxEl'), 0, 200);
          })
          // cancel
          .then(() => {
            cy.get('.dashboard-header').within(() => {
              cy.contains('button', 'Cancel').click();
            });
            return cy.get('@textboxEl');
          })
          // verify returned to original position
          .then(($el) => {
            expect($el.offset()).to.deep.eq(start);
          });
      });

      it('saves drag on apply', () => {
        let start;
        cy.get('@textboxEl')
          // save initial position, drag textbox 1 col
          .then(($el) => {
            start = $el.offset();
            editDashboard();
            return dragBy(cy.get('@textboxEl'), 0, 200);
          })
          // apply
          .then(() => {
            cy.contains('button', 'Apply Changes').click();
            return cy.get('@textboxEl');
          })
          // verify move
          .then(($el) => {
            expect($el.offset()).to.not.deep.eq(start);
          });
      });
    });
  });

  describe('Widget', () => {
    beforeEach(function () {
      createNewDashboardByAPI('Foo Bar').then(({ slug, id }) => {
        this.dashboardId = id;
        this.dashboardUrl = `/dashboard/${slug}`;
      });
    });

    it('adds widget', function () {
      addQueryByAPI().then(({ id: queryId }) => {
        cy.visit(this.dashboardUrl);
        editDashboard();
        cy.contains('a', 'Add Widget').click();
        cy.getByTestId('AddWidgetDialog').within(() => {
          cy.get(`.query-selector-result[data-test="QueryId${queryId}"]`).click();
        });
        cy.contains('button', 'Add to Dashboard').click();
        cy.getByTestId('AddWidgetDialog').should('not.exist');
        cy.get('.widget-wrapper').should('exist');
      });
    });

    it('removes widget', function () {
      addWidgetByAPI(this.dashboardId).then((elTestId) => {
        cy.visit(this.dashboardUrl);
        editDashboard();
        cy.getByTestId(elTestId)
          .within(() => {
            cy.get('.widget-menu-remove').click();
          })
          .should('not.exist');
      });
    });

    describe('Auto height for table visualization', () => {
      it('renders correct height for 2 table rows', function () {
        const queryData = {
          query: 'select s.a FROM generate_series(1,2) AS s(a)',
        };

        addWidgetByAPI(this.dashboardId, queryData).then((elTestId) => {
          cy.visit(this.dashboardUrl);
          cy.getByTestId(elTestId)
            .its('0.offsetHeight')
            .should('eq', 235);
        });
      });

      it('renders correct height for 5 table rows', function () {
        const queryData = {
          query: 'select s.a FROM generate_series(1,5) AS s(a)',
        };

        addWidgetByAPI(this.dashboardId, queryData).then((elTestId) => {
          cy.visit(this.dashboardUrl);
          cy.getByTestId(elTestId)
            .its('0.offsetHeight')
            .should('eq', 335);
        });
      });
    });
  });
});
