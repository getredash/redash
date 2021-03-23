const percyHealthCheck = require("@percy/cypress/task"); // eslint-disable-line import/no-extraneous-dependencies, import/no-unresolved

module.exports = (on, config) => {
  if (config.env.coverage) {
    require("@cypress/code-coverage/task")(on, config);
  }
  on("task", percyHealthCheck);

  return config;
};
