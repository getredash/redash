/* global cy */

import { getWidgetTestId, editDashboard, resizeBy } from "../../support/dashboard";

const menuWidth = 80;

describe("Grid compliant widgets", () => {
  beforeEach(function () {
    cy.login();
    cy.viewport(1215 + menuWidth, 800);
    cy.createDashboard("Foo Bar")
      .then(({ id }) => {
        this.dashboardUrl = `/dashboards/${id}`;
        return cy.addTextbox(id, "Hello World!").then(getWidgetTestId);
      })
      .then((elTestId) => {
        cy.visit(this.dashboardUrl);
        cy.getByTestId(elTestId).as("textboxEl");
      });
  });

  describe("Draggable", () => {
    describe("Grid snap", () => {
      beforeEach(() => {
        editDashboard();
      });

      it("stays put when dragged under snap threshold", () => {
        cy.get("@textboxEl")
          .dragBy(30)
          .invoke("offset")
          .should("have.property", "left", 15 + menuWidth); // no change, 15 -> 15
      });

      it("moves one column when dragged over snap threshold", () => {
        cy.get("@textboxEl")
          .dragBy(110)
          .invoke("offset")
          .should("have.property", "left", 115 + menuWidth); //  moved by 100, 15 -> 115
      });

      it("moves two columns when dragged over snap threshold", () => {
        cy.get("@textboxEl")
          .dragBy(200)
          .invoke("offset")
          .should("have.property", "left", 215 + menuWidth); //  moved by 200, 15 -> 215
      });
    });

    it("auto saves after drag", () => {
      cy.server();
      cy.route("POST", "**/api/widgets/*").as("WidgetSave");

      editDashboard();
      cy.get("@textboxEl").dragBy(100);
      cy.wait("@WidgetSave");
    });
  });

  describe("Resizeable", () => {
    describe("Column snap", () => {
      beforeEach(() => {
        editDashboard();
      });

      it("stays put when dragged under snap threshold", () => {
        resizeBy(cy.get("@textboxEl"), 30)
          .then(() => cy.get("@textboxEl"))
          .invoke("width")
          .should("eq", 285); // no change, 285 -> 285
      });

      it("moves one column when dragged over snap threshold", () => {
        resizeBy(cy.get("@textboxEl"), 110)
          .then(() => cy.get("@textboxEl"))
          .invoke("width")
          .should("eq", 385); // resized by 200, 185 -> 385
      });

      it("moves two columns when dragged over snap threshold", () => {
        resizeBy(cy.get("@textboxEl"), 400)
          .then(() => cy.get("@textboxEl"))
          .invoke("width")
          .should("eq", 685); // resized by 400, 285 -> 685
      });
    });

    describe("Row snap", () => {
      beforeEach(() => {
        editDashboard();
      });

      it("stays put when dragged under snap threshold", () => {
        resizeBy(cy.get("@textboxEl"), 0, 10)
          .then(() => cy.get("@textboxEl"))
          .invoke("height")
          .should("eq", 135); // no change, 135 -> 135
      });

      it("moves one row when dragged over snap threshold", () => {
        resizeBy(cy.get("@textboxEl"), 0, 30)
          .then(() => cy.get("@textboxEl"))
          .invoke("height")
          .should("eq", 185);
      });

      it("shrinks to minimum", () => {
        cy.get("@textboxEl")
          .then(($el) => resizeBy(cy.get("@textboxEl"), -$el.width(), -$el.height())) // resize to 0,0
          .then(() => cy.get("@textboxEl"))
          .should(($el) => {
            expect($el.width()).to.eq(185); // min textbox width
            expect($el.height()).to.eq(85); // min textbox height
          });
      });
    });

    it("auto saves after resize", () => {
      cy.server();
      cy.route("POST", "**/api/widgets/*").as("WidgetSave");

      editDashboard();
      resizeBy(cy.get("@textboxEl"), 200);
      cy.wait("@WidgetSave");
    });
  });
});
