describe('Create Destination', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/destinations/new');
  });

  it('renders the page and takes a screenshot', () => {
    cy.getByTestId('TypePicker').should('contain', 'Email');
    cy.percySnapshot('Create Destination - Types');
  });
});
