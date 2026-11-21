"use strict";

// Local-only helper for writing blurbs into public/games.csv.
// Usage: node blurb-editor.js, then open http://localhost:4173

const fs = require("fs");
const http = require("http");
const { execFileSync } = require("child_process");
const path = require("path");

const PORT = Number(process.env.PORT) || 4173;
const CSV_PATH = path.resolve(__dirname, "public/games.csv");
const PAGE_PATH = path.resolve(__dirname, "blurb-editor.html");
const INDEX_PATH = path.resolve(__dirname, "public/index.html");

// Same format rules as build-noscript.js: every field is quoted and literal
// quotes are stored as &quot;. Fields after focus_code are blurbs, one per author.
const parseRow = (line) => [...line.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
const toRow = (fields) => fields.map((f) => `"${f}"`).join(",");
const BLURB_START = 4;

// Commits only games.csv (other staged or unstaged work is left alone), then pushes.
const git = (...args) =>
  execFileSync("git", args, { cwd: __dirname, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const commitAndPush = (count) => {
  const message = `Add ${count} blurb${count === 1 ? "" : "s"}`;
  try {
    git("commit", "-m", message, "--", "public/games.csv");
  } catch (err) {
    return { committed: false, pushed: false, error: `git commit failed: ${(err.stderr || err.message).trim()}` };
  }
  try {
    git("push");
  } catch (err) {
    return { committed: true, pushed: false, message, error: `git push failed: ${(err.stderr || err.message).trim()}` };
  }
  return { committed: true, pushed: true, message };
};

const send = (res, status, type, body) => {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

// Applies [{ name, url, text }] to the CSV. Rows are matched by name + url and
// re-read from disk at save time, so edits made elsewhere are not clobbered.
const saveBlurbs = (blurbs) => {
  const lines = fs.readFileSync(CSV_PATH, "utf-8").split("\n");
  const pending = new Map(blurbs.map((b) => [`${b.name}\u0000${b.url}`, b.text]));
  const saved = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const fields = parseRow(lines[i]);
    const key = `${fields[0]}\u0000${fields[2]}`;
    if (!pending.has(key)) continue;

    // Never overwrite an existing blurb; only fill an empty first slot.
    if (fields.slice(BLURB_START).some(Boolean)) continue;

    while (fields.length < BLURB_START) fields.push("");
    fields[BLURB_START] = pending.get(key);
    lines[i] = toRow(fields);
    saved.push(fields[0]);
    pending.delete(key);
  }

  if (saved.length) fs.writeFileSync(CSV_PATH, lines.join("\n"));
  return { saved, skipped: [...pending.keys()].map((k) => k.split("\u0000")[0]) };
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
      return send(res, 200, "text/html; charset=utf-8", fs.readFileSync(PAGE_PATH));
    }
    if (req.method === "GET" && req.url === "/games.csv") {
      return send(res, 200, "text/csv; charset=utf-8", fs.readFileSync(CSV_PATH));
    }
    if (req.method === "GET" && req.url === "/blurb-authors.json") {
      const match = /<script type="application\/json" id="blurb-authors">([\s\S]*?)<\/script>/.exec(
        fs.readFileSync(INDEX_PATH, "utf-8")
      );
      return send(res, 200, "application/json", match ? match[1] : "[]");
    }
    if (req.method === "POST" && req.url === "/blurbs") {
      const blurbs = JSON.parse(await readBody(req));
      if (!Array.isArray(blurbs)) return send(res, 400, "text/plain", "Expected an array");
      const clean = blurbs
        .filter((b) => b && typeof b.name === "string" && typeof b.url === "string" && typeof b.text === "string")
        .map((b) => ({ ...b, text: b.text.trim().replaceAll('"', "&quot;").replace(/\s*\n\s*/g, " ") }))
        .filter((b) => b.text);
      const result = saveBlurbs(clean);
      console.log(`Saved ${result.saved.length} blurb(s)` + (result.skipped.length ? `, skipped ${result.skipped.length}` : ""));
      if (result.saved.length) {
        result.git = commitAndPush(result.saved.length);
        console.log(result.git.error || `Committed and pushed: ${result.git.message}`);
      }
      return send(res, 200, "application/json", JSON.stringify(result));
    }
    send(res, 404, "text/plain", "Not found");
  } catch (err) {
    console.error(err);
    send(res, 500, "text/plain", String(err.message || err));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Blurb editor running at http://localhost:${PORT}`);
});
