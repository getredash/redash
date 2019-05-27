import { createQuery } from '../../support/redash-api';

describe('Parameter', () => {
  beforeEach(() => {
    cy.login();
  });

  describe('Text Parameter', () => {
    beforeEach(() => {
      const queryData = {
        name: 'Text Parameter',
        query: "SELECT '{{test-parameter}}' AS parameter",
      };

      createQuery(queryData, false)
        .then(({ id }) => cy.visit(`/queries/${id}`));
    });

    it('updates the results after clicking in Apply or pressing enter', () => {
      cy.getByTestId('ParameterName-test-parameter')
        .find('input')
        .type('Redash');

      cy.getByTestId('ParameterName-test-parameter')
        .contains('Apply')
        .click();

      cy.getByTestId('DynamicTable')
        .should('contain', 'Redash');

      cy.getByTestId('ParameterName-test-parameter')
        .find('input')
        .type('{selectall}New value{enter}');

      cy.getByTestId('DynamicTable')
        .should('contain', 'New value');
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

    it('updates the results after clicking in Apply or pressing enter', () => {
      cy.getByTestId('ParameterName-test-parameter')
        .find('input')
        .type('{selectall}42');

      cy.getByTestId('ParameterName-test-parameter')
        .contains('Apply')
        .click();

      cy.getByTestId('DynamicTable')
        .should('contain', 42);

      cy.getByTestId('ParameterName-test-parameter')
        .find('input')
        .type('{selectall}31415{enter}');

      cy.getByTestId('DynamicTable')
        .should('contain', 31415);
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

      cy.getByTestId('DynamicTable')
        .should('contain', 'value1');
    });
  });

  describe('Date Parameter', () => {
    beforeEach(() => {
      const queryData = {
        name: 'Date Parameter',
        query: "SELECT '{{test-parameter}}' AS parameter",
      };

      createQuery(queryData, false)
        .then(({ id }) => cy.visit(`/queries/${id}/source`));

      cy.clickThrough(`
        ParameterSettings-test-parameter
        ParameterTypeSelect
        DateParameterTypeOption
        SaveParameterSettings 
      `);

      const now = new Date(2019, 0, 1).getTime(); // January 1, 2019 timestamp
      cy.clock(now);
    });

    afterEach(() => {
      cy.clock().then(clock => clock.restore());
    });

    it('updates the results after selecting a date', () => {
      cy.getByTestId('ParameterName-test-parameter')
        .find('input')
        .click();

      cy.get('.ant-calendar-date-panel')
        .contains('.ant-calendar-date', '15')
        .click();

      cy.getByTestId('DynamicTable')
        .should('contain', '15/01/19');
    });
  });

  describe('Date and Time Parameter', () => {
    beforeEach(() => {
      const queryData = {
        name: 'Date and Time Parameter',
        query: "SELECT '{{test-parameter}}' AS parameter",
      };

      createQuery(queryData, false)
        .then(({ id }) => cy.visit(`/queries/${id}/source`));

      cy.clickThrough(`
        ParameterSettings-test-parameter
        ParameterTypeSelect
        DateTimeParameterTypeOption
        SaveParameterSettings
      `);

      const now = new Date(2019, 0, 1).getTime(); // January 1, 2019 timestamp
      cy.clock(now);
    });

    afterEach(() => {
      cy.clock().then(clock => clock.restore());
    });

    it('updates the results after selecting a date and clicking in ok', () => {
      cy.getByTestId('ParameterName-test-parameter')
        .find('input')
        .click();

      cy.get('.ant-calendar-date-panel')
        .contains('.ant-calendar-date', '15')
        .click();

      cy.get('.ant-calendar-ok-btn')
        .click();

      cy.getByTestId('DynamicTable')
        .should('contain', '2019-01-15 00:00');
    });

    it('shows the current datetime after clicking in Now', () => {
      cy.getByTestId('ParameterName-test-parameter')
        .find('input')
        .click();

      cy.get('.ant-calendar-date-panel')
        .contains('Now')
        .click();

      cy.getByTestId('DynamicTable')
        .should('contain', '2019-01-01 00:00');
    });
  });
});
