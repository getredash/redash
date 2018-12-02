import Page from './Page';

class NewDataSourcePage extends Page {
  constructor() {
    super('/data_sources/new');
    this.databaseSourceList = '[data-testid=DatabaseSourceList]';
    this.dynamicForm = '[data-testid=DynamicForm]';
    this.saveButton = '[data-testid=SaveButton]';
  }

  selectSource(sourceName) {
    cy.get(this.databaseSourceList)
      .contains(sourceName)
      .click();
  }

  fill(fieldName, value) {
    cy.get(this.dynamicForm)
      .get('[data-testid="' + fieldName + '"]')
      .clear()
      .type(value);

    return this;
  }

  submit() {
    cy.get(this.saveButton).click();
  }
}

export default NewDataSourcePage;
