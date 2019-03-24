module.exports = {
  root: true,
  extends: ["plugin:cypress/recommended", '../.eslintrc.js'],
  plugins: ["cypress"],
  env: {
    "cypress/globals": true,
  },
  rules: {
    "func-names": ["error", "never"]
  }
};
