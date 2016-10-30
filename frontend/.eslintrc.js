module.exports = {
  root: true,
  extends: 'airbnb-base',
  'rules': {
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0
  }
}
