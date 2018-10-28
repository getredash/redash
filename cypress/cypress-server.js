const { execSync } = require('child_process');
const { post } = require('request');

function startServer() {
  console.log('Starting the server...');
  execSync('docker-compose -p cypress up -d && \
            docker-compose -p cypress run server create_db');
  execSetup();
}

function stopServer() {
  console.log('Stopping the server...');
  execSync('docker-compose -p cypress down');
}

function execSetup() {
  console.log('Running setup...');

  const setupData = {
    name: 'Example Admin',
    email: 'admin@redash.io',
    password: 'password',
    org_name: 'Redash'
  };

  post('http://localhost:5000/setup', { formData: setupData });
}

const command = process.argv[2];

switch(command) {
  case 'start':
    startServer();
    break;
  case 'stop':
    stopServer();
    break;
  default:
    console.log('Usage: npm run cypress:server start|stop');
    break;
}
