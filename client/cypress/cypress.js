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

function runCypressCI() {
  const { PERCY_TOKEN_ENCODED, CIRCLE_REPOSITORY_URL } = process.env;

  if (PERCY_TOKEN_ENCODED && CIRCLE_REPOSITORY_URL && CIRCLE_REPOSITORY_URL.includes('getredash/redash')) {
    process.env.PERCY_TOKEN = atob(`${PERCY_TOKEN_ENCODED}`);
  }
  execSync(
    'docker-compose run cypress ./node_modules/.bin/percy exec -- ./node_modules/.bin/cypress run --browser chrome',
    { stdio: 'inherit' },
  );
}

const command = process.argv[2] || 'all';

switch (command) {
  case 'start':
    startServer();
    break;
  case 'db-seed':
    seedDatabase(seedData);
    break;
  case 'run':
    execSync('cypress run --browser chrome', { stdio: 'inherit' });
    break;
  case 'open':
    execSync('cypress open', { stdio: 'inherit' });
    break;
  case 'run-ci':
    runCypressCI();
    break;
  case 'stop':
    stopServer();
    break;
  case 'all':
    startServer();
    seedDatabase(seedData);
    execSync('cypress run --browser chrome', { stdio: 'inherit' });
    stopServer();
    break;
  default:
    console.log('Usage: npm run cypress [start|db-seed|open|run|stop]');
    break;
}
