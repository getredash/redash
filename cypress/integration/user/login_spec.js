import LoginPage from '../../pages/LoginPage';
import HomePage from '../../pages/HomePage';

describe('Login', () => {
  const loginPage = new LoginPage();

  beforeEach(() => {
    loginPage.visit();
  });

  it('shows message on failed login', () => {
    loginPage
      .fillEmail('admin@redash.io')
      .fillPassword('wrongpassword')
      .submit();

    cy.get(loginPage.errorMessage).contains('Wrong email or password.');
  });

  it('navigates to homepage with successful login', () => {
    const homePage = new HomePage();

    loginPage
      .fillEmail('admin@redash.io')
      .fillPassword('password')
      .submit();

    homePage.validateTitle();
    cy.contains('Example Admin');
  });
});
