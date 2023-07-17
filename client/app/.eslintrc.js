module.exports = {
  extends: ["plugin:jest/recommended"],
  plugins: ["jest"],
  env: {
    "jest/globals": true,
  },
  rules: {
    "jest/no-focused-tests": "off",
  },
};
