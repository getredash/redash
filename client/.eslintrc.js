module.exports = {
  root: true,
  extends: ["airbnb", "plugin:jest/recommended"],
  plugins: ["jest", "cypress"],
  settings: {
    "import/resolver": "webpack"
  },
  parser: "babel-eslint",
  env: {
    "jest/globals": true,
    "cypress/globals": true,
    "browser": true,
    "node": true
  },
  rules: {
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    'no-param-reassign': 0,
    'no-mixed-operators': 0,
    'no-underscore-dangle': 0,
    "prefer-destructuring": "off",
    "prefer-template": "off",
    "no-restricted-properties": "off",
    "no-restricted-globals": "off",
    "no-multi-assign": "off",
    "no-lonely-if": "off",
    "consistent-return": "off",
    "no-control-regex": "off",
    "react/jsx-filename-extension": "off",
    "react/jsx-uses-react": "error",
    "react/jsx-uses-vars": "error",
    "react/prefer-stateless-function": "warn",
    "react/forbid-prop-types": "warn",
    "react/prop-types": "warn",
    "jsx-a11y/anchor-is-valid": "off",
    "max-len": ['error', 120, 2, {
      ignoreUrls: true,
      ignoreComments: false,
      ignoreRegExpLiterals: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
    }]
  }
};
