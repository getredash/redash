import { createQuery } from '../../support/redash-api';

describe('Parameter', () => {
  const expectDirtyStateChange = (edit) => {
    cy.getByTestId('ParameterName-test-parameter')
      .find('.parameter-input')
      .should(($el) => {
        assert.isUndefined($el.data('dirty'));
      });

    edit();

    cy.getByTestId('ParameterName-test-parameter')
      .find('.parameter-input')
      .should(($el) => {
        assert.isTrue($el.data('dirty'));
      });
  };

  beforeEach(() => {
    cy.login();
  });

  describe('Text Parameter', () => {
    beforeEach(() => {
      const queryData = {
        name: 'Text Parameter',
        query: "SELECT '{{test-parameter}}' AS parameter",
        options: {
          parameters: [
            { name: 'test-parameter', title: 'Test Parameter', type: 'text' },
          ],
        },
      };

      createQuery(queryData, false)
        .then(({ id }) => cy.visit(`/queries/${id}`));
    });

    it('updates the results after clicking Apply', () => {
      cy.getByTestId('ParameterName-test-parameter')
        .find('input')
        .type('Redash');

      cy.getByTestId('ParameterApplyButton')
        .click();

      cy.getByTestId('DynamicTable')
        .should('contain', 'Redash');
    });

    it('sets dirty state when edited', () => {
      expectDirtyStateChange(() => {
        cy.getByTestId('ParameterName-test-parameter')
          .find('input')
          .type('Redash');
      });
    });
  });

  describe('Number Parameter', () => {
    beforeEach(() => {
      const queryData = {
        name: 'Number Parameter',
        query: "SELECT '{{test-parameter}}' AS parameter",
        options: {
          parameters: [
            { name: 'test-parameter', title: 'Test Parameter', type: 'number' },
          ],
        },
      };

      createQuery(queryData, false)
        .then(({ id }) => cy.visit(`/queries/${id}`));
    });

    it('updates the results after clicking Apply', () => {
      cy.getByTestId('ParameterName-test-parameter')
        .find('input')
        .type('{selectall}42');

      cy.getByTestId('ParameterApplyButton')
        .click();

      cy.getByTestId('DynamicTable')
        .should('contain', 42);

      cy.getByTestId('ParameterName-test-parameter')
        .find('input')
        .type('{selectall}31415');

      cy.getByTestId('ParameterApplyButton')
        .click();

      cy.getByTestId('DynamicTable')
        .should('contain', 31415);
    });

    it('sets dirty state when edited', () => {
      expectDirtyStateChange(() => {
        cy.getByTestId('ParameterName-test-parameter')
          .find('input')
          .type('{selectall}42');
      });
    });
  });

  describe('Dropdown Parameter', () => {
    beforeEach(() => {
      const queryData = {
        name: 'Number Parameter',
        query: "SELECT '{{test-parameter}}' AS parameter",
        options: {
          parameters: [
            { name: 'test-parameter',
              title: 'Test Parameter',
              type: 'enum',
              enumOptions: 'value1\nvalue2\nvalue3' },
          ],
        },
      };

      createQuery(queryData, false)
        .then(({ id }) => cy.visit(`/queries/${id}`));
    });

    it('updates the results after selecting a value', () => {
      cy.getByTestId('ParameterName-test-parameter')
        .find('.ant-select')
        .click();

      cy.contains('li.ant-select-dropdown-menu-item', 'value1')
        .click();

      cy.getByTestId('ParameterApplyButton')
        .click();

      cy.getByTestId('DynamicTable')
        .should('contain', 'value1');
    });

    it('sets dirty state when edited', () => {
      expectDirtyStateChange(() => {
        cy.getByTestId('ParameterName-test-parameter')
          .find('.ant-select')
          .click();

        cy.contains('li.ant-select-dropdown-menu-item', 'value1')
          .click();
      });
    });
  });

  describe('Date Parameter', () => {
    const selectCalendarDate = (date) => {
      cy.getByTestId('ParameterName-test-parameter')
        .find('input')
        .click({ force: true });

      cy.get('.ant-calendar-date-panel')
        .contains('.ant-calendar-date', date)
        .click()
        .click(); // workaround for datepicker display bug
    };

    beforeEach(() => {
      const queryData = {
        name: 'Date Parameter',
        query: "SELECT '{{test-parameter}}' AS parameter",
        options: {
          parameters: [
            { name: 'test-parameter', title: 'Test Parameter', type: 'date' },
          ],
        },
      };

      createQuery(queryData, false)
        .then(({ id }) => cy.visit(`/queries/${id}`));

      // make sure parameter is loaded, otherwise cy.clock won't work
      cy.getByTestId('ParameterApplyButton')
        .should('exist');

      const now = new Date();
      now.setDate(1);
      cy.wrap(now.getTime()).as('now');
      cy.clock(now.getTime());
    });

    afterEach(() => {
      cy.clock().then(clock => clock.restore());
    });

    it('updates the results after selecting a date', function () {
      selectCalendarDate('15');

      cy.getByTestId('ParameterApplyButton')
        .click();

      cy.getByTestId('DynamicTable')
        .should('contain', Cypress.moment(this.now).format('15/MM/YY'));
    });

    it('allows picking a dynamic date', function () {
      cy.getByTestId('DynamicButton')
        .click()
        .click(); // workaround for datepicker display bug

      cy.getByTestId('DynamicButtonMenu')
        .contains('Today/Now')
        .click();

      cy.getByTestId('ParameterApplyButton')
        .click();

      cy.getByTestId('DynamicTable')
        .should('contain', Cypress.moment(this.now).format('DD/MM/YY'));
    });

    it('sets dirty state when edited', () => {
      expectDirtyStateChange(() => selectCalendarDate('15'));
    });
  });

  describe('Date and Time Parameter', () => {
    beforeEach(() => {
      const queryData = {
        name: 'Date and Time Parameter',
        query: "SELECT '{{test-parameter}}' AS parameter",
        options: {
          parameters: [
            { name: 'test-parameter', title: 'Test Parameter', type: 'datetime-local' },
          ],
        },
      };

      createQuery(queryData, false)
        .then(({ id }) => cy.visit(`/queries/${id}`));

      // make sure parameter is loaded, otherwise cy.clock won't work
      cy.getByTestId('ParameterApplyButton')
        .should('exist');

      const now = new Date();
      now.setDate(1);
      cy.wrap(now.getTime()).as('now');
      cy.clock(now.getTime());
    });

    afterEach(() => {
      cy.clock().then(clock => clock.restore());
    });

    it('updates the results after selecting a date and clicking in ok', function () {
      cy.getByTestId('ParameterName-test-parameter')
        .find('input')
        .as('Input')
        .click({ force: true });

      cy.get('.ant-calendar-date-panel')
        .contains('.ant-calendar-date', '15')
        .as('SelectedDate')
        .click();

      cy.get('.ant-calendar-ok-btn')
        .click();

      // workaround for datepicker display bug
      cy.get('@SelectedDate').click();

      cy.getByTestId('ParameterApplyButton')
        .click();

      cy.getByTestId('DynamicTable')
        .should('contain', Cypress.moment(this.now).format('YYYY-MM-15 HH:mm'));
    });

    it('shows the current datetime after clicking in Now', function () {
      cy.getByTestId('ParameterName-test-parameter')
        .find('input')
        .as('Input')
        .click({ force: true });

      cy.get('.ant-calendar-date-panel')
        .contains('Now')
        .click()
        .click(); // workaround for datepicker display bug

      cy.getByTestId('ParameterApplyButton')
        .click();

      cy.getByTestId('DynamicTable')
        .should('contain', Cypress.moment(this.now).format('YYYY-MM-DD HH:mm'));
    });

    it('allows picking a dynamic date', function () {
      cy.getByTestId('DynamicButton')
        .click()
        .click(); // workaround for datepicker display bug

      cy.getByTestId('DynamicButtonMenu')
        .contains('Today/Now')
        .click();

      cy.getByTestId('ParameterApplyButton')
        .click();

      cy.getByTestId('DynamicTable')
        .should('contain', Cypress.moment(this.now).format('YYYY-MM-DD HH:mm'));
    });

    it('sets dirty state when edited', () => {
      expectDirtyStateChange(() => {
        cy.getByTestId('ParameterName-test-parameter')
          .find('input')
          .click({ force: true });

        cy.get('.ant-calendar-date-panel')
          .contains('Now')
          .click();
      });
    });
  });

  describe('Date Range Parameter', () => {
    const selectCalendarDateRange = (startDate, endDate) => {
      cy.getByTestId('ParameterName-test-parameter')
        .find('input')
        .first()
        .click({ force: true });

      cy.get('.ant-calendar-date-panel')
        .contains('.ant-calendar-date', startDate)
        .click();

      cy.get('.ant-calendar-date-panel')
        .contains('.ant-calendar-date', endDate)
        .click()
        .click(); // workaround for datepicker display bug
    };

    beforeEach(() => {
      const queryData = {
        name: 'Date Range Parameter',
        query: "SELECT '{{test-parameter.start}} - {{test-parameter.end}}' AS parameter",
        options: {
          parameters: [
            { name: 'test-parameter', title: 'Test Parameter', type: 'date-range' },
          ],
        },
      };

      createQuery(queryData, false)
        .then(({ id }) => cy.visit(`/queries/${id}/source`));

      // make sure parameter is loaded, otherwise cy.clock won't work
      cy.getByTestId('ParameterName-test-parameter')
        .should('exist');

      const now = new Date();
      now.setDate(1);
      cy.wrap(now.getTime()).as('now');
      cy.clock(now.getTime());
    });

    afterEach(() => {
      cy.clock().then(clock => clock.restore());
    });

    it('updates the results after selecting a date range', function () {
      selectCalendarDateRange('15', '20');

      cy.getByTestId('ParameterApplyButton')
        .click();

      const now = Cypress.moment(this.now);
      cy.getByTestId('DynamicTable')
        .should('contain', now.format('YYYY-MM-15') + ' - ' + now.format('YYYY-MM-20'));
    });

    it('allows picking a dynamic date range', function () {
      cy.getByTestId('DynamicButton')
        .click()
        .click();

      cy.getByTestId('DynamicButtonMenu')
        .contains('Last month')
        .click();

      cy.getByTestId('ParameterApplyButton')
        .click();

      const lastMonth = Cypress.moment(this.now).subtract(1, 'month');
      cy.getByTestId('DynamicTable')
        .should('contain', lastMonth.startOf('month').format('YYYY-MM-DD') + ' - ' +
                           lastMonth.endOf('month').format('YYYY-MM-DD'));
    });

    it('sets dirty state when edited', () => {
      expectDirtyStateChange(() => selectCalendarDateRange('15', '20'));
    });
  });

  describe('Apply Changes', () => {
    const expectAppliedChanges = (apply) => {
      cy.getByTestId('ParameterName-test-parameter-1')
        .find('input')
        .as('Input')
        .type('Redash');

      cy.getByTestId('ParameterName-test-parameter-2')
        .find('input')
        .type('Redash');

      cy.location('search').should('not.contain', 'Redash');

      cy.server();
      cy.route('POST', 'api/queries/*/results').as('Results');

      apply(cy.get('@Input'));

      cy.location('search').should('contain', 'Redash');
      cy.wait('@Results');
    };

    beforeEach(() => {
      const queryData = {
        name: 'Testing Apply Button',
        query: "SELECT '{{test-parameter-1}} {{ test-parameter-2 }}'",
        options: {
          parameters: [
            { name: 'test-parameter-1', title: 'Test Parameter 1', type: 'text' },
            { name: 'test-parameter-2', title: 'Test Parameter 2', type: 'text' },
          ],
        },
      };

      createQuery(queryData, false)
        .then(({ id }) => cy.visit(`/queries/${id}/source`));
    });

    it('shows and hides according to parameter dirty state', () => {
      cy.getByTestId('ParameterApplyButton')
        .should('not.be', 'visible');

      cy.getByTestId('ParameterName-test-parameter-1')
        .find('input')
        .as('Param')
        .type('Redash');

      cy.getByTestId('ParameterApplyButton')
        .should('be', 'visible');

      cy.get('@Param')
        .clear();

      cy.getByTestId('ParameterApplyButton')
        .should('not.be', 'visible');
    });

    it('updates dirty counter', () => {
      cy.getByTestId('ParameterName-test-parameter-1')
        .find('input')
        .type('Redash');

      cy.getByTestId('ParameterApplyButton')
        .find('.ant-badge-count p.current')
        .should('contain', '1');

      cy.getByTestId('ParameterName-test-parameter-2')
        .find('input')
        .type('Redash');

      cy.getByTestId('ParameterApplyButton')
        .find('.ant-badge-count p.current')
        .should('contain', '2');
    });

    it('applies changes from "Apply Changes" button', () => {
      expectAppliedChanges(() => {
        cy.getByTestId('ParameterApplyButton').click();
      });
    });

    it('applies changes from "alt+enter" keyboard shortcut', () => {
      expectAppliedChanges((input) => {
        input.type('{alt}{enter}');
      });
    });

    it('disables "Execute" button', () => {
      cy.getByTestId('ParameterName-test-parameter-1')
        .find('input')
        .as('Input')
        .type('Redash');
      cy.getByTestId('ExecuteButton').should('be.disabled');

      cy.get('@Input').clear();
      cy.getByTestId('ExecuteButton').should('not.be.disabled');
    });
  });
});
