function getReactComponent(node, predicate) {
  const fiberKey = Object.keys(node).find(
    (key) => key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$")
  );
  const HTMLElementCtor = node.ownerDocument.defaultView.HTMLElement;

  let fiber = fiberKey ? node[fiberKey] : null;
  while (fiber) {
    const { stateNode } = fiber;
    if (stateNode && !(stateNode instanceof HTMLElementCtor) && predicate(stateNode)) {
      return stateNode;
    }
    fiber = fiber.return;
  }

  return null;
}

export function dragParam(paramName, offsetLeft) {
  cy.getByTestId(`ParameterBlock-${paramName}`).then(($parameterBlock) => {
    const parameterBlockEl = $parameterBlock[0];
    const { ownerDocument } = parameterBlockEl;
    const parameterBlocks = Array.from(ownerDocument.querySelectorAll('[data-test^="ParameterBlock-"]'));
    const oldIndex = parameterBlocks.findIndex((block) => block === parameterBlockEl);
    const newIndex =
      offsetLeft === 0 ? oldIndex : Math.max(0, Math.min(parameterBlocks.length - 1, oldIndex + Math.sign(offsetLeft)));
    const parametersComponent = getReactComponent(
      parameterBlockEl.closest(".parameter-container"),
      (component) => typeof component.moveParameter === "function"
    );

    expect(parametersComponent, "Parameters component").to.exist;
    parametersComponent.moveParameter({ oldIndex, newIndex });
  });
}

export function expectParamOrder(expectedOrder) {
  cy.get(".parameter-container label").each(($label, index) => expect($label).to.have.text(expectedOrder[index]));
}
