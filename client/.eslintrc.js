module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  extends: [
    "react-app",
    "plugin:compat/recommended",
    "prettier",
    "prettier/@typescript-eslint" // Remove any typescript-eslint rules that would conflict with prettier
  ],
  plugins: [
    "jest",
    "compat",
    "no-only-tests",
    "@typescript-eslint"
  ],
  settings: {
    "import/resolver": "webpack"
  },
  env: {
    browser: true,
    node: true
  },
  rules: {
    // allow debugger during development
    "no-debugger": process.env.NODE_ENV === "production" ? 2 : 0,
    "jsx-a11y/anchor-is-valid": "off",
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx", ".*.ts", ".*.tsx"],
      extends: [ // Only run typescript-eslint on TS files
        "plugin:@typescript-eslint/recommended",
      ],
      rules: {
        // Do not require functions (especially react components) to have explicit returns
        "@typescript-eslint/explicit-function-return-type": "off"
      },
    }
  ]
};
