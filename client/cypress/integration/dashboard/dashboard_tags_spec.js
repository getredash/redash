import { createDashboard } from "../../support/redash-api";
import { expectTagsToContain, typeInTagsSelectAndSave } from "../../support/tags";

describe("Dashboard Tags", () => {
  beforeEach(function() {
    cy.login();
    createDashboard("Foo Bar").then(({ slug }) => cy.visit(`/dashboard/${slug}`));
  });

  it("is possible to add and edit tags", () => {
    cy.server();
    cy.route("POST", "api/dashboards/*").as("DashboardSave");

    cy.getByTestId("TagsControl").contains(".label", "Unpublished");

    cy.getByTestId("EditTagsButton")
      .should("contain", "Add tag")
      .click();

    typeInTagsSelectAndSave("tag1{enter}tag2{enter}tag3{enter}{esc}");

    cy.wait("@DashboardSave");
    expectTagsToContain(["tag1", "tag2", "tag3"]);

    cy.getByTestId("EditTagsButton").click();
    typeInTagsSelectAndSave("tag4{enter}{esc}");

    cy.wait("@DashboardSave");
    cy.reload();
    expectTagsToContain(["tag1", "tag2", "tag3", "tag4"]);
  });
});
