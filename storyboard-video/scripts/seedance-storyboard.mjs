import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const provider = process.env.SEEDDANCE_PROVIDER || "fal";
const dryRun = process.argv.includes("--dry-run");
const generateAudio = audioChoice();
const referenceImageUrls = resolveReferenceImages();
const segments = JSON.parse(fs.readFileSync(new URL("./segments.json", import.meta.url), "utf8"));
const segmentId = process.argv.slice(2).find((arg) => !arg.startsWith("--")) || segments[0].id;
const segment = segments.find((item) => item.id === segmentId);

if (!segment) {
  throw new Error(`Unknown segment '${segmentId}'. Available: ${segments.map((item) => item.id).join(", ")}`);
}

if (referenceImageUrls.some((url) => !/^(https?:\/\/|data:image\/)/.test(url))) {
  throw new Error("References must be public HTTP(S) URLs or image data URLs. Use REFERENCE_IMAGE_PATHS for local files.");
}

const negativePrompt = [
  "cartoon style",
  "cute tiger",
  "monster tiger",
  "fantasy armor",
  "modern clothes",
  "modern buildings",
  "weak action",
  "unclear fight choreography",
  "bad tiger anatomy",
  "deformed human anatomy",
  "extra limbs",
  "extra fingers",
  "distorted hands",
  "inconsistent face",
  "inconsistent costume",
  "inconsistent tiger stripes",
  "floating objects",
  "messy camera",
  "excessive blur",
  "low quality",
  "watermark",
  "logo",
  "readable text"
].join(", ");

const body = buildRequestBody(provider, {
  prompt: `${segment.prompt}\n\nNegative prompt: ${negativePrompt}`,
  referenceImageUrls
});

console.log(`Submitting SeedDance segment: ${segment.id} - ${segment.title}`);
console.log(`Provider shape: ${provider}`);
console.log(`Reference images: ${referenceImageUrls.length}`);
console.log(`Generate audio: ${generateAudio}`);

if (dryRun) {
  console.log("Dry run request body:");
  console.log(JSON.stringify(summarizeForLog(body), null, 2));
  process.exit(0);
}

const createUrl = required("SEEDDANCE_CREATE_URL");
const apiKey = required("SEEDDANCE_API_KEY");
const createResponse = await requestJson(createUrl, {
  method: "POST",
  headers: authHeaders(),
  body: JSON.stringify(body)
});

console.log("Create response:");
console.log(JSON.stringify(redact(createResponse), null, 2));

const taskId = getFirstPath(createResponse, [
  process.env.SEEDDANCE_TASK_ID_PATH,
  "id",
  "task_id",
  "data.id",
  "data.task_id",
  "result.id",
  "result.task_id"
]);
if (!taskId) {
  console.log("No task id found. Set SEEDDANCE_TASK_ID_PATH to match the provider response.");
  process.exit(0);
}

const statusTemplate = process.env.SEEDDANCE_STATUS_URL_TEMPLATE;
if (!statusTemplate) {
  console.log(`Task id: ${taskId}`);
  console.log("No status URL configured. Set SEEDDANCE_STATUS_URL_TEMPLATE to poll this task.");
  process.exit(0);
}

const statusUrl = statusTemplate.replace("{task_id}", encodeURIComponent(taskId));
const finalResponse = await pollStatus(statusUrl, taskId);
console.log("Final response:");
console.log(JSON.stringify(redact(finalResponse), null, 2));

const videoUrl = getFirstPath(finalResponse, [
  process.env.SEEDDANCE_VIDEO_URL_PATH,
  "content.video_url",
  "content.0.video_url",
  "data.content.video_url",
  "data.video_url",
  "video.url",
  "result.video_url"
]) || findFirstKey(finalResponse, ["video_url", "videoUrl"]);
if (videoUrl) {
  console.log(`Video URL: ${videoUrl}`);
}

function buildRequestBody(kind, input) {
  const common = {
    prompt: input.prompt,
    duration: Number(process.env.SEEDDANCE_DURATION || 5),
    aspect_ratio: process.env.SEEDDANCE_ASPECT_RATIO || "16:9",
    resolution: process.env.SEEDDANCE_RESOLUTION || "720p"
  };

  if (kind === "vicsee" || kind === "renderful") {
    return {
      model: process.env.SEEDDANCE_MODEL || "seedance-2.0",
      input: {
        prompt: common.prompt,
        reference_image_urls: input.referenceImageUrls,
        duration: common.duration,
        aspect_ratio: common.aspect_ratio,
        resolution: common.resolution,
        audio: generateAudio
      }
    };
  }

  if (kind === "fal") {
    return {
      prompt: common.prompt,
      image_urls: input.referenceImageUrls,
      duration: String(common.duration),
      aspect_ratio: common.aspect_ratio,
      resolution: common.resolution,
      generate_audio: generateAudio
    };
  }

  if (kind === "volcengine" || kind === "ark") {
    const content = [
      { type: "text", text: common.prompt },
      ...input.referenceImageUrls.map((url) => ({
        type: "image_url",
        image_url: { url },
        role: process.env.SEEDDANCE_IMAGE_ROLE || "reference_image"
      }))
    ];

    return stripUndefined({
      model: process.env.SEEDDANCE_MODEL || "doubao-seedance-2-0-pro-260215",
      content,
      duration: common.duration,
      ratio: common.aspect_ratio,
      resolution: common.resolution,
      watermark: bool(process.env.SEEDDANCE_WATERMARK),
      generate_audio: generateAudio
    });
  }

  return {
    model: process.env.SEEDDANCE_MODEL || "seedance-2.0",
    prompt: common.prompt,
    reference_image_urls: input.referenceImageUrls,
    duration: common.duration,
    aspect_ratio: common.aspect_ratio,
    resolution: common.resolution,
    generate_audio: generateAudio
  };
}

