// Small HTTP server used by the end-to-end tests: serves sample JSON/CSV for the URL based data sources and
// records every POST it receives, so tests can check that a webhook alert destination was really called.
//   GET    /data.json, /data.csv   sample rows
//   POST   /<anything>             recorded
//   GET    /requests               the recorded requests, oldest first
//   DELETE /requests               forget them
const http = require("http");

const ROWS = [
  { id: 1, city: "Tel Aviv", visitors: 120 },
  { id: 2, city: "Berlin", visitors: 340 },
  { id: 3, city: "Lisbon", visitors: 95 },
  { id: 4, city: "Tokyo", visitors: 510 },
  { id: 5, city: "Austin", visitors: 77 },
];
const received = [];

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "Content-Type": type, "Access-Control-Allow-Origin": "*" });
  res.end(body);
}

http
  .createServer((req, res) => {
    const path = req.url.split("?")[0];
    if (req.method === "GET" && path === "/data.json") {
      return send(res, 200, JSON.stringify(ROWS));
    }
    if (req.method === "GET" && path === "/data.csv") {
      const lines = ROWS.map((row) => `${row.id},${row.city},${row.visitors}`);
      return send(res, 200, ["id,city,visitors", ...lines].join("\n"), "text/csv");
    }
    if (path === "/requests") {
      if (req.method === "DELETE") {
        received.length = 0;
      }
      return send(res, 200, JSON.stringify(received));
    }
    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        received.push({ time: new Date().toISOString(), path: req.url, headers: req.headers, body });
        send(res, 200, "{}");
      });
      return undefined;
    }
    return send(res, 200, "ok", "text/plain");
  })
  .listen(Number(process.env.PORT || 8000), "0.0.0.0");
