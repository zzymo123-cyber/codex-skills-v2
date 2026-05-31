#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(startDir = process.cwd()) {
  const candidates = [
    path.join(startDir, ".env"),
    path.join(path.dirname(startDir), ".env"),
    path.join(__dirname, "..", ".env"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      args._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (key === "dry-run" || key === "no-download") {
      args[key] = true;
      continue;
    }
    const value = argv[i + 1];
    if (value == null || value.startsWith("--")) {
      args[key] = true;
      continue;
    }
    i += 1;
    if (key === "image") {
      args.image = args.image || [];
      args.image.push(value);
    } else {
      args[key] = value;
    }
  }
  return args;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function contentTypeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function imageToInput(value) {
  if (/^https?:\/\//i.test(value) || /^data:image\//i.test(value)) return value;
  const abs = path.resolve(value);
  const bytes = fs.readFileSync(abs);
  return `data:${contentTypeFor(abs)};base64,${bytes.toString("base64")}`;
}

function parseJsonEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${name} must be a JSON object`);
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid ${name}: ${error.message}`);
  }
}

function redactRequest(body) {
  return JSON.stringify(body, null, 2).replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, "[data-image-redacted]");
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response ${response.status}: ${text.slice(0, 500)}`);
    }
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function createTask(args) {
  const createUrl = process.env.VIDU_IMAGE_CREATE_URL || "https://api.vidu.cn/ent/v2/reference2image";
  const prompt = args.prompt;
  if (!prompt) throw new Error("Missing --prompt");

  const extra = parseJsonEnv("VIDU_EXTRA_BODY_JSON", {});
  const body = {
    model: args.model || process.env.VIDU_IMAGE_MODEL || "viduimage-2",
    images: (args.image || []).map(imageToInput),
    prompt,
    aspect_ratio: args["aspect-ratio"] || process.env.VIDU_IMAGE_ASPECT_RATIO || "16:9",
    resolution: args.resolution || process.env.VIDU_IMAGE_RESOLUTION || "2K",
    payload: args.payload || "",
    ...extra,
  };
  const quality = args.quality || process.env.VIDU_IMAGE_QUALITY;
  if (quality) body.quality = quality;
  if (args.seed) body.seed = Number(args.seed);
  if (args["callback-url"]) body.callback_url = args["callback-url"];

  if (args["dry-run"]) {
    console.log(redactRequest(body));
    return null;
  }

  const token = requireEnv("VIDU_API_KEY");
  const json = await fetchJson(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  console.log(JSON.stringify({ event: "created", response: json }, null, 2));
  return json.task_id || json.id;
}

async function pollTask(taskId, args) {
  const token = requireEnv("VIDU_API_KEY");
  const template = process.env.VIDU_TASK_CREATIONS_URL_TEMPLATE || "https://api.vidu.cn/ent/v2/tasks/{id}/creations";
  const url = template.replace("{id}", encodeURIComponent(taskId));
  const intervalMs = Number(args["poll-interval-ms"] || process.env.VIDU_POLL_INTERVAL_MS || 5000);
  const timeoutMs = Number(args["timeout-ms"] || process.env.VIDU_TIMEOUT_MS || 600000);
  const started = Date.now();

  while (true) {
    const json = await fetchJson(url, {
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    });
    const state = json.state || json.status;
    console.log(JSON.stringify({ event: "poll", task_id: taskId, state, credits: json.credits, err_code: json.err_code || "" }));
    if (state === "success" || state === "failed") return json;
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Timed out polling task ${taskId} after ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

async function downloadCreations(result, outDir) {
  const creations = result.creations || [];
  fs.mkdirSync(outDir, { recursive: true });
  const saved = [];
  for (let i = 0; i < creations.length; i += 1) {
    const creation = creations[i];
    const url = creation.url || creation.watermarked_url || creation.cover_url;
    if (!url) continue;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed ${response.status}: ${url}`);
    const contentType = response.headers.get("content-type") || "";
    const ext = contentType.includes("png") ? ".png" : contentType.includes("webp") ? ".webp" : ".jpg";
    const file = path.join(outDir, `${result.id || "vidu"}-${creation.id || i}${ext}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(file, buffer);
    saved.push({ url, file });
  }
  return saved;
}

async function main() {
  loadEnv();
  const [command = "help", ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (command === "help" || command === "--help") {
    console.log(`Usage:
  vidu-image2.mjs generate --prompt "..." [--image path-or-url] [--aspect-ratio 16:9] [--resolution 2K] [--quality medium] [--out-dir outputs/vidu]
  vidu-image2.mjs poll --task-id <id> [--out-dir outputs/vidu]
`);
    return;
  }

  if (command === "generate") {
    const taskId = await createTask(args);
    if (!taskId || args["dry-run"]) return;
    const result = await pollTask(taskId, args);
    if (result.state !== "success") {
      console.log(JSON.stringify({ event: "finished", result }, null, 2));
      process.exitCode = 2;
      return;
    }
    if (!args["no-download"]) {
      const saved = await downloadCreations(result, args["out-dir"] || "outputs/vidu");
      console.log(JSON.stringify({ event: "downloaded", saved }, null, 2));
    } else {
      console.log(JSON.stringify({ event: "success", result }, null, 2));
    }
    return;
  }

  if (command === "poll") {
    const taskId = args["task-id"];
    if (!taskId) throw new Error("Missing --task-id");
    const result = await pollTask(taskId, args);
    if (result.state === "success" && !args["no-download"]) {
      const saved = await downloadCreations(result, args["out-dir"] || "outputs/vidu");
      console.log(JSON.stringify({ event: "downloaded", saved }, null, 2));
    } else {
      console.log(JSON.stringify({ event: "finished", result }, null, 2));
    }
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
