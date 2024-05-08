const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:5001",
    defaultCommandTimeout: 20000,
    downloadsFolder: "client/cypress/downloads",
    fixturesFolder: "client/cypress/fixtures",
    requestTimeout: 15000,
    screenshotsFolder: "client/cypress/screenshots",
    specPattern: "client/cypress/integration/",
    supportFile: "client/cypress/support/index.js",
    video: true,
    videoUploadOnPasses: false,
    videosFolder: "client/cypress/videos",
    viewportHeight: 1024,
    viewportWidth: 1280,
    setupNodeEvents(on, config) {
      config.env = {
        ...process.env,
        ...config.env,
        coverage: false,
      }
      config.env.CYPRESS_LOGIN_NAME = process.env.CYPRESS_LOGIN_NAME || "Example Admin";
      config.env.CYPRESS_LOGIN_EMAIL = process.env.CYPRESS_LOGIN_EMAIL || "admin@redash.io";
      config.env.CYPRESS_LOGIN_PASSWORD = process.env.CYPRESS_LOGIN_PASSWORD || "password";
      config.env.CYPRESS_ORG_NAME = process.env.CYPRESS_ORG_NAME || "Redash";
      return config 
    },
  },

  component: {
    setupNodeEvents(on, config) {
      config.env = {
        ...process.env,
        ...config.env,
        coverage: false,
      }
      return config 
    },
    devServer: {
      framework: "react",
      bundler: "webpack",
    },
  },

});
