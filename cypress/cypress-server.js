/* eslint-disable import/no-extraneous-dependencies, no-console */
const atob = require('atob');
const { execSync } = require('child_process');
const { post } = require('request').defaults({ jar: true });
const { seedData } = require('./seed-data');

const baseUrl = process.env.CYPRESS_baseUrl || 'http://localhost:5000';

function seedDatabase(seedValues) {
  const request = seedValues.shift();
  const data = request.type === 'form' ? { formData: request.data } : { json: request.data };

  post(baseUrl + request.route, data, (err, response) => {
    const result = response ? response.statusCode : err;
    console.log('POST ' + request.route + ' - ' + result);
    if (seedValues.length) {
      seedDatabase(seedValues);
    }
  });
}

function startServer() {
  console.log('Starting the server...');

  execSync('docker-compose -p cypress build --build-arg skip_ds_deps=true', { stdio: 'inherit' });
  execSync('docker-compose -p cypress up -d', { stdio: 'inherit' });
  execSync('docker-compose -p cypress run server create_db', { stdio: 'inherit' });
}

function stopServer() {
  console.log('Stopping the server...');
  execSync('docker-compose -p cypress down', { stdio: 'inherit' });
}

function runCypress() {
  if (process.env.PERCY_TOKEN_ENCODED) {
    process.env.PERCY_TOKEN = atob(`${process.env.PERCY_TOKEN_ENCODED}`);
  }
  execSync('docker-compose run cypress ./node_modules/.bin/percy exec -- ./node_modules/.bin/cypress run', { stdio: 'inherit' });
}

const command = process.argv[2];

switch (command) {
  case 'start':
    startServer();
    seedDatabase(seedData);
    break;
  case 'start-ci':
    startServer();
    break;
  case 'run-ci':
    runCypress();
    break;
  case 'db-seed':
    seedDatabase(seedData);
    break;
  case 'stop':
    stopServer();
    break;
  default:
    console.log('Usage: npm run cypress:server start|stop');
    break;
}
