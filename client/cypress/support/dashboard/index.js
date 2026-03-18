/* global cy */

const { get } = Cypress._;
const DASHBOARD_LAYOUT_KEY = "multi-column";
const GRID_MARGIN = 15;

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

export function getWidgetTestId(widget) {
  return `WidgetId${widget.id}`;
}

export function createQueryAndAddWidget(dashboardId, queryData = {}, widgetOptions = {}) {
  return cy
    .createQuery(queryData)
    .then((query) => {
      const visualizationId = get(query, "visualizations.0.id");
      assert.isDefined(visualizationId, "Query api call returns at least one visualization with id");
      return cy.addWidget(dashboardId, visualizationId, widgetOptions);
    })
    .then(getWidgetTestId);
}

export function editDashboard() {
  cy.getByTestId("DashboardMoreButton").click();

  cy.getByTestId("DashboardMoreButtonMenu").contains("Edit").click();
}

export function shareDashboard() {
  cy.clickThrough(
    { button: "Publish" },
    `OpenShareForm
    PublicAccessEnabled`
  );

  return cy.getByTestId("SecretAddress").invoke("val");
}

export function resizeBy(wrapper, offsetLeft = 0, offsetTop = 0) {
  return wrapper.then(($widget) => {
    const widgetEl = $widget[0];
    const gridComponent = getReactComponent(
      widgetEl,
      (component) =>
        component && component.state && component.state.layouts && typeof component.onLayoutChange === "function"
    );

    expect(gridComponent, "DashboardGrid component").to.exist;

    const widgetId = widgetEl.getAttribute("data-widgetid");
    const currentLayout = gridComponent.state.layouts[DASHBOARD_LAYOUT_KEY];
    const currentItem = currentLayout.find((item) => item.i === widgetId);

    expect(currentItem, "DashboardGrid layout item").to.exist;

    const currentWidth = widgetEl.getBoundingClientRect().width;
    const currentHeight = widgetEl.getBoundingClientRect().height;
    const columnWidth = (currentWidth - (currentItem.w - 1) * GRID_MARGIN) / currentItem.w;
    const rowHeight = (currentHeight - (currentItem.h - 1) * GRID_MARGIN) / currentItem.h;
    const columnStep = columnWidth + GRID_MARGIN;
    const rowStep = rowHeight + GRID_MARGIN;
    const nextItem = {
      ...currentItem,
      w: Math.max(
        currentItem.minW || 1,
        Math.min(currentItem.maxW || Infinity, currentItem.w + Math.round(offsetLeft / columnStep))
      ),
      h: Math.max(
        currentItem.minH || 1,
        Math.min(currentItem.maxH || Infinity, currentItem.h + Math.round(offsetTop / rowStep))
      ),
    };
    const nextLayout = currentLayout.map((item) => (item.i === widgetId ? nextItem : item));

    gridComponent.setState(
      ({ layouts }) => ({
        layouts: {
          ...layouts,
          [DASHBOARD_LAYOUT_KEY]: nextLayout,
        },
      }),
      () => {
        gridComponent.onWidgetResize(nextLayout, currentItem, nextItem);
        gridComponent.onLayoutChange(null, { [DASHBOARD_LAYOUT_KEY]: nextLayout });
      }
    );
  });
}
