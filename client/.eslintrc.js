module.exports = {
  root: true,
  extends: 'airbnb-base',
  env: {
    "browser": true,
    "node": true
  },
  rules: {
    // allow debugger during development
    'no-param-reassign': 0,
    'no-mixed-operators': 0,
    'no-underscore-dangle': 0,
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0
  }
}
