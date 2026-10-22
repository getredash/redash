// biome-ignore-all lint/suspicious/noConsole: CLI script that reports progress on the console
const { execSync } = require("child_process");
const { seedData } = require("./seed-data");
const fs = require("fs");

let cypressConfigBaseUrl;
try {
  const cypressConfig = JSON.parse(fs.readFileSync("cypress.json"));
  cypressConfigBaseUrl = cypressConfig.baseUrl;
} catch {}

const baseUrl = process.env.CYPRESS_baseUrl || cypressConfigBaseUrl || "http://localhost:5001";

// Minimal cookie jar: the seed requests share one session (setup, then login, then API calls)
const cookies = {};

async function request(method, route, { headers = {}, body } = {}) {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  const response = await fetch(baseUrl + route, { method, body, headers: { ...headers, cookie }, redirect: "manual" });
  for (const setCookie of response.headers.getSetCookie()) {
    const [pair] = setCookie.split(";");
    const separator = pair.indexOf("=");
    cookies[pair.slice(0, separator).trim()] = pair.slice(separator + 1);
  }
  return response;
}

async function seedDatabase(seedValues) {
  // Errors fail the command: tests shouldn't run against an unseeded server
  for (const { route, type, data } of seedValues) {
    await request("GET", "/login"); // refreshes the CSRF cookie
    const csrfToken = cookies.csrf_token;
    const response =
      type === "form"
        ? await request("POST", route, { body: new URLSearchParams({ ...data, csrf_token: csrfToken }) })
        : await request("POST", route, {
            headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
            body: JSON.stringify(data),
          });
    console.log("POST " + route + " - " + response.status);
    // Not `response.ok`: the setup and login forms respond with redirects
    if (response.status >= 400) {
      throw new Error("Seeding failed: POST " + route + " returned " + response.status);
    }
  }
}

function buildServer() {
  console.log("Building the server...");
  execSync("docker compose -p cypress build", { stdio: "inherit" });
}

function startServer() {
  console.log("Starting the server...");
  execSync("docker compose -p cypress up -d", { stdio: "inherit" });
  execSync("docker compose -p cypress run server create_db", { stdio: "inherit" });
}

function stopServer() {
  console.log("Stopping the server...");
  execSync("docker compose -p cypress down", { stdio: "inherit" });
}

function runCypressCI() {
  const { GITHUB_REPOSITORY } = process.env;

  if (GITHUB_REPOSITORY === "getredash/redash" && process.env.CYPRESS_RECORD_KEY) {
    process.env.CYPRESS_OPTIONS = "--record";
  }

  execSync(
    "COMMIT_INFO_MESSAGE=$(git show -s --format=%s) docker compose run --name cypress cypress ./node_modules/.bin/cypress run $CYPRESS_OPTIONS",
    { stdio: "inherit" }
  );
}

async function main(command) {
  switch (command) {
    case "build":
      buildServer();
      break;
    case "start":
      startServer();
      if (!process.argv.includes("--skip-db-seed")) {
        await seedDatabase(seedData);
      }
      break;
    case "db-seed":
      await seedDatabase(seedData);
      break;
    case "run":
      execSync("cypress run", { stdio: "inherit" });
      break;
    case "open":
      execSync("cypress open", { stdio: "inherit" });
      break;
    case "run-ci":
      runCypressCI();
      break;
    case "stop":
      stopServer();
      break;
    case "all":
      try {
        startServer();
        await seedDatabase(seedData);
        execSync("cypress run", { stdio: "inherit" });
      } finally {
        stopServer();
      }
      break;
    default:
      console.log("Usage: pnpm run cypress [build|start|db-seed|open|run|stop]");
      break;
  }
}

main(process.argv[2] || "all").catch((error) => {
  console.error(error);
  process.exit(1);
});
