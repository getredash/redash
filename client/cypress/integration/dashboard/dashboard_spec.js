/* global cy, Cypress */

import { createDashboard, addTextbox } from "../../support/redash-api";
import { getWidgetTestId } from "../../support/dashboard";

describe("Dashboard", () => {
  beforeEach(() => {
    cy.login();
  });

  it("creates new dashboard", () => {
    cy.visit("/dashboards");
    cy.getByTestId("CreateButton").click();
    cy.get('li[role="menuitem"]')
      .contains("New Dashboard")
      .click();

    cy.server();
    cy.route("POST", "api/dashboards").as("NewDashboard");

    cy.getByTestId("CreateDashboardDialog").within(() => {
      cy.getByTestId("DashboardSaveButton").should("be.disabled");
      cy.get("input").type("Foo Bar");
      cy.getByTestId("DashboardSaveButton").click();
    });

    cy.wait("@NewDashboard").then(xhr => {
      const slug = Cypress._.get(xhr, "response.body.slug");
      assert.isDefined(slug, "Dashboard api call returns slug");

      cy.visit("/dashboards");
      cy.getByTestId("DashboardLayoutContent").within(() => {
        cy.getByTestId(slug).should("exist");
      });
    });
  });

  it("archives dashboard", () => {
    createDashboard("Foo Bar").then(({ slug }) => {
      cy.visit(`/dashboard/${slug}`);

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
        cy.getByTestId(slug).should("not.exist");
      });
    });
  });

  context("viewport width is at 800px", () => {
    before(function() {
      cy.login();
      createDashboard("Foo Bar")
        .then(({ slug, id }) => {
          this.dashboardUrl = `/dashboard/${slug}`;
          this.dashboardEditUrl = `/dashboard/${slug}?edit`;
          return addTextbox(id, "Hello World!").then(getWidgetTestId);
        })
        .then(elTestId => {
          cy.visit(this.dashboardUrl);
          cy.getByTestId(elTestId).as("textboxEl");
        });
    });

    beforeEach(function() {
      cy.visit(this.dashboardUrl);
      cy.viewport(800, 800);
    });

    it("shows widgets with full width", () => {
      cy.get("@textboxEl").should($el => {
        expect($el.width()).to.eq(770);
      });

      cy.viewport(801, 800);
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

      cy.viewport(801, 800);
      cy.get("@editButton").should("be.visible");
    });

    it("disables edit mode", function() {
      cy.viewport(801, 800);
      cy.visit(this.dashboardEditUrl);
      cy.contains("button", "Done Editing")
        .as("saveButton")
        .should("exist");

      cy.viewport(800, 800);
      cy.contains("button", "Done Editing").should("not.exist");
    });
  });

  context("viewport width is at 767px", () => {
    before(function() {
      cy.login();
      createDashboard("Foo Bar").then(({ slug }) => {
        this.dashboardUrl = `/dashboard/${slug}`;
      });
    });

    beforeEach(function() {
      cy.visit(this.dashboardUrl);
      cy.viewport(767, 800);
    });

    it("hides menu button", () => {
      cy.get(".dashboard-control").should("exist");
      cy.getByTestId("DashboardMoreButton").should("not.be.visible");

      cy.viewport(768, 800);
      cy.getByTestId("DashboardMoreButton").should("be.visible");
    });
  });
});
