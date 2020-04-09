module.exports = {
  root: true,
  extends: ["react-app", "plugin:compat/recommended", "prettier"],
  plugins: ["jest", "compat", "no-only-tests"],
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
  }
};
