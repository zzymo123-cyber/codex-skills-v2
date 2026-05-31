# SeedDance API Contract Reference

Use this file when adapting the skill to a concrete SeedDance 2.0 provider. Replace placeholders with the user's actual API documentation.

## Information To Collect

- Provider name:
- Base URL:
- Auth method:
- Create task endpoint:
- Query task endpoint:
- Model id:
- Supported modes: text-to-video, image-to-video, generate-image-then-video
- Input image requirement: URL, multipart upload, base64, or provider asset id
- Supported duration values:
- Supported aspect ratios:
- Supported resolutions:
- Negative prompt support:
- Seed support:
- Callback/webhook support:
- Rate limits:
- Typical success latency:

## Create Task Shape

```json
{
  "model": "seeddance-2-0",
  "prompt": "<optimized video prompt>",
  "negative_prompt": "<optional>",
  "image_url": "<optional source image URL>",
  "duration": 5,
  "aspect_ratio": "16:9",
  "resolution": "1080p",
  "seed": 12345
}
```

Map this example to the provider's real field names. Remove unsupported fields instead of sending unknown parameters.

## Status Shape

Normalize provider responses into:

```json
{
  "taskId": "<provider task id>",
  "status": "queued | running | succeeded | failed | canceled",
  "progress": 0,
  "videoUrl": "<available on success>",
  "error": "<available on failure>",
  "raw": {}
}
```

## Adapter Checklist

- Submit task returns a stable task id.
- Status polling handles queued/running/success/failure states.
- Success extraction returns the downloadable or previewable video URL.
- Errors include provider error code/message and task id.
- Secrets are read from environment variables, never source files.
- Request and response examples are captured after the first successful call.

