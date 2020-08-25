import { expectTagsToContain, typeInTagsSelectAndSave } from "../../support/tags";

describe("Dashboard Tags", () => {
  beforeEach(function() {
    cy.login();
    cy.createDashboard("Foo Bar").then(({ id }) => cy.visit(`/dashboards/${id}`));
  });

  it("is possible to add and edit tags", () => {
    cy.server();
    cy.route("POST", "**/api/dashboards/*").as("DashboardSave");

    cy.getByTestId("TagsControl").contains(".label", "Unpublished");

    cy.getByTestId("EditTagsButton")
      .should("contain", "Add tag")
      .click();

    typeInTagsSelectAndSave("tag1{enter}tag2{enter}tag3{enter}");

    cy.wait("@DashboardSave");
    expectTagsToContain(["tag1", "tag2", "tag3"]);

    cy.getByTestId("EditTagsButton").click();
    typeInTagsSelectAndSave("tag4{enter}");

    cy.wait("@DashboardSave");
    cy.reload();
    expectTagsToContain(["tag1", "tag2", "tag3", "tag4"]);
  });
});
