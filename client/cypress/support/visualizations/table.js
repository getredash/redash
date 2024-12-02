export function expectTableToHaveLength(length) {
  cy.getByTestId("TableVisualization").find("tbody tr").should("have.length", length);
}

export function expectFirstColumnToHaveMembers(values) {
  cy.getByTestId("TableVisualization")
    .find("tbody tr td:first-child")
    .then(($cell) => Cypress.$.map($cell, (item) => Cypress.$(item).text()))
    .then((firstColumnCells) => expect(firstColumnCells).to.have.members(values));
}
