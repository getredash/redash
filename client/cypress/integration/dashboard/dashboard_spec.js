/* global cy, Cypress */

import { getWidgetTestId } from "../../support/dashboard";

const menuWidth = 80;

describe("Dashboard", () => {
  beforeEach(() => {
    cy.login();
  });

  it("creates new dashboard", () => {
    cy.visit("/dashboards");
    cy.getByTestId("CreateButton").click();
    cy.getByTestId("CreateDashboardMenuItem").click();

    cy.server();
    cy.route("POST", "**/api/dashboards").as("NewDashboard");

    cy.getByTestId("CreateDashboardDialog").within(() => {
      cy.getByTestId("DashboardSaveButton").should("be.disabled");
      cy.get("input").type("Foo Bar");
      cy.getByTestId("DashboardSaveButton").click();
    });

    cy.wait("@NewDashboard").then(xhr => {
      const id = Cypress._.get(xhr, "response.body.id");
      assert.isDefined(id, "Dashboard api call returns id");

      cy.visit("/dashboards");
      cy.getByTestId("DashboardLayoutContent").within(() => {
        cy.getByTestId(`DashboardId${id}`).should("exist");
      });
    });
  });

  it("archives dashboard", () => {
    cy.createDashboard("Foo Bar").then(({ id }) => {
      cy.visit(`/dashboards/${id}`);

      cy.getByTestId("DashboardMoreButton").click();

      cy.getByTestId("DashboardMoreButtonMenu")
        .contains("Archive")
        .click();

      cy.get(".ant-modal .ant-btn")
        .contains("Archive")
        .click({ force: true });
      cy.get(".label-tag-archived").should("exist");

      cy.visit("/dashboards");
      cy.getByTestId("DashboardLayoutContent").within(() => {
        cy.getByTestId(`DashboardId${id}`).should("not.exist");
      });
    });
  });

  it("is accessible through multiple urls", () => {
    cy.server();
    cy.route("GET", "**/api/dashboards/*").as("LoadDashboard");
    cy.createDashboard("Dashboard multiple urls").then(({ id, slug }) => {
      [`/dashboards/${id}`, `/dashboards/${id}-anything-here`, `/dashboard/${slug}`].forEach(url => {
        cy.visit(url);
        cy.wait("@LoadDashboard");
        cy.getByTestId(`DashboardId${id}Container`).should("exist");

        // assert it always use the "/dashboards/{id}" path
        cy.location("pathname").should("contain", `/dashboards/${id}`);
      });
    });
  });

  context("viewport width is at 800px", () => {
    before(function() {
      cy.login();
      cy.createDashboard("Foo Bar")
        .then(({ id }) => {
          this.dashboardUrl = `/dashboards/${id}`;
          this.dashboardEditUrl = `/dashboards/${id}?edit`;
          return cy.addTextbox(id, "Hello World!").then(getWidgetTestId);
        })
        .then(elTestId => {
          cy.visit(this.dashboardUrl);
          cy.getByTestId(elTestId).as("textboxEl");
        });
    });

    beforeEach(function() {
      cy.login();
      cy.visit(this.dashboardUrl);
      cy.viewport(800 + menuWidth, 800);
    });

    it("shows widgets with full width", () => {
      cy.get("@textboxEl").should($el => {
        expect($el.width()).to.eq(770);
      });

      cy.viewport(801 + menuWidth, 800);
      cy.get("@textboxEl").should($el => {
        expect($el.width()).to.eq(378);
      });
    });

    it("hides edit option", () => {
      cy.getByTestId("DashboardMoreButton")
        .click()
        .should("be.visible");

      cy.getByTestId("DashboardMoreButtonMenu")
        .contains("Edit")
        .as("editButton")
        .should("not.be.visible");

      cy.viewport(801 + menuWidth, 800);
      cy.get("@editButton").should("be.visible");
    });

    it("disables edit mode", function() {
      cy.viewport(801 + menuWidth, 800);
      cy.visit(this.dashboardEditUrl);
      cy.contains("button", "Done Editing")
        .as("saveButton")
        .should("exist");

      cy.viewport(800 + menuWidth, 800);
      cy.contains("button", "Done Editing").should("not.exist");
    });
  });

  context("viewport width is at 767px", () => {
    before(function() {
      cy.login();
      cy.createDashboard("Foo Bar").then(({ id }) => {
        this.dashboardUrl = `/dashboards/${id}`;
      });
    });

    beforeEach(function() {
      cy.visit(this.dashboardUrl);
      cy.viewport(767, 800);
    });
  });
});
