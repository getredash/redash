export function dragParam(paramName, offsetLeft, offsetTop) {
  cy.getByTestId(`DragHandle-${paramName}`)
    .trigger("mouseover")
    .trigger("mousedown");

  cy.get(".parameter-dragged .drag-handle")
    .trigger("mousemove", offsetLeft, offsetTop, { force: true })
    .trigger("mouseup", { force: true });
}

export function assertParameterPairSwapping(param1, param2, paramWidth) {
  cy.server();
  cy.route("POST", `**/api/*/*`).as("Save");

  dragParam(param1.name, paramWidth, 1);
  cy.wait("@Save");

  cy.reload();

  const expectedOrder = [param2.title, param1.title];
  cy.get(".parameter-container label").each(($label, index) => expect($label).to.have.text(expectedOrder[index]));

  dragParam(param2.name, paramWidth, 1);

  cy.wait("@Save");
}
