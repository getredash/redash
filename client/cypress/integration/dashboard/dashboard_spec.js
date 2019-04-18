const DRAG_PLACEHOLDER_SELECTOR = '.grid-stack-placeholder';
const RESIZE_HANDLE_SELECTOR = '.ui-resizable-se';


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

function addTextboxByAPI(text, dashId, options = {}) {
  const data = {
    width: 1,
    dashboard_id: dashId,
    visualization_id: null,
    text: 'text',
    options: Object.assign({
      position: { col: 0, row: 0, sizeX: 3, sizeY: 3 },
    }, options),
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

function dragBy(wrapper, offsetLeft = 0, offsetTop = 0) {
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

function resizeBy(wrapper, offsetLeft = 0, offsetTop = 0) {
  let start;
  let end;
  let from;
  const getSize = $el => ({ height: $el.height(), width: $el.width() });

  return wrapper
    .then(($el) => {
      start = getSize($el);
    })
    .within(() => cy.get(RESIZE_HANDLE_SELECTOR))
    .then(($handle) => {
      from = $handle.show().offset(); // turn on handle and get it's position
      return wrapper
        .trigger('mouseover', { force: true })
        .trigger('mousedown', { pageX: from.left, pageY: from.top, force: true, which: 1 })
        .trigger('mousemove', { pageX: from.left + offsetLeft, pageY: from.top + offsetTop, force: true, which: 1 });
    })
    .then(() => {
      end = getSize(Cypress.$(DRAG_PLACEHOLDER_SELECTOR)); // see comment in dragBy ^^
      return wrapper.trigger('mouseup', { force: true });
    })
    .then(() => ({
      height: end.height - start.height,
      width: end.width - start.width,
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

    it('renders textbox according to position configuration', function () {
      const id = this.dashboardId;
      const txb1Pos = { col: 0, row: 0, sizeX: 3, sizeY: 2 };
      const txb2Pos = { col: 1, row: 1, sizeX: 3, sizeY: 4 };

      cy.viewport(1215, 800);
      addTextboxByAPI('x', id, { position: txb1Pos })
        .then(() => addTextboxByAPI('x', id, { position: txb2Pos }))
        .then((elTestId) => {
          cy.visit(this.dashboardUrl);
          return cy.getByTestId(elTestId);
        })
        .should(($el) => {
          const { top, left } = $el.offset();
          expect(top).to.eq(214);
          expect(left).to.eq(215);
          expect($el.width()).to.eq(600);
          expect($el.height()).to.eq(185);
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
          dragBy(cy.get('@textboxEl'), 90).then((delta) => {
            expect(delta.left).to.eq(0);
          });
        });

        it('moves one column when dragged over snap threshold', () => {
          dragBy(cy.get('@textboxEl'), 110).then((delta) => {
            expect(delta.left).to.eq(200);
          });
        });

        it('moves two columns when dragged over snap threshold', () => {
          dragBy(cy.get('@textboxEl'), 330).then((delta) => {
            expect(delta.left).to.eq(400);
          });
        });
      });

      it('auto saves after drag', () => {
        cy.server();
        cy.route('POST', 'api/widgets/*').as('WidgetSave');

        editDashboard();
        dragBy(cy.get('@textboxEl'), 330).then(() => {
          cy.wait('@WidgetSave');
        });
      });
    });

    describe('Resizeable', () => {
      describe('Column snap', () => {
        beforeEach(() => {
          editDashboard();
        });

        it('stays put when dragged under snap threshold', () => {
          resizeBy(cy.get('@textboxEl'), 90).then((delta) => {
            expect(delta.width).to.eq(0);
          });
        });

        it('moves one column when dragged over snap threshold', () => {
          resizeBy(cy.get('@textboxEl'), 110).then((delta) => {
            expect(delta.width).to.eq(200);
          });
        });

        it('moves two columns when dragged over snap threshold', () => {
          resizeBy(cy.get('@textboxEl'), 400).then((delta) => {
            expect(delta.width).to.eq(400);
          });
        });
      });

      describe('Row snap', () => {
        beforeEach(() => {
          editDashboard();
        });

        it('stays put when dragged under snap threshold', () => {
          resizeBy(cy.get('@textboxEl'), 0, 10).then((delta) => {
            expect(delta.height).to.eq(0);
          });
        });

        it('moves one row when dragged over snap threshold', () => {
          resizeBy(cy.get('@textboxEl'), 0, 30).then((delta) => {
            expect(delta.height).to.eq(50);
          });
        });

        it('shrinks to minimum', () => {
          cy.get('@textboxEl')
            .then(($el) => {
              resizeBy(cy.get('@textboxEl'), -$el.width(), -$el.height()); // resize to 0,0
              return cy.get('@textboxEl');
            })
            .then(($el) => {
              expect($el.width()).to.eq(200);
              expect($el.height()).to.eq(35);
            });
        });
      });

      it('auto saves after resize', () => {
        cy.server();
        cy.route('POST', 'api/widgets/*').as('WidgetSave');

        editDashboard();
        resizeBy(cy.get('@textboxEl'), 200).then(() => {
          cy.wait('@WidgetSave');
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

      describe('Height behavior on refresh', () => {
        const paramName = 'count';
        const queryData = {
          query: `select s.a FROM generate_series(1,{{ ${paramName} }}) AS s(a)`,
        };

        beforeEach(function () {
          addWidgetByAPI(this.dashboardId, queryData).then((elTestId) => {
            cy.visit(this.dashboardUrl);
            cy.getByTestId(elTestId).as('widget').within(() => {
              cy.getByTestId('RefreshIndicator').as('refreshButton');
            });
            cy.getByTestId(`ParameterName${paramName}`).within(() => {
              cy.get('input').as('paramInput');
            });
          });
        });

        it('grows when dynamically adding table rows', () => {
          // listen to results
          cy.server();
          cy.route('GET', 'api/query_results/*').as('FreshResults');

          // start with 1 table row
          cy.get('@paramInput').clear().type('1');
          cy.get('@refreshButton').click();
          cy.wait('@FreshResults', { timeout: 10000 });
          cy.get('@widget').invoke('height').should('eq', 285);

          // add 4 table rows
          cy.get('@paramInput').clear().type('5');
          cy.get('@refreshButton').click();
          cy.wait('@FreshResults', { timeout: 10000 });

          // expect to height to grow by 1 grid grow
          cy.get('@widget').invoke('height').should('eq', 435);
        });

        it('revokes auto height after manual height adjustment', () => {
          // listen to results
          cy.server();
          cy.route('GET', 'api/query_results/*').as('FreshResults');

          editDashboard();

          // start with 1 table row
          cy.get('@paramInput').clear().type('1');
          cy.get('@refreshButton').click();
          cy.wait('@FreshResults');
          cy.get('@widget').invoke('height').should('eq', 285);

          // resize height by 1 grid row
          resizeBy(cy.get('@widget'), 0, 5);
          cy.get('@widget').invoke('height').should('eq', 335);

          // add 4 table rows
          cy.get('@paramInput').clear().type('5');
          cy.get('@refreshButton').click();
          cy.wait('@FreshResults');

          // expect height to stay unchanged (would have been 435)
          cy.get('@widget').invoke('height').should('eq', 335);
        });
      });
    });
  });

  context('viewport width is at 800px', () => {
    before(function () {
      cy.login();
      createNewDashboardByAPI('Foo Bar')
        .then(({ slug, id }) => {
          this.dashboardUrl = `/dashboard/${slug}`;
          this.dashboardEditUrl = `/dashboard/${slug}?edit`;
          return addTextboxByAPI('Hello World!', id);
        })
        .then((elTestId) => {
          cy.visit(this.dashboardUrl);
          cy.getByTestId(elTestId).as('textboxEl');
        });
    });

    beforeEach(function () {
      cy.visit(this.dashboardUrl);
      cy.viewport(800, 800);
    });

    it('shows widgets with full width', () => {
      cy.get('@textboxEl').should(($el) => {
        expect($el.width()).to.eq(785);
      });

      cy.viewport(801, 800);
      cy.get('@textboxEl').should(($el) => {
        expect($el.width()).to.eq(393);
      });
    });

    it('hides edit option', () => {
      cy.getByTestId('DashboardMoreMenu')
        .click()
        .should('be.visible')
        .within(() => {
          cy.get('li')
            .contains('Edit')
            .as('editButton')
            .should('not.be.visible');
        });

      cy.viewport(801, 800);
      cy.get('@editButton').should('be.visible');
    });

    it('disables edit mode', function () {
      cy.visit(this.dashboardEditUrl);
      cy.contains('button', 'Done Editing')
        .as('saveButton')
        .should('be.disabled');

      cy.viewport(801, 800);
      cy.get('@saveButton').should('not.be.disabled');
    });
  });

  context('viewport width is at 767px', () => {
    before(function () {
      cy.login();
      createNewDashboardByAPI('Foo Bar').then(({ slug }) => {
        this.dashboardUrl = `/dashboard/${slug}`;
      });
    });

    beforeEach(function () {
      cy.visit(this.dashboardUrl);
      cy.viewport(767, 800);
    });

    it('hides menu button', () => {
      cy.get('.dashboard__control').should('exist');
      cy.getByTestId('DashboardMoreMenu').should('not.be.visible');

      cy.viewport(768, 800);
      cy.getByTestId('DashboardMoreMenu').should('be.visible');
    });
  });
});
