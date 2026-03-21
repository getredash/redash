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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampIndex(index, length) {
  return clamp(index, 0, Math.max(0, length - 1));
}

function resolveTargetStep(offset, size) {
  if (offset === 0) {
    return 0;
  }

  const sizeOrOne = Math.max(size, 1);
  return Math.sign(offset) * Math.max(1, Math.round(Math.abs(offset) / sizeOrOne));
}

function clampPointToRect(point, rect) {
  const horizontalInset = Math.min(rect.width / 4, 24);
  const verticalInset = Math.min(rect.height / 4, 18);

  return {
    x: clamp(point.x, rect.left + horizontalInset, rect.right - horizontalInset),
    y: clamp(point.y, rect.top + verticalInset, rect.bottom - verticalInset),
  };
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
        chain
          .then(() => Cypress.Promise.delay(12))
          .then(() => {
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
    const dragHandle = parameterBlock.querySelector(".drag-handle");
    const parameterRect = parameterBlock.getBoundingClientRect();
    const oldIndex = parameterBlocks.findIndex((block) => block === parameterBlock);
    const horizontalStep = resolveTargetStep(offsetLeft, parameterRect.width);
    const verticalStep = horizontalStep === 0 ? resolveTargetStep(offsetTop, parameterRect.height) : 0;
    const newIndex = clampIndex(oldIndex + horizontalStep + verticalStep, parameterBlocks.length);
    const targetBlock = parameterBlocks[newIndex];

    assert.exists(dragHandle, "Drag handle should exist");
    assert.exists(targetBlock, "Target block should exist");

    cy.wrap(dragHandle)
      .scrollIntoView()
      .then(($handle) => {
        const handle = $handle[0];
        const dragRect = handle.getBoundingClientRect();
        const start = {
          x: dragRect.left + dragRect.width / 2,
          y: dragRect.top + dragRect.height / 2,
        };
        const targetRect = targetBlock.getBoundingClientRect();
        const end = clampPointToRect(
          {
            x:
              targetRect.left +
              targetRect.width / 2 +
              Math.sign(offsetLeft || start.x - (targetRect.left + targetRect.width / 2)) *
                Math.min(targetRect.width / 4, 24),
            y:
              targetRect.top +
              targetRect.height / 2 +
              offsetTop +
              Math.sign(offsetTop || targetRect.top + targetRect.height / 2 - start.y) *
                Math.min(targetRect.height / 4, 18),
          },
          targetRect
        );

        return dispatchPointerDrag(handle, start, end);
      });
  });
}

export function expectParamOrder(expectedOrder) {
  cy.get(".parameter-container label").each(($label, index) => expect($label).to.have.text(expectedOrder[index]));
}
