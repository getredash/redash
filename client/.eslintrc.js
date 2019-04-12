module.exports = {
  root: true,
  extends: ["airbnb", "plugin:compat/recommended"],
  plugins: ["jest", "compat"],
  settings: {
    "import/resolver": "webpack"
  },
  parser: "babel-eslint",
  env: {
    browser: true,
    node: true
  },
  rules: {
    // allow debugger during development
    "no-debugger": process.env.NODE_ENV === "production" ? 2 : 0,
    "no-param-reassign": 0,
    "no-mixed-operators": 0,
    "no-underscore-dangle": 0,
    "no-use-before-define": ["error", "nofunc"],
    "prefer-destructuring": "off",
    "prefer-template": "off",
    "no-restricted-properties": "off",
    "no-restricted-globals": "off",
    "no-multi-assign": "off",
    "no-lonely-if": "off",
    "consistent-return": "off",
    "no-control-regex": "off",
    "no-multiple-empty-lines": "warn",
    "no-script-url": "off", // some <a> tags should have href="javascript:void(0)"
    "operator-linebreak": "off",
    "react/destructuring-assignment": "off",
    "react/jsx-filename-extension": "off",
    "react/jsx-one-expression-per-line": "off",
    "react/jsx-uses-react": "error",
    "react/jsx-uses-vars": "error",
    "react/jsx-wrap-multilines": "warn",
    "react/no-access-state-in-setstate": "warn",
    "react/prefer-stateless-function": "warn",
    "react/forbid-prop-types": "warn",
    "react/prop-types": "warn",
    "jsx-a11y/anchor-is-valid": "off",
    "jsx-a11y/click-events-have-key-events": "off",
    "jsx-a11y/label-has-associated-control": [
      "warn",
      {
        controlComponents: true
      }
    ],
    "jsx-a11y/label-has-for": "off",
    "jsx-a11y/no-static-element-interactions": "off",
    "max-len": [
      "error",
      120,
      2,
      {
        ignoreUrls: true,
        ignoreComments: false,
        ignoreRegExpLiterals: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true
      }
    ],
    "no-else-return": ["error", { allowElseIf: true }],
    "object-curly-newline": ["error", { consistent: true }]
  }
};
