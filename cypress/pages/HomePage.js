import Page from './Page';

class HomePage extends Page {
  constructor() {
    super('/');
    this.profileDropdown = '[data-testid=ProfileDropdown]';
  }

  validateTitle() {
    cy.title().should('eq', 'Redash');
  }
}

export default HomePage;
