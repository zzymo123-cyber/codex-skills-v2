---
name: seeddance-video
description: Optimize prompts for AI image generation, reverse-engineer prompts from user-provided images, generate or prepare source images, and call SeedDance 2.0 image-to-video or text-to-video APIs. Use when the user wants prompt refinement, image prompt reconstruction, image-to-prompt analysis, image creation, SeedDance 2.0 video generation, video task submission, status polling, or adapting a provider-specific SeedDance API contract.
---

# SeedDance Video

Use this skill to turn a rough creative idea or a user-provided reference image into a production-ready image prompt and a SeedDance 2.0 video generation request. Keep the implementation provider-neutral unless the user gives an exact API document, endpoint, SDK, or request schema.

## Workflow

1. Clarify the target only when required:
   - Source mode: text-to-video, image-to-video, or generate-image-then-video.
   - Output specs: aspect ratio, duration, resolution, camera motion, style, and whether audio is needed.
   - API contract: endpoint URLs, auth header format, model id, request fields, status endpoint, and success response shape.
2. If the user provides an image and asks for reverse prompting, analyze the image and reconstruct prompts before calling any generation API.
3. Optimize the prompt before calling any generation API.
4. Generate or collect the source image if the flow needs one.
5. Submit a SeedDance video task.
6. Poll task status until success, failure, timeout, or user-requested stop.
7. Return the final video URL/file, key request metadata, and any reproducibility settings.

## Prompt Optimization

Convert casual user input into a concise generation prompt with these fields when helpful:

- Subject: who or what is in frame.
- Action: what changes over time.
- Scene: location, era, props, weather, time of day.
- Visual style: cinematic, realistic, anime, product render, documentary, etc.
- Composition: shot size, lens, angle, framing, depth of field.
- Motion: camera move, subject movement, pacing, transition.
- Lighting and color: mood, contrast, palette, exposure.
- Constraints: no text, no watermark, no extra limbs, brand/product accuracy, safety constraints.

For image prompts, prioritize a strong still frame that can animate well. For video prompts, include temporal behavior and camera direction. Avoid stuffing the prompt with contradictory style terms.

Use this compact output pattern:

```text
Prompt:
<optimized prompt>

Negative prompt:
<quality and artifact exclusions, only if the provider supports it>

Settings:
aspect_ratio=<...>, duration=<...>, resolution=<...>, seed=<optional>
```

## Image-To-Prompt Reverse Engineering

When the user sends an image and asks to reverse, infer, or recreate its prompt, first inspect the image directly. If the image is referenced by local path and not already visible in context, load it with the available image viewing tool before writing prompts.

Analyze the image in this order:

- Main subject: identity, object type, count, pose, expression, clothing, materials.
- Scene: environment, background, props, weather, era, geography, time of day.
- Composition: aspect ratio, shot size, camera angle, lens feel, depth of field, framing, foreground/background layers.
- Lighting: key light direction, softness, contrast, exposure, reflections, shadows.
- Color and texture: palette, saturation, film grain, surface detail, rendering style.
- Style: photo, cinematic still, product render, anime, illustration, 3D, documentary, editorial, surreal, etc.
- Artifacts to avoid: unwanted text, watermark, distorted anatomy, low resolution, blur, compression, duplicated objects.
- Animation potential: likely subject motion, camera motion, atmosphere, and temporal changes for video.

Return two prompt variants by default:

```text
Image recreation prompt:
<prompt that recreates the still image as closely as possible>

SeedDance video prompt:
<prompt that keeps the image identity but adds motion, camera direction, and time-based detail>

Negative prompt:
<artifact exclusions, if supported>

Notes:
<uncertain details or assumptions from the image>
```

Do not claim exact hidden prompt recovery. Describe it as a high-fidelity inferred prompt based on visible image evidence. If the image contains a specific person, brand, artwork, or product, preserve visible attributes without inventing private identity or unavailable provenance.

## Image Generation

If the user asks Codex to generate the image directly, use the available image generation capability. If building an API-backed implementation, isolate the image provider behind a small adapter so it can be replaced later.

When preparing image-to-video:

- Prefer an absolute local file path or stable HTTPS URL for the input image.
- Preserve the prompt that produced the image.
- Record dimensions, aspect ratio, and seed if available.
- If the image is local and the SeedDance provider requires a URL, upload it using the user's chosen storage/CDN before submission.

## SeedDance 2.0 API Adapter

SeedDance 2.0 APIs differ by provider. Do not invent exact endpoints or field names. If the user has not provided the contract, create an adapter with clearly named placeholders and read `references/api-contract.md`.

Required adapter capabilities:

- `submitVideoTask(input)`: send text/image prompt, model id, media URL, duration, ratio, resolution, and extra provider fields.
- `getVideoTask(taskId)`: fetch task status and output URLs.
- `normalizeStatus(response)`: map provider-specific states to `queued`, `running`, `succeeded`, `failed`, or `canceled`.
- `extractVideoUrl(response)`: return the final video URL or file reference.

Recommended environment variables:

```text
SEEDDANCE_API_KEY=
SEEDDANCE_BASE_URL=
SEEDDANCE_MODEL=seeddance-2-0
SEEDDANCE_CREATE_PATH=
SEEDDANCE_STATUS_PATH=
SEEDDANCE_AUTH_HEADER=Authorization
SEEDDANCE_AUTH_SCHEME=Bearer
```

Never hardcode user API keys. Keep secrets in environment variables or local secret stores excluded from version control.

## Polling And Errors

Use bounded polling with a clear timeout:

- Initial delay: 2-5 seconds.
- Poll interval: 5-15 seconds unless provider guidance says otherwise.
- Timeout: 10-30 minutes depending on video length and provider SLA.
- On failure, show the provider error message, task id, and request id if available.
- On timeout, preserve the task id and tell the user how to resume polling.

## Implementation Notes

- Keep provider-specific schemas in a dedicated adapter file or reference, not scattered through UI code.
- Log request metadata, not secrets.
- Save optimized prompts and task ids for reproducibility.
- If the user provides official SeedDance docs, update `references/api-contract.md` with exact endpoints, request fields, response examples, and polling rules before coding.
- If the user asks for a full app, build the smallest usable system first: prompt optimizer, image source selector, submit button, status panel, and result preview.
