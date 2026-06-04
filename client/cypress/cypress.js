/* eslint-disable import/no-extraneous-dependencies, no-console */
const axios = require("axios");
const { execSync } = require("child_process");
const fs = require("fs");
const { seedData } = require("./seed-data");

let cypressConfigBaseUrl;
try {
  const cypressJson = fs.readFileSync("./client/cypress/cypress.json", "utf8");
  cypressConfigBaseUrl = JSON.parse(cypressJson).baseUrl;
} catch (e) {} // eslint-disable-line no-empty

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
  execSync("docker-compose build", { stdio: "inherit" });
}

function startServer() {
  const isCI = process.env.CI;
  const cmd = isCI ? "docker-compose up -d" : "docker-compose up";
  execSync(cmd, { stdio: "inherit" });
}

function stopServer() {
  execSync("docker-compose down", { stdio: "inherit" });
}

function runCypressCI() {
  const attempt = process.env.CYPRESS_ATTEMPT || 0;
  const cmd = `CI=true cypress run --config video=${attempt < 2},screenshotOnRunFailure=${attempt >= 2}`;

  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (err) {
    if (attempt < 2) {
      process.env.CYPRESS_ATTEMPT = parseInt(attempt) + 1;
      runCypressCI();
    } else {
      throw err;
    }
  }
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
