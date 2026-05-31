---
name: story-to-script
description: "故事文本转短剧剧本。输入故事/小说/案例文本 → 自动改编为多集短剧剧本（中国影视剧本传统格式）。优先支持世情类（家庭伦理/职场博弈/社会底层/都市情感/市井烟火）和悬疑类（推理探案/心理悬疑/犯罪惊悚/诡计解谜）。流程：类型检测 → 分支分析 → 分集大纲 → 类型强度审稿 → 试写校准 → 剧本生成 → script doctor 审稿 → 质量门。触发：故事转剧本、短剧改编、小说转短剧、剧本创作等请求。"
---

# Story to Script — 故事文本转短剧剧本

将故事文本改编为符合短剧消费习惯的多集短剧剧本（中国影视剧本传统格式）。本 skill 是文档型 workflow，不引入 API、CLI 或工程化运行器。

## 适用范围

- **优先类型**：世情、悬疑
- **输入来源**：小说、故事、大纲、梗概、真实案例叙述
- **默认规格**：竖屏 9:16；每集 2-3 分钟；万字故事通常拆 12-20 集
- **输出格式**：Markdown 中国影视剧本传统格式

## 核心原则

1. **原文保真**：角色、时间线、结局、支线不随意改。
2. **文学叙述转视听语言**：剧本只写观众看到什么、听到什么。
3. **信息差保护**：观众和角色的知情顺序不得被无意改变。
4. **因果链保护**：情绪、对白、闪回、VO、反转都必须有前置触发。
5. **类型强度保护**：悬疑要防证据过度便利和对峙直解释；世情要防只吵架、反击无铺垫无代价。
6. **爽点只能强化，不能凭空创造**：可放大原文已有爽点，不新造改变剧情性质的爽点。

## 调度入口

按 [workflow.md](workflow.md) 执行完整流程，并在对应阶段调用 agents：

1. [agents/type-detector.md](agents/type-detector.md)：判断类型、子类型、副类型、导语区域和输入完整度。
2. 世情走 [agents/worldly-drama-analyst.md](agents/worldly-drama-analyst.md)。
3. 悬疑走 [agents/suspense-analyst.md](agents/suspense-analyst.md)。
4. [agents/outline-writer.md](agents/outline-writer.md)：生成分集大纲。
5. [agents/quality-gate.md](agents/quality-gate.md)：在类型、分析、大纲、类型强度、单集、全剧阶段验收；类型强度审稿不通过时不得进入试写。
6. [agents/script-writer.md](agents/script-writer.md)：生成试写集和单集剧本。
7. 悬疑稿生成后走 [agents/suspense-script-doctor.md](agents/suspense-script-doctor.md)，审泄底、线索便利、工具人说明、对峙解释和阻力不足。
8. 世情稿生成后走 [agents/worldly-script-doctor.md](agents/worldly-script-doctor.md)，审关系压迫、情绪断点、施压者、爽点铺垫、概念化对白和结尾代价。

旧版细则保留为附录，供对应 agent 引用：

- [step1-type-detection.md](step1-type-detection.md)
- [step2-story-analysis.md](step2-story-analysis.md)
- [step3-outline.md](step3-outline.md)
- [step4-script-writing.md](step4-script-writing.md)

## 输出约定

默认输出到当前工作区的 `outputs/{故事名}/`。只有用户明确指定路径时，才使用用户给定路径。

```
outputs/
└── {故事名}/
    ├── characters.md
    ├── appearance.md
    ├── locations.md
    ├── overview.md
    └── script/
        ├── ep01.md
        ├── ep02.md
        └── ...
```

故事名取原文标题或用户指定名称；无标题时取核心人物名或核心案件名。

辅助文档模板：

- [assets/characters.md](assets/characters.md)
- [assets/appearance.md](assets/appearance.md)
- [assets/locations.md](assets/locations.md)
- [assets/overview.md](assets/overview.md)

## 用户确认点

- 类型检测后：确认主类型、子类型、副类型、导语区域和输入完整度判断。
- 分支分析后：确认事件清单、信息差/线索台账、关键断点。
- 分集大纲和类型强度审稿后：按 3-5 集一段确认，不通过强度审稿不进入试写。
- 试写第 1 集 + 中后段关键集后：确认语气、节奏、格式和信息投放策略，再批量生成。
- Script doctor 审稿后：先重写问题集，再做全剧一致性质量门。

## 强制注意

- 禁止按字数机械均分集数。
- 每集必须有戏剧任务和结尾钩子；可不用冷开场，但前 15 秒必须抓人。
- 每集动笔前必须做事件链验证。
- 所有有名角色首次入画必须加人物字幕条。
- 短信、微信、截图、文字记录不再一律改电话：默认优先电话以增强声音和情绪；但文字材料承担证据、误会、延迟阅读、传播等剧情功能时，必须保留为屏幕文字或道具。
- 悬疑必须防证据过度便利、线索太完整、对峙直解释、结尾像结案说明。
- 世情必须防只吵架、施压者工具化、觉醒/反击无铺垫、反击无代价。
