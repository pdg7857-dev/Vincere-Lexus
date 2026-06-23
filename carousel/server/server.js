/* Carousel server — static host + authenticated Anthropic proxy.
 *
 * Lets the carousel run "through your subscription" instead of asking each
 * visitor for an API key: the credential lives here on the host, and the
 * browser calls /api/messages (no key) which this proxy forwards to Anthropic
 * with the right auth header.
 *
 * Credentials (checked in this order, from the environment):
 *   ANTHROPIC_API_KEY    -> sent as x-api-key            (Anthropic API key)
 *   ANTHROPIC_AUTH_TOKEN -> sent as Authorization: Bearer + the oauth beta
 *                           header (a Claude Pro/Max *subscription* token, e.g.
 *                           `export ANTHROPIC_AUTH_TOKEN=$(ant auth \
 *                              print-credentials --access-token)`)
 *
 * Zero dependencies — Node's built-in http/https only.
 *
 *   node carousel/server/server.js        # then open http://localhost:8088
 *
 * Note: this proxy is a thin pass-through intended for local / trusted use.
 * Anyone who can reach it can spend the host credential, so don't expose it on
 * an untrusted network without adding your own auth in front.
 */
"use strict";

var http = require("http");
var https = require("https");
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, ".."); // carousel/
var PORT = parseInt(process.env.PORT, 10) || 8088;
var MAX_TOKENS_CAP = 4096;

function credentials() {
  var key = (process.env.ANTHROPIC_API_KEY || "").trim();
  var oauth = (process.env.ANTHROPIC_AUTH_TOKEN || "").trim();
  if (key) {
    return {
      mode: "api",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    };
  }
  if (oauth) {
    return {
      mode: "subscription",
      headers: {
        authorization: "Bearer " + oauth,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "oauth-2025-04-20",
      },
    };
  }
  return null;
}

var MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(res, status, obj) {
  var body = JSON.stringify(obj);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(body);
}

// Forward a Messages API request to Anthropic with the host credential.
function proxyMessages(req, res) {
  var cred = credentials();
  if (!cred) {
    return sendJson(res, 503, {
      error: {
        message:
          "Server has no Anthropic credential. Set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN and restart.",
      },
    });
  }

  var chunks = [];
  var size = 0;
  req.on("data", function (c) {
    size += c.length;
    if (size > 1e6) {
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on("end", function () {
    var body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch (e) {
      return sendJson(res, 400, { error: { message: "Invalid JSON body." } });
    }
    // light guardrails on a host-credentialed endpoint
    if (typeof body.max_tokens === "number")
      body.max_tokens = Math.min(body.max_tokens, MAX_TOKENS_CAP);
    var payload = Buffer.from(JSON.stringify(body), "utf8");

    var headers = Object.assign(
      { "content-type": "application/json", "content-length": payload.length },
      cred.headers
    );

    var upstream = https.request(
      {
        method: "POST",
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        headers: headers,
      },
      function (up) {
        res.writeHead(up.statusCode || 502, {
          "content-type": up.headers["content-type"] || "application/json",
        });
        up.pipe(res);
      }
    );
    upstream.on("error", function (err) {
      sendJson(res, 502, { error: { message: "Upstream error: " + err.message } });
    });
    upstream.end(payload);
  });
}

function serveStatic(req, res) {
  var urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  // confine to ROOT
  var filePath = path.normalize(path.join(ROOT, urlPath));
  if (filePath.indexOf(ROOT) !== 0) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("Not found");
    }
    var ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

var server = http.createServer(function (req, res) {
  var urlPath = (req.url || "/").split("?")[0];
  if (urlPath === "/api/health") {
    var cred = credentials();
    return sendJson(res, 200, { server: true, auth: cred ? cred.mode : "none" });
  }
  if (urlPath === "/api/messages") {
    if (req.method !== "POST") {
      res.writeHead(405);
      return res.end("Method Not Allowed");
    }
    return proxyMessages(req, res);
  }
  serveStatic(req, res);
});

server.listen(PORT, function () {
  var cred = credentials();
  var auth = cred ? cred.mode : "none (set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN)";
  console.log("Carousel running at http://localhost:" + PORT);
  console.log("Anthropic auth: " + auth);
});
