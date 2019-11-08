const percyHealthCheck = require('@percy/cypress/task');// eslint-disable-line import/no-extraneous-dependencies

module.exports = (on) => {
  on('task', percyHealthCheck);
};
