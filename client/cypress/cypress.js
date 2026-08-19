/* eslint-disable import/no-extraneous-dependencies, no-console */
const axios = require("axios");
const { execSync } = require("child_process");
const fs = require("fs");
const { seedData } = require("./seed-data");

let cypressConfigBaseUrl;
try {
  const cypressConfig = JSON.parse(fs.readFileSync("cypress.json"));
  cypressConfigBaseUrl = cypressConfig.baseUrl;
} catch (e) {}

const baseUrl = process.env.CYPRESS_baseUrl || cypressConfigBaseUrl || "http://localhost:5001";

// Minimal cookie jar (avoids deprecated `request` / `request-cookies` packages).
function parseSetCookieHeader(setCookieHeaders) {
  const jar = {};
  if (!setCookieHeaders) return jar;
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const header of headers) {
    const [pair] = header.split(";");
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (name) jar[name] = value;
  }
  return jar;
}

function cookieJarToHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function buildFormBody(data) {
  return Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

async function seedDatabase(seedValues) {
  let cookieJar = {};
  try {
    const loginResp = await axios.get(`${baseUrl}/login`, {
      maxRedirects: 0,
      validateStatus: () => true,
    });
    cookieJar = parseSetCookieHeader(loginResp.headers["set-cookie"]);
  } catch (err) {
    console.log(`GET /login failed: ${err.message}`);
  }

  const csrfToken = cookieJar.csrf_token;

  for (const request of seedValues) {
    const isForm = request.type === "form";
    const headers = { Cookie: cookieJarToHeader(cookieJar) };

    let body;
    if (isForm) {
      const formData = csrfToken ? { ...request.data, csrf_token: csrfToken } : { ...request.data };
      body = buildFormBody(formData);
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    } else {
      body = request.data;
      headers["Content-Type"] = "application/json";
      if (csrfToken) headers["X-CSRFToken"] = csrfToken;
    }

    try {
      const response = await axios.post(`${baseUrl}${request.route}`, body, {
        headers,
        maxRedirects: 0,
        validateStatus: () => true,
      });
      console.log(`POST ${request.route} - ${response.status}`);
      const newCookies = parseSetCookieHeader(response.headers["set-cookie"]);
      cookieJar = { ...cookieJar, ...newCookies };
    } catch (err) {
      console.log(`POST ${request.route} - ${err.message}`);
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
  const {
    GITHUB_REPOSITORY,
    CYPRESS_OPTIONS, // eslint-disable-line no-unused-vars
  } = process.env;

  if (GITHUB_REPOSITORY === "getredash/redash" && process.env.CYPRESS_RECORD_KEY) {
    process.env.CYPRESS_OPTIONS = "--record";
  }

  execSync(
    "COMMIT_INFO_MESSAGE=$(git show -s --format=%s) docker compose run --name cypress cypress ./node_modules/.bin/percy exec -t 300 -- ./node_modules/.bin/cypress run $CYPRESS_OPTIONS",
    { stdio: "inherit" }
  );
}

const command = process.argv[2] || "all";

(async () => {
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
      startServer();
      await seedDatabase(seedData);
      execSync("cypress run", { stdio: "inherit" });
      stopServer();
      break;
    default:
      console.log("Usage: pnpm run cypress [build|start|db-seed|open|run|stop]");
      break;
  }
})();
