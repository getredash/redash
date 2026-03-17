module.exports = {
  extends: ["plugin:cypress/recommended"],
  plugins: ["cypress", "chai-friendly"],
  env: {
    "cypress/globals": true,
  },
  rules: {
    "func-names": ["error", "never"],
    "no-unused-expressions": 0,
    "chai-friendly/no-unused-expressions": 2,
    "no-redeclare": "off",
    "cypress/unsafe-to-chain-command": "off",
  },
};
