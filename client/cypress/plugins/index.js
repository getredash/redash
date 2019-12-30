const percyHealthCheck = require("@percy/cypress/task"); // eslint-disable-line import/no-extraneous-dependencies, import/no-unresolved

module.exports = on => {
  on("task", percyHealthCheck);
};
