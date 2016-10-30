module.exports = {
  root: true,
  extends: 'airbnb-base',
  rules: {
    // allow debugger during development
    'no-param-reassign': ['error', { "props": false }],
    'no-underscore-dangle': 0,
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0
  }
}
