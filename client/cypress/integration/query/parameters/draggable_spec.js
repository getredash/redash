import { createQuery } from "../../../support/redash-api";

describe("Draggable", () => {
  beforeEach(() => {
    cy.login();

    const queryData = {
      name: "Draggable",
      query: "SELECT '{{param1}}', '{{param2}}', '{{param3}}', '{{param4}}' AS parameter",
      options: {
        parameters: [
          { name: "param1", title: "Parameter 1", type: "text" },
          { name: "param2", title: "Parameter 2", type: "text" },
          { name: "param3", title: "Parameter 3", type: "text" },
          { name: "param4", title: "Parameter 4", type: "text" },
        ],
      },
    };

    createQuery(queryData, false).then(({ id }) => cy.visit(`/queries/${id}/source`));

    cy.get(".parameter-block")
      .first()
      .invoke("width")
      .as("paramWidth");

    cy.get("body").type("{alt}D"); // hide schema browser
  });

  const dragParam = (paramName, offsetLeft, offsetTop) => {
    cy.getByTestId(`DragHandle-${paramName}`)
      .trigger("mouseover")
      .trigger("mousedown");

    cy.get(".parameter-dragged .drag-handle")
      .trigger("mousemove", offsetLeft, offsetTop, { force: true })
      .trigger("mouseup", { force: true });
  };

  it("is possible to rearrange parameters", function() {
    cy.server();
    cy.route("POST", "api/queries/*").as("QuerySave");

    dragParam("param1", this.paramWidth, 1);
    cy.wait("@QuerySave");
    dragParam("param4", -this.paramWidth, 1);
    cy.wait("@QuerySave");

    cy.reload();

    const expectedOrder = ["Parameter 2", "Parameter 1", "Parameter 4", "Parameter 3"];
    cy.get(".parameter-container label").each(($label, index) => expect($label).to.have.text(expectedOrder[index]));
  });
});
