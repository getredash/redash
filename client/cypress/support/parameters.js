function deltaDirection(value) {
  if (value === 0) {
    return 0;
  }

  return Math.sign(value);
}

function clampIndex(index, length) {
  return Math.max(0, Math.min(length - 1, index));
}

function interpolateCoordinates(start, end, steps) {
  return Array.from({ length: steps }, (_, index) => {
    const progress = (index + 1) / steps;
    return {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
    };
  });
}

function createPointerEvent(EventCtor, type, point, buttons) {
  return new EventCtor(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    buttons,
    clientX: point.x,
    clientY: point.y,
    pointerId: 1,
    pointerType: "mouse",
    isPrimary: true,
  });
}

function dispatchPointerDrag(handle, start, end) {
  const { ownerDocument } = handle;
  const EventCtor = ownerDocument.defaultView.PointerEvent;
  const points = interpolateCoordinates(start, end, 16);

  if (!EventCtor) {
    throw new Error("PointerEvent is required for parameter drag tests.");
  }

  return points
    .reduce(
      (chain, point) =>
        chain.then(() => Cypress.Promise.delay(12)).then(() => {
          ownerDocument.dispatchEvent(createPointerEvent(EventCtor, "pointermove", point, 1));
        }),
      cy.then(() => {
        handle.dispatchEvent(createPointerEvent(EventCtor, "pointermove", start, 0));
        handle.dispatchEvent(createPointerEvent(EventCtor, "pointerdown", start, 1));
      })
    )
    .then(() => Cypress.Promise.delay(12))
    .then(() => {
      ownerDocument.dispatchEvent(createPointerEvent(EventCtor, "pointerup", end, 0));
    });
}

export function dragParam(paramName, offsetLeft, offsetTop = 0) {
  cy.getByTestId(`ParameterBlock-${paramName}`).then(($parameterBlock) => {
    const parameterBlock = $parameterBlock[0];
    const { ownerDocument } = parameterBlock;
    const parameterBlocks = Array.from(ownerDocument.querySelectorAll('[data-test^="ParameterBlock-"]'));
    const oldIndex = parameterBlocks.findIndex((block) => block === parameterBlock);
    const targetStep = deltaDirection(offsetLeft || offsetTop);
    const newIndex = clampIndex(oldIndex + targetStep, parameterBlocks.length);
    const targetBlock = parameterBlocks[newIndex];
    const dragHandle = parameterBlock.querySelector(".drag-handle");

    assert.exists(dragHandle, "Drag handle should exist");
    assert.exists(targetBlock, "Target block should exist");

    const dragRect = dragHandle.getBoundingClientRect();
    const targetRect = targetBlock.getBoundingClientRect();
    const start = {
      x: dragRect.left + dragRect.width / 2,
      y: dragRect.top + dragRect.height / 2,
    };
    const end = {
      x:
        targetRect.left +
        targetRect.width / 2 +
        deltaDirection(offsetLeft || start.x - (targetRect.left + targetRect.width / 2)) *
          Math.min(targetRect.width / 4, 24),
      y:
        targetRect.top +
        targetRect.height / 2 +
        offsetTop +
        deltaDirection(offsetTop || targetRect.top + targetRect.height / 2 - start.y) *
          Math.min(targetRect.height / 4, 18),
    };

    cy.wrap(dragHandle)
      .scrollIntoView()
      .then(($handle) => dispatchPointerDrag($handle[0], start, end));
  });
}

export function expectParamOrder(expectedOrder) {
  cy.get(".parameter-container label").each(($label, index) => expect($label).to.have.text(expectedOrder[index]));
}
