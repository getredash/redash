describe('Settings', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/settings/organization');
  });

  it('renders the page and takes a screenshot', () => {
    cy.getByTestId('OrganizationSettings').within(() => {
      cy.get('select').should('have.value', 'DD/MM/YY');
    });

    cy.percySnapshot('Organization Settings');
  });
});
