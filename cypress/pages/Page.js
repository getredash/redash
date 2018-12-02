class Page {
  constructor(path) {
    this.path = path;
  }

  visit() {
    cy.visit(this.path);
  }
}

export default Page;
