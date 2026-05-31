---
name: storyboard-video
description: Turn storyboard panels, shot lists, character references, and style references into timed video-generation prompts, then prepare or call SeedDance/Volcengine Ark video tasks with multi-reference images, audio toggles, polling, and output download. Use when the user wants storyboard-to-video planning, shot-timed prompts, cinematic prompt refinement, multi-reference image-to-video, or a repeatable video-generation workflow.
---

# Storyboard Video

Use this skill to convert a storyboard or rough scene idea into a timed video prompt and, when requested, submit it to SeedDance/Volcengine Ark.

## Core Workflow

1. Identify inputs:
   - Storyboard panels or shot descriptions.
   - Character reference images.
   - Creature/object reference images.
   - Scene/style reference images.
   - Target duration, ratio, resolution, and audio choice.
2. Map panels to time ranges before writing the prompt.
3. Write a single coherent video prompt with:
   - Reference image roles.
   - Overall art direction.
   - Panel-by-panel timing.
   - Camera language.
   - Physical action constraints.
   - Negative prompt.
4. If the user wants generation, prepare API config, submit the task, poll status, and download the result.

## Storyboard Prompt Pattern

Use this structure for cinematic video prompts:

```text
@Image1 is the <main character> reference: preserve <face, body, costume, identity>.
@Image2 is the <opponent/object> reference: preserve <shape, materials, anatomy, markings>.
@Image3 is the storyboard/scene reference: preserve <location, atmosphere, panel rhythm>.
@Image4 is the art direction reference: <style, rendering, lighting, material quality>.

Create a <duration>-second cinematic video. Overall visual style: <art direction>. The action should feel <physical/emotional qualities>. Avoid <major disallowed modes>.

Storyboard timing:
0.0-1.5s, panel 1, <shot size, camera angle, action, mood>.
1.5-3.0s, panel 2, <shot...>.
...

Camera language:
<camera moves, lens feel, editing rhythm, clarity constraints>.
```

For a 15-second nine-panel storyboard, use roughly 1.5-1.8 seconds per panel. If the action is complex, combine setup panels and give more time to contact, struggle, impact, and aftermath.

## Volcengine Ark SeedDance Notes

Use the verified Ark task endpoint:

```text
POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
GET  https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{task_id}
```

Verified video model IDs from model listing:

```text
doubao-seedance-2-0-260128
doubao-seedance-2-0-fast-260128
```

Use this request shape:

```json
{
  "model": "doubao-seedance-2-0-260128",
  "content": [
    { "type": "text", "text": "<prompt>" },
    {
      "type": "image_url",
      "image_url": { "url": "<https image url>" },
      "role": "reference_image"
    }
  ],
  "duration": 15,
  "ratio": "16:9",
  "resolution": "720p",
  "watermark": false,
  "generate_audio": false
}
```

Important:

- Ark requires `role: "reference_image"` for image contents.
- Prefer stable HTTPS URLs for reference images.
- If only local images exist, the bundled script can convert them to `data:image/...` URLs, but Ark may reject base64 for some flows.
- Never hardcode API keys in skill files. Use `.env`.

## Audio Choice

Always make audio explicit when generating:

- `--audio`: request generated audio.
- `--no-audio`: request silent video.
- If neither is set, use `SEEDDANCE_GENERATE_AUDIO` from `.env`.

## Bundled Script

Use `scripts/seedance-storyboard.mjs` for repeatable submission and polling. Create a working folder, copy the script there, and provide:

```text
.env
segments.json
```

Minimum `.env`:

```env
SEEDDANCE_API_KEY=
SEEDDANCE_CREATE_URL=https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
SEEDDANCE_STATUS_URL_TEMPLATE=https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{task_id}
SEEDDANCE_PROVIDER=volcengine
SEEDDANCE_MODEL=doubao-seedance-2-0-260128
REFERENCE_IMAGE_URLS=
REFERENCE_IMAGE_PATHS=
SEEDDANCE_DURATION=15
SEEDDANCE_ASPECT_RATIO=16:9
SEEDDANCE_RESOLUTION=720p
SEEDDANCE_GENERATE_AUDIO=false
```

Run:

```bash
node seedance-storyboard.mjs <segment-id> --dry-run
node seedance-storyboard.mjs <segment-id> --no-audio
node seedance-storyboard.mjs <segment-id> --audio
```

If polling crashes after task creation, do not resubmit. Query:

```bash
curl -sS https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/<task_id> \
  -H "Authorization: Bearer $SEEDDANCE_API_KEY"
```

## Output Rules

When returning results, include:

- Final prompt.
- Time-to-panel mapping.
- Settings.
- Task ID, status, seed, duration, ratio, resolution.
- Local downloaded video path if generated.

Keep secrets out of logs and final answers.
