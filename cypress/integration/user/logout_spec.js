import LoginPage from '../../pages/LoginPage';
import HomePage from '../../pages/HomePage';

describe('Logout', () => {
  const homePage = new HomePage();

  beforeEach(() => {
    cy.login();
    homePage.visit();
  });

  it('shows login page after logout', () => {
    const loginPage = new LoginPage();

    cy.get(homePage.profileDropdown).click();
    cy.contains('Log out').click();

    loginPage.validateTitle();
  });
});
