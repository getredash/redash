/* global cy */

import { createDashboard, addTextbox } from "../../support/redash-api";
import { getWidgetTestId, editDashboard, resizeBy } from "../../support/dashboard";

describe("Grid compliant widgets", () => {
  beforeEach(function() {
    cy.login();
    cy.viewport(1215, 800);
    createDashboard("Foo Bar")
      .then(({ slug, id }) => {
        this.dashboardUrl = `/dashboard/${slug}`;
        return addTextbox(id, "Hello World!").then(getWidgetTestId);
      })
      .then(elTestId => {
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
          .dragBy(90)
          .invoke("offset")
          .should("have.property", "left", 15); // no change, 15 -> 15
      });

      it("moves one column when dragged over snap threshold", () => {
        cy.get("@textboxEl")
          .dragBy(110)
          .invoke("offset")
          .should("have.property", "left", 215); //  moved by 200, 15 -> 215
      });

      it("moves two columns when dragged over snap threshold", () => {
        cy.get("@textboxEl")
          .dragBy(330)
          .invoke("offset")
          .should("have.property", "left", 415); //  moved by 400, 15 -> 415
      });
    });

    it("auto saves after drag", () => {
      cy.server();
      cy.route("POST", "api/widgets/*").as("WidgetSave");

      editDashboard();
      cy.get("@textboxEl").dragBy(330);
      cy.wait("@WidgetSave");
    });
  });

  describe("Resizeable", () => {
    describe("Column snap", () => {
      beforeEach(() => {
        editDashboard();
      });

      it("stays put when dragged under snap threshold", () => {
        resizeBy(cy.get("@textboxEl"), 90)
          .then(() => cy.get("@textboxEl"))
          .invoke("width")
          .should("eq", 585); // no change, 585 -> 585
      });

      it("moves one column when dragged over snap threshold", () => {
        resizeBy(cy.get("@textboxEl"), 110)
          .then(() => cy.get("@textboxEl"))
          .invoke("width")
          .should("eq", 785); // resized by 200, 585 -> 785
      });

      it("moves two columns when dragged over snap threshold", () => {
        resizeBy(cy.get("@textboxEl"), 400)
          .then(() => cy.get("@textboxEl"))
          .invoke("width")
          .should("eq", 985); // resized by 400, 585 -> 985
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
          .should("eq", 185); // resized by 50, , 135 -> 185
      });

      it("shrinks to minimum", () => {
        cy.get("@textboxEl")
          .then($el => resizeBy(cy.get("@textboxEl"), -$el.width(), -$el.height())) // resize to 0,0
          .then(() => cy.get("@textboxEl"))
          .should($el => {
            expect($el.width()).to.eq(185); // min textbox width
            expect($el.height()).to.eq(35); // min textbox height
          });
      });
    });

    it("auto saves after resize", () => {
      cy.server();
      cy.route("POST", "api/widgets/*").as("WidgetSave");

      editDashboard();
      resizeBy(cy.get("@textboxEl"), 200);
      cy.wait("@WidgetSave");
    });
  });
});
