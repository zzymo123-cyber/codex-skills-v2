---
name: vidu-image2-seedance
description: Use Vidu image generation as the default image2 provider for text-to-image, image editing, multi-reference image generation, and preparing source images for SeedDance video workflows. Use when the user asks for Vidu, image2, domestic image generation, Vidu-to-SeedDance, generate-image-then-video, or wants to avoid Codex's built-in image upload path by using a local API-backed workflow.
---

# Vidu Image2 + SeedDance

Use this skill when the user wants image generation or image preparation through Vidu, especially before SeedDance image-to-video.

Do not call the built-in `image_gen` tool unless the user explicitly asks for the Codex built-in image generator. Prefer the bundled Vidu script.

## Workflow

1. Decide the mode:
   - `text-to-image`: no reference image.
   - `reference-to-image`: one or more reference images.
   - `edit`: user wants an existing image changed.
   - `generate-image-then-video`: generate a source image, then pass it to SeedDance.
2. Shape the prompt like the built-in imagegen workflow:
   - Preserve the user's subject, style, composition, aspect ratio, and avoid list.
   - Add only practical details that improve generation quality.
   - For SeedDance source images, prefer a strong still frame with clear subject, readable action potential, and no unwanted text or watermark.
3. Run `scripts/vidu-image2.mjs generate`.
4. Poll until `success`, `failed`, or timeout.
5. Download the generated image into the workspace unless the user only wants the URL.
6. For SeedDance, use the downloaded image path or the Vidu result URL as the `reference_image` input, then continue with the SeedDance skill.

## Configuration

Keep secrets in `.env`, not in skill files.

```env
VIDU_API_KEY=
VIDU_IMAGE_CREATE_URL=https://api.vidu.cn/ent/v2/reference2image
VIDU_TASK_CREATIONS_URL_TEMPLATE=https://api.vidu.cn/ent/v2/tasks/{id}/creations
VIDU_IMAGE_MODEL=viduimage-2
VIDU_IMAGE_RESOLUTION=2K
VIDU_IMAGE_QUALITY=medium
VIDU_IMAGE_ASPECT_RATIO=16:9
VIDU_EXTRA_BODY_JSON={}
```

`VIDU_EXTRA_BODY_JSON` is a generic provider-specific passthrough for account-enabled or enterprise request fields. Leave it `{}` by default.

## Script Usage

Generate and poll:

```bash
node scripts/vidu-image2.mjs generate \
  --prompt "cinematic product hero shot, brushed titanium speaker on black glass" \
  --aspect-ratio 16:9 \
  --resolution 2K \
  --quality medium \
  --out-dir outputs/vidu
```

With reference images:

```bash
node scripts/vidu-image2.mjs generate \
  --prompt "preserve the character identity, create a cinematic keyframe in a rainy neon alley" \
  --image /absolute/path/ref1.png \
  --image https://example.com/ref2.jpg \
  --aspect-ratio 16:9 \
  --out-dir outputs/vidu
```

Poll an existing task:

```bash
node scripts/vidu-image2.mjs poll --task-id <task_id> --out-dir outputs/vidu
```

Dry-run without submitting:

```bash
node scripts/vidu-image2.mjs generate --prompt "..." --dry-run
```

## Vidu API Notes

Create image task:

```text
POST https://api.vidu.cn/ent/v2/reference2image
Authorization: Token {api_key}
Content-Type: application/json
```

Query creations:

```text
GET https://api.vidu.cn/ent/v2/tasks/{id}/creations
```

The query response returns `state` and `creations[].url`. Result URLs may expire, so download successful outputs promptly.

## Defaults

- Model: `viduimage-2`
- Aspect ratio: `16:9`
- Resolution: `2K`
- Quality: `medium`
- Poll interval: 5 seconds
- Timeout: 10 minutes

For expensive resolutions or high quality, summarize the settings before submission.

