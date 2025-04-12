import { expectTagsToContain, typeInTagsSelectAndSave } from "../../support/tags";

describe("Query Tags", () => {
  beforeEach(() => {
    cy.login();

    const queryData = {
      name: "Query Tags",
      query: "SELECT 1 as value",
    };

    cy.createQuery(queryData, false).then(({ id }) => cy.visit(`/queries/${id}`));
  });

  it("is possible to add and edit tags", () => {
    cy.server();
    cy.route("POST", "**/api/queries/*").as("QuerySave");

    cy.getByTestId("TagsControl").contains(".label", "Unpublished");

    cy.getByTestId("EditTagsButton")
      .should("contain", "Add tag")
      .click();

    typeInTagsSelectAndSave("tag1{enter}tag2{enter}tag3{enter}");

    cy.wait("@QuerySave");
    expectTagsToContain(["tag1", "tag2", "tag3"]);

    cy.getByTestId("EditTagsButton").click();
    typeInTagsSelectAndSave("tag4{enter}");

    cy.wait("@QuerySave");
    cy.reload();
    expectTagsToContain(["tag1", "tag2", "tag3", "tag4"]);
  });
});
