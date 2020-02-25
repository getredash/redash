export function expectDirtyStateChange(edit) {
  cy.getByTestId("ParameterName-test-parameter")
    .find(".parameter-input")
    .should($el => {
      assert.isUndefined($el.data("dirty"));
    });

  edit();

  cy.getByTestId("ParameterName-test-parameter")
    .find(".parameter-input")
    .should($el => {
      assert.isTrue($el.data("dirty"));
    });
}
