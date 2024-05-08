/* global Cypress */

import "@percy/cypress"; // eslint-disable-line import/no-extraneous-dependencies, import/no-unresolved

import "@testing-library/cypress/add-commands";

const { each } = Cypress._;

const LOGIN_NAME = Cypress.env("CYPRESS_LOGIN_NAME");
const LOGIN_EMAIL = Cypress.env("CYPRESS_LOGIN_EMAIL");
const LOGIN_PASSWORD = Cypress.env("CYPRESS_LOGIN_PASSWORD");
const ORG_NAME = Cypress.env("CYPRESS_ORG_NAME");

Cypress.Commands.add("setup", () => {
  const email = LOGIN_EMAIL;
  const password = LOGIN_PASSWORD;
  const org_name = ORG_NAME;
  const name = LOGIN_NAME;
  let csrf;
  cy.visit("/setup");
  cy.location().then(loc => {
    if (loc.pathname === "/setup") {
      cy.getCookie("csrf_token")
        .then(cookie => {
          if (cookie) {
            csrf = cookie.value;
          } else {
            cy.visit("/setup").then(() => {
              cy.get('input[name="csrf_token"]')
                .invoke("val")
                .then(csrf_token => {
                  csrf = csrf_token;
                });
            });
          }
        })
        .then(() => {
          cy.request({
            url: "/setup",
            method: "POST",
            form: true,
            body: {
              name,
              org_name,
              email,
              password,
              csrf_token: csrf,
            },
          });
        });
      cy.login();
      cy.setupDatasource();
      cy.setupDestination();
    }
  });
});

Cypress.Commands.add("setupDatasource", () => {
  const dbname = "postgres";
  const host = "postgres";
  const port = 5432;
  const sslmode = "prefer";
  const user = "postgres";
  cy.getCookie("csrf_token").then(cookie => {
    cy.request({
      headers: {
        "X-CSRF-TOKEN": cookie.value,
      },
      url: "/api/data_sources",
      method: "POST",
      body: {
        name: "Test PostgreSQL",
        options: {
          dbname,
          host,
          port,
          sslmode,
          user,
        },
        type: "pg",
      },
    });
  });
});

Cypress.Commands.add("setupDestination", () => {
  const name = "Test Email Destination";
  const options = {
    addresses: "test@example.com",
  };
  const type = "email";
  cy.getCookie("csrf_token").then(cookie => {
    cy.request({
      headers: {
        "X-CSRF-TOKEN": cookie.value,
      },
      url: "/api/destinations",
      method: "POST",
      body: {
        name,
        options,
        type,
      },
    });
  });
});

Cypress.Commands.add("login", (email = LOGIN_EMAIL, password = LOGIN_PASSWORD) => {
  let csrf;
  cy.visit("/login");
  cy.getCookie("csrf_token")
    .then(cookie => {
      if (cookie) {
        csrf = cookie.value;
      } else {
        cy.visit("/login").then(() => {
          cy.get('input[name="csrf_token"]')
            .invoke("val")
            .then(csrf_token => {
              csrf = csrf_token;
            });
        });
      }
    })
    .then(() => {
      cy.request({
        url: "/login",
        method: "POST",
        form: true,
        body: {
          email,
          password,
          csrf_token: csrf,
        },
      });
    });
});

Cypress.Commands.add("logout", () => cy.visit("/logout"));
Cypress.Commands.add("getByTestId", element => cy.get('[data-test="' + element + '"]'));

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
  args.forEach(elements => {
    const names = elements.button || elements;

    const click = element =>
      (elements.button ? cy.contains("button", element.trim()) : cy.getByTestId(element.trim())).click();

    names
      .trim()
      .split(/\n/)
      .filter(Boolean)
      .forEach(click);
  });

  return undefined;
});

/**
 * Selects ANTD selector option
 */
Cypress.Commands.add("selectAntdOption", { prevSubject: "element" }, (subject, testId) => {
  cy.wrap(subject).click();
  return cy.getByTestId(testId).click({ force: true });
});

Cypress.Commands.add("fillInputs", (elements, { wait = 0 } = {}) => {
  each(elements, (value, testId) => {
    cy.getByTestId(testId)
      .filter(":visible")
      .clear()
      .type(value);
    if (wait > 0) {
      cy.wait(wait); // eslint-disable-line cypress/no-unnecessary-waiting
    }
  });
});

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

Cypress.Commands.add("all", (...functions) => {
  if (Cypress._.isEmpty(functions)) {
    return [];
  }

  const fns = Cypress._.isArray(functions[0]) ? functions[0] : functions;
  const results = [];

  fns.reduce((prev, fn) => {
    fn().then(result => results.push(result));
    return results;
  }, results);

  return cy.wrap(results);
});

Cypress.Commands.overwrite("percySnapshot", (originalFn, ...args) => {
  Cypress.$("*[data-test=TimeAgo]").text("just now");
  return originalFn(...args);
});
