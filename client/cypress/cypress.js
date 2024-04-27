/* eslint-disable import/no-extraneous-dependencies, no-console */
const { execSync } = require("child_process");

function buildServer() {
  console.log("Building the server...");
  execSync("docker compose build", { stdio: "inherit" });
}

function startServer() {
  console.log("Starting the server...");
  execSync("docker compose up -d", { stdio: "inherit" });
  execSync("docker compose run server create_db", { stdio: "inherit" });
}

function stopServer() {
  console.log("Stopping the server...");
  execSync("docker compose down", { stdio: "inherit" });
}

function runCypressCI() {
  const {
    GITHUB_REPOSITORY,
    CYPRESS_OPTIONS, // eslint-disable-line no-unused-vars
  } = process.env;

  if (GITHUB_REPOSITORY === "getredash/redash") {
    process.env.CYPRESS_OPTIONS = "--record";
  }

  // Remove four lines below after it's merged
  delete process.env.CYPRESS_INSTALL_BINARY;
  execSync("rm -r node_modules", { stdio: "inherit" });
  execSync("yarn install", { stdio: "inherit" });

  execSync("yarn percy cypress run $CYPRESS_OPTIONS", { stdio: "inherit" });
}

const command = process.argv[2] || "all";

switch (command) {
  case "build":
    buildServer();
    break;
  case "start":
    startServer();
    break;
  case "run":
    execSync("cypress run", { stdio: "inherit" });
    break;
  case "open":
    execSync("cypress open", { stdio: "inherit" });
    break;
  case "run-ci":
    execSync("docker compose run server create_db", { stdio: "inherit" });
    runCypressCI();
    break;
  case "stop":
    stopServer();
    break;
  case "all":
    startServer();
    execSync("cypress run", { stdio: "inherit" });
    stopServer();
    break;
  default:
    console.log("Usage: yarn cypress [build|start|open|run|stop]");
    break;
}
