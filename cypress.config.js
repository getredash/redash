const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5001',
    defaultCommandTimeout: 15000,
    downloadsFolder: 'client/cypress/downloads',
    fixturesFolder: 'client/cypress/fixtures',
    requestTimeout: 15000,
    screenshotsFolder: 'client/cypress/screenshots',
    specPattern: 'client/cypress/integration/',
    supportFile: 'client/cypress/support/index.js',
    chromeWebSecurity: false,
    video: true,
    videosFolder: 'client/cypress/videos',
    viewportHeight: 1024,
    viewportWidth: 1280,
    env: {
      coverage: false
    }
  },
})
