import { createServer } from "node:http";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { analyzeWithOpenAI } from "./src/openaiCoach.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const envFile = join(root, ".env.local");
const publicDir = join(root, "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};

function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  if (!value) return "";
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  return value;
}

async function loadLocalEnv() {
  try {
    const body = await readFile(envFile, "utf8");
    for (const line of body.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = parseEnvValue(trimmed.slice(index + 1));
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // First run: local AI config has not been created yet.
  }
}

function apiConfig() {
  const browserConfigEnabled = process.env.CLOUD_DEPLOY !== "true";
  return {
    hasApiKey: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    networkUrls: networkUrls(),
    browserConfigEnabled,
  };
}

async function saveApiConfig(input = {}) {
  if (process.env.CLOUD_DEPLOY === "true") {
    return { ok: false, code: "cloud_config_locked", message: "云端版不能在网页里修改接口密钥，请在云平台环境变量中设置。" };
  }

  const enteredApiKey = String(input.apiKey || "").trim();
  const apiKey = enteredApiKey || process.env.OPENAI_API_KEY || "";
  const model = String(input.model || "gpt-4.1-mini").trim() || "gpt-4.1-mini";

  if (!apiKey) {
    return { ok: false, code: "missing_api_key", message: "还没有保存接口密钥。请先粘贴完整密钥并保存。" };
  }

  if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(apiKey)) {
    return { ok: false, code: "invalid_api_key", message: "接口密钥格式看起来不对。请粘贴从 OpenAI 平台创建的完整密钥，通常以 sk- 开头。" };
  }

  const body = [
    "# Local-only OpenAI settings. Do not share this file.",
    `OPENAI_API_KEY=${JSON.stringify(apiKey)}`,
    `OPENAI_MODEL=${JSON.stringify(model)}`,
    "",
  ].join("\n");

  await writeFile(envFile, body, { mode: 0o600 });
  await chmod(envFile, 0o600).catch(() => {});
  process.env.OPENAI_API_KEY = apiKey;
  process.env.OPENAI_MODEL = model;

  return { ok: true, ...apiConfig() };
}

function networkUrls() {
  const urls = [];
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === "IPv4" && !address.internal) {
        urls.push(`http://${address.address}:${port}`);
      }
    }
  }
  return urls;
}

function json(res, statusCode, data) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("请求内容不是有效 JSON。");
    error.statusCode = 400;
    throw error;
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

await loadLocalEnv();

const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "0.0.0.0";

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/config") {
      json(res, 200, apiConfig());
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/config/openai") {
      const result = await saveApiConfig(await readBody(req));
      json(res, result.ok ? 200 : 400, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/analyze-ai") {
      const result = await analyzeWithOpenAI(await readBody(req));
      json(res, result.ok ? 200 : 400, result);
      return;
    }

    if (req.method === "GET") {
      await serveStatic(req, res);
      return;
    }

    json(res, 405, { ok: false, message: "Method not allowed" });
  } catch (error) {
    json(res, error.statusCode || 500, {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, host, () => {
  console.log(`德州扑克 GTO 教练运行中：http://localhost:${port}`);
  for (const url of networkUrls()) console.log(`同 Wi-Fi 手机访问：${url}`);
});
