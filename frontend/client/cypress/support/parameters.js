export function dragParam(paramName, offsetLeft, offsetTop) {
  cy.getByTestId(`DragHandle-${paramName}`)
    .trigger("mouseover")
    .trigger("mousedown");

  cy.get(".parameter-dragged .drag-handle")
    .trigger("mousemove", offsetLeft, offsetTop, { force: true })
    .trigger("mouseup", { force: true });
}

export function expectParamOrder(expectedOrder) {
  cy.get(".parameter-container label").each(($label, index) => expect($label).to.have.text(expectedOrder[index]));
}
