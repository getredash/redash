describe('Parameter', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/queries/new');

    cy.getByTestId('QueryEditor')
      .get('.ace_text-input')
      .type("SELECT '{{}{{}test-parameter}}' AS parameter{esc}", { force: true });
  });

  afterEach(() => {
    cy.getByTestId('SaveButton').click();
    cy.url().should('match', /\/queries\/\d+\/source/);
  });

  describe('Text Parameter', () => {
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
      cy.clickThrough(`
        ParameterSettings-test-parameter
        ParameterTypeSelect
        NumberParameterTypeOption
        SaveParameterSettings
      `);
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
      cy.clickThrough(`
        ParameterSettings-test-parameter
        ParameterTypeSelect
        DropdownParameterTypeOption
      `);

      cy.getByTestId('DropdownValuesInput').type('value1{enter}value2{enter}value3');
      cy.getByTestId('SaveParameterSettings').click();
    });

    afterEach(() => {
      cy.clock().then(clock => clock.restore());
    });

    it('updates the results after selecting a value', () => {
      cy.getByTestId('ParameterName-test-parameter')
        .click();

      cy.contains('li.ant-select-dropdown-menu-item', 'value1')
        .click();

      cy.getByTestId('DynamicTable')
        .should('contain', 'value1');
    });
  });

  describe('Date Parameter', () => {
    beforeEach(() => {
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
});
