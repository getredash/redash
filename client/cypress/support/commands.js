/* global Cypress */

import "@percy/cypress"; // eslint-disable-line import/no-extraneous-dependencies, import/no-unresolved

import "@testing-library/cypress/add-commands";

const { each } = Cypress._;

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAntdOptionLabel(testId) {
  if (testId.startsWith("ColorOption")) {
    return testId.slice("ColorOption".length);
  }

  const parts = testId.split(".");
  const label = parts[parts.length - 1];
  const specialLabels = {
    CHOROPLETH: "Map (Choropleth)",
    PIVOT: "Pivot Table",
  };

  if (specialLabels[label]) {
    return specialLabels[label];
  }

  if (label.includes("_")) {
    return label
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return label;
}

Cypress.Commands.add("login", (email = "admin@redash.io", password = "password") => {
  cy.session(
    [email, password],
    () => {
      cy.visit("/login");
      cy.getByTestId("Email").clear().type(email);
      cy.getByTestId("Password").clear().type(`${password}{enter}`);
      cy.location("pathname", { timeout: 20000 }).should("not.equal", "/login");
      cy.request("/api/session").its("body.user.id").should("exist");
    },
    {
      cacheAcrossSpecs: true,
      validate: () => {
        cy.request({ url: "/api/session", failOnStatusCode: false }).then(({ status, body }) => {
          expect(status).to.equal(200);
          expect(body.user.id).to.exist;
        });
      },
    }
  );

  return cy.request("/api/session");
});

Cypress.Commands.add("logout", () => cy.visit("/logout"));
Cypress.Commands.add("getByTestId", (element) => cy.get('[data-test="' + element + '"]'));

/* Clicks a series of elements. Pass in a newline-seperated string in order to click all elements by their test id,
 or enclose the above string in an object with 'button' as key to click the buttons by name. For example:

  cy.clickThrough(`
    TestId1
    TestId2
    TestId3
    `, { button: `
    Label of button 4
    Label of button 5
    ` }, `
    TestId6
    TestId7`);
*/
Cypress.Commands.add("clickThrough", (...args) => {
  args.forEach((elements) => {
    const names = elements.button || elements;

    const click = (element) =>
      (elements.button ? cy.contains("button", element.trim()) : cy.getByTestId(element.trim())).click();

    names.trim().split(/\n/).filter(Boolean).forEach(click);
  });

  return undefined;
});

/**
 * Selects ANTD selector option
 */
Cypress.Commands.add("selectAntdOption", { prevSubject: "element" }, (subject, testId) => {
  cy.wrap(subject).click({ force: true });

  return cy.get("body").then(($body) => {
    const popupSelector = ".ant-select-dropdown:not(.ant-select-dropdown-hidden):visible";
    const dataTestSelector = `${popupSelector} [data-test="${testId}"]`;
    const visibleOption = $body.find(dataTestSelector).last();

    if (visibleOption.length > 0) {
      return cy.wrap(visibleOption).scrollIntoView().click({ force: true });
    }

    const optionLabel = getAntdOptionLabel(testId);
    const exactLabel = new RegExp(`^${escapeRegExp(optionLabel)}$`, "i");

    return cy.contains(`${popupSelector} .ant-select-item-option`, exactLabel).scrollIntoView().click({ force: true });
  });
});

Cypress.Commands.add("fillInputs", (elements, { wait = 0 } = {}) => {
  each(elements, (value, testId) => {
    cy.getByTestId(testId).filter(":visible").clear().type(value);
    if (wait > 0) {
      cy.wait(wait); // eslint-disable-line cypress/no-unnecessary-waiting
    }
  });
});

function interpolateCoordinates(start, end, steps) {
  return Array.from({ length: steps }, (_, index) => {
    const progress = (index + 1) / steps;
    return {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
    };
  });
}

function dispatchMouseEvent(type, x, y, buttons) {
  return Cypress.automation("remote:debugger:protocol", {
    command: "Input.dispatchMouseEvent",
    params: {
      type,
      x: Math.round(x),
      y: Math.round(y),
      button: type === "mouseMoved" ? "none" : "left",
      buttons,
      clickCount: 1,
    },
  });
}

Cypress.Commands.add("dragBy", { prevSubject: true }, (subject, offsetLeft, offsetTop, force = false) => {
  if (!offsetLeft) {
    offsetLeft = 1;
  }
  if (!offsetTop) {
    offsetTop = 1;
  }
  return cy
    .wrap(subject)
    .trigger("mouseover", { force })
    .trigger("mousedown", "topLeft", { force })
    .trigger("mousemove", 1, 1, { force }) // must have at least 2 mousemove events for react-grid-layout to trigger onLayoutChange
    .trigger("mousemove", offsetLeft, offsetTop, { force })
    .trigger("mouseup", { force });
});

Cypress.Commands.add("realDragBy", { prevSubject: true }, (subject, offsetLeft = 0, offsetTop = 0, options = {}) => {
  const steps = options.steps ?? 12;
  const delay = options.delay ?? 8;

  return cy
    .wrap(subject)
    .scrollIntoView()
    .then(($element) => {
      const rect = $element[0].getBoundingClientRect();
      const start = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      const end = {
        x: start.x + offsetLeft,
        y: start.y + offsetTop,
      };
      const points = interpolateCoordinates(start, end, steps);

      let chain = dispatchMouseEvent("mouseMoved", start.x, start.y, 0).then(() =>
        dispatchMouseEvent("mousePressed", start.x, start.y, 1)
      );

      points.forEach(({ x, y }) => {
        chain = chain.then(() => dispatchMouseEvent("mouseMoved", x, y, 1)).then(() => Cypress.Promise.delay(delay));
      });

      return chain.then(() => dispatchMouseEvent("mouseReleased", end.x, end.y, 0)).then(() => $element);
    });
});

Cypress.Commands.add("typeInAce", { prevSubject: "element" }, (subject, text, options = {}) => {
  const replace = options.replace || false;
  const delay = options.delay ?? 10;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const editorInput = () => cy.wrap(subject).find(".ace_text-input").first();

  editorInput().click({ force: true });

  if (replace) {
    editorInput().type("{selectall}{backspace}", { force: true });
  }

  lines.forEach((line, index) => {
    if (line.length > 0) {
      editorInput().type(line, {
        force: true,
        delay,
        parseSpecialCharSequences: false,
      });
    }

    if (index < lines.length - 1) {
      editorInput().type("{enter}", { force: true });
    }
  });

  return editorInput();
});

Cypress.Commands.add("pasteInAce", { prevSubject: "element" }, (subject, text, options = {}) => {
  const replace = options.replace || false;
  const editorInput = () => cy.wrap(subject).find(".ace_text-input").first();

  editorInput().click({ force: true });

  if (replace) {
    editorInput().type("{selectall}{backspace}", { force: true });
  }

  return editorInput().then(($input) => {
    const input = $input[0];
    const pasteEvent = new input.ownerDocument.defaultView.Event("paste", {
      bubbles: true,
      cancelable: true,
    });

    Object.defineProperty(pasteEvent, "clipboardData", {
      value: {
        getData: (type) => (type === "text/plain" ? text : ""),
        types: ["text/plain"],
      },
    });

    input.dispatchEvent(pasteEvent);

    return cy.wrap($input);
  });
});

Cypress.Commands.add("all", (...functions) => {
  if (Cypress._.isEmpty(functions)) {
    return [];
  }

  const fns = Cypress._.isArray(functions[0]) ? functions[0] : functions;
  const results = [];

  fns.reduce((prev, fn) => {
    fn().then((result) => results.push(result));
    return results;
  }, results);

  return cy.wrap(results);
});

Cypress.Commands.overwrite("percySnapshot", (originalFn, ...args) => {
  Cypress.$("*[data-test=TimeAgo]").text("just now");
  return originalFn(...args);
});
