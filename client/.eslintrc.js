module.exports = {
  root: true,
  extends: "airbnb-base",
  settings: {
    "import/resolver": "webpack"
  },
  env: {
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
    "max-len": ['error', 120, 2, {
      ignoreUrls: true,
      ignoreComments: false,
      ignoreRegExpLiterals: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
    }]
  }
};
