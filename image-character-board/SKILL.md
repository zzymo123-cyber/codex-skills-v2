---
name: image-character-board
description: Generate high-fidelity cinematic character concept boards and art-direction proposal sheets from structured character details or loose ideas. Use when the user asks for a character sheet, character design board, movie/game character proposal board, full-body turnarounds, head studies, costume/accessory breakdowns, creature companion/opponent design, or a polished image prompt for these assets.
---

# Image Character Board

Use this skill to create one polished image-generation prompt for a cinematic character concept board. The goal is an art-director-level proposal board, not a plain mechanical turnaround sheet.

## Workflow

1. Extract or ask only for missing essentials: character name, age, height, body type, style direction, personality keywords, appearance, costume, props, and story environment.
2. If the user provides a world, IP-inspired style, opponent, mount, pet, weapon, or creature, include it as supporting design material on the same board.
3. Build a single image prompt with:
   - main hero pose
   - full-body multi-angle turnarounds
   - head studies
   - cinematic mood portrait
   - costume/accessory/material breakdowns
   - sparse professional annotation marks
4. Emphasize consistency across all views: same face, hair, body proportions, costume layers, materials, and color palette.
5. Generate the image with the available image generation tool unless the user only wants the prompt.

## Prompt Template

Copy and fill this structure. Keep placeholders only when the user explicitly wants a template.

```text
Create a high-fidelity horizontal large-format cinematic character concept board.

Character name: <name>
Age: <age>
Height: <height>
Body type: <body type>
Style direction: <cinematic stylized realism / semi-realistic / animated film / Eastern character design / etc.>
Personality keywords: <3-5 keywords>
Appearance: <face shape, eyes, hairstyle, skin tone, memorable features>
Costume design: <top, bottom, outer layer, shoes, accessories, props, weapons>
Scene identity: <environment, profession, social role, story world>

Board structure:
1. One main hero full-body character standing pose.
2. A full-body multi-angle turnaround set: front, 3/4 front, side, back, 3/4 back.
3. A head study set: front, 3/4, side, looking down, looking up, dynamic expression angle.
4. One cinematic mood portrait.
5. Costume, accessory, prop, and material breakdown callouts.
6. Sparse professional annotations: character name, height scale, material notes, personality keywords.

Layout requirements:
Horizontal large canvas, not a rigid grid, not mechanically symmetrical. Art-directed asymmetric composition, neutral gray or light gray proposal-board background, natural collage-like arrangement, clear hierarchy, premium film or animation development board feeling.

Rendering requirements:
The character should feel like a real performer captured by a movie camera, not a posed model. Keep facial features, body proportions, hairstyle, costume, and materials strictly consistent across every angle. Make skin, fabric, metal, leather, hair, and props tactile and realistic. The whole image should have cinematic presence, character storytelling, high consistency, and professional concept-art polish.

Avoid:
plain mannequin sheet, low-detail sketch, inconsistent face, inconsistent costume, unreadable clutter, excessive text, logo, watermark, messy typography, duplicated limbs, distorted hands.
```

## Creature Or Opponent Add-On

When the user asks for a character plus creature, enemy, mount, or companion, add:

```text
Also include a supporting creature/opponent design area with head close-up, side proportion view, claws/teeth or key anatomy details, action silhouette, and material texture samples. Keep it secondary to the main character but integrated into the same art-directed board.
```

## Style Guidance

- For historical or mythic subjects, include period costume logic, weathering, tools, and material culture.
- For game characters, use readable silhouettes, combat practicality, material callouts, and cinematic key-art lighting.
- For animation film characters, soften realism, strengthen shape language, and keep expressions readable.
- Keep text minimal because image models often struggle with exact typography. Ask for labels only as small annotation marks unless the user needs readable text.

