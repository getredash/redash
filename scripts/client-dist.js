#!/usr/bin/env node
/**
 * Used by yarn clean / yarn build to avoid opaque failures:
 * - Docker Compose anonymous volume on client/dist often leaves root-owned files on the host.
 * - A sparse or damaged checkout may be missing client/app; webpack then fails with many "Module not found" lines.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "client", "dist");
const cmd = process.argv[2];

function checkSources() {
  const required = [
    ["client/app/index.js", "main application entry"],
    ["client/app/index.html", "HtmlWebpackPlugin template"],
    ["client/app/multi_org.html", "multi-org HtmlWebpackPlugin template"],
  ];
  for (const [rel, why] of required) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) {
      console.error(`Missing ${rel} (${why}). Restore the frontend tree from git, e.g.:\n  git restore client/\n`);
      process.exit(1);
    }
  }
}

function cleanDist() {
  try {
    fs.rmSync(dist, { recursive: true, force: true });
  } catch (e) {
    if (e && (e.code === "EACCES" || e.code === "EPERM")) {
      console.error(
        `Cannot remove ${dist}: permission denied.\n` +
          "If Docker Compose created it (anonymous volume on client/dist), fix ownership or remove as admin, e.g.:\n" +
          '  sudo chown -R "$(whoami)" client/dist\n' +
          "  # or\n" +
          "  sudo rm -rf client/dist\n"
      );
      process.exit(1);
    }
    if (e && e.code !== "ENOENT") {
      throw e;
    }
  }
}

if (cmd === "check") {
  checkSources();
} else if (cmd === "clean") {
  cleanDist();
} else {
  console.error("Usage: node scripts/client-dist.js check|clean");
  process.exit(2);
}