async function pollStatus(url, taskId) {
  const statusPath = process.env.SEEDDANCE_STATUS_PATH || "status";
  const videoPath = process.env.SEEDDANCE_VIDEO_URL_PATH || "video.url";
  const errorPath = process.env.SEEDDANCE_ERROR_PATH || "error.message";
  const deadline = Date.now() + 20 * 60 * 1000;

  while (Date.now() < deadline) {
    await sleep(8000);
    const response = await requestJson(url, { method: "GET", headers: authHeaders(false) });
    const status = String(getPath(response, statusPath) || findFirstKey(response, ["status"]) || "").toLowerCase();
    const videoUrl = getPath(response, videoPath) || findFirstKey(response, ["video_url", "videoUrl"]);
    const error = getPath(response, errorPath) || findFirstKey(response, ["error", "message"]);
    console.log(`[${new Date().toISOString()}] task=${taskId} status=${status || "unknown"}`);

    if (videoUrl || ["succeeded", "success", "completed", "complete"].includes(status)) return response;
    if (error || ["failed", "error", "canceled", "cancelled"].includes(status)) return response;
  }

  throw new Error(`Timed out polling task ${taskId}`);
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}\n${JSON.stringify(redact(data), null, 2)}`);
  }
  return data;
}

function authHeaders(hasBody = true) {
  const headerName = process.env.SEEDDANCE_AUTH_HEADER || "Authorization";
  const scheme = process.env.SEEDDANCE_AUTH_SCHEME || "Bearer";
  const value = scheme ? `${scheme} ${apiKey}` : apiKey;
  return {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    [headerName]: value
  };
}

function getPath(value, dottedPath) {
  if (!dottedPath) return undefined;
  return dottedPath.split(".").reduce((current, key) => {
    if (current == null) return undefined;
    if (/^\d+$/.test(key)) return current[Number(key)];
    return current[key];
  }, value);
}

function getFirstPath(value, paths) {
  for (const item of paths.filter(Boolean)) {
    const result = getPath(value, item);
    if (result != null && result !== "") return result;
  }
  return undefined;
}

function findFirstKey(value, keys) {
  if (value == null || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findFirstKey(item, keys);
      if (result != null && result !== "") return result;
    }
    return undefined;
  }
  for (const [key, child] of Object.entries(value)) {
    if (keys.includes(key) && child != null && child !== "") return child;
    const result = findFirstKey(child, keys);
    if (result != null && result !== "") return result;
  }
  return undefined;
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env and fill it.`);
  return value;
}

function csv(name) {
  return (process.env[name] || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function resolveReferenceImages() {
  const urls = csv("REFERENCE_IMAGE_URLS");
  const dataUrls = csv("REFERENCE_IMAGE_PATHS").map((filePath) => fileToDataUrl(filePath));
  return [...urls, ...dataUrls];
}

function fileToDataUrl(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  const mime = mimeType(resolved);
  const data = fs.readFileSync(resolved).toString("base64");
  return `data:${mime};base64,${data}`;
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".bmp") return "image/bmp";
  if (ext === ".tif" || ext === ".tiff") return "image/tiff";
  return "image/png";
}

function bool(value) {
  return String(value || "false").toLowerCase() === "true";
}

function audioChoice() {
  if (process.argv.includes("--audio")) return true;
  if (process.argv.includes("--no-audio")) return false;
  return bool(process.env.SEEDDANCE_GENERATE_AUDIO);
}

function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redact(value) {
  const json = JSON.stringify(value);
  if (!apiKey) return value;
  return JSON.parse(json.replaceAll(apiKey, "***REDACTED***"));
}

function summarizeForLog(value) {
  if (typeof value === "string" && value.startsWith("data:image/")) {
    return `${value.slice(0, 48)}...<${value.length} chars>`;
  }
  if (Array.isArray(value)) return value.map((item) => summarizeForLog(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, summarizeForLog(item)]));
  }
  return value;
}
