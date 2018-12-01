/* eslint-disable import/no-extraneous-dependencies, no-console */
const { execSync } = require('child_process');
const { post } = require('request').defaults({ jar: true });
const { seedData } = require('./seed-data');

const baseUrl = process.env.CYPRESS_baseUrl || 'http://localhost:5000';

function execSetup() {
  console.log('Running setup...');

  const setupData = {
    name: 'Example Admin',
    email: 'admin@redash.io',
    password: 'password',
    org_name: 'Redash',
  };

  post(baseUrl + '/setup', { formData: setupData });
}

function seedDatabase(seedValues) {
  const request = seedValues.shift();
  const data = request.type === 'form' ? { formData: request.data } : { json: request.data };

  post(baseUrl + request.route, data, (err, response) => {
    console.log('POST ' + request.route + ' - ' + response.statusCode);
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

const command = process.argv[2];

switch (command) {
  case 'start':
    startServer();
    execSetup();
    break;
  case 'start-ci':
    startServer();
    break;
  case 'setup':
    execSetup();
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
