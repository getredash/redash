module.exports = {
  root: true,
  extends: ["plugin:cypress/recommended", "../.eslintrc.js"],
  plugins: ["cypress", "chai-friendly"],
  env: {
    "cypress/globals": true,
  },
  rules: {
    "func-names": ["error", "never"],
    "no-unused-expressions": 0,
    "chai-friendly/no-unused-expressions": 2
  }
};
