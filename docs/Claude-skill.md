我来为您获取 Anthropic 官方文档中关于 Agent Skills 的信息。# Claude Agent Skills 官方文档核心要点

根据 Anthropic 官方文档，我来为您总结 Agent Skills 的设计理念和关键特性。

## 核心定义

Agent Skills 是扩展 Claude 功能的模块化能力，每个 Skill 封装了指令、元数据和可选资源（脚本、模板），Claude 在相关时自动使用。

## 设计理念的三大核心

### 1. **渐进式披露（Progressive Disclosure）**

Skills 采用分层加载架构，而非一次性加载所有内容：

**三层加载机制：**

| 层级 | 加载时机 | Token 成本 | 内容 |
|------|---------|-----------|------|
| **Level 1: 元数据** | 始终加载（启动时） | ~100 tokens/Skill | YAML frontmatter 的 `name` 和 `description` |
| **Level 2: 指令** | 触发时加载 | <5k tokens | SKILL.md 主体内容 |
| **Level 3: 资源** | 按需加载 | 几乎无限 | 通过 bash 执行文件，不占用 context |

这意味着您可以安装很多 Skills，但只有实际使用时才会消耗 context。

### 2. **基于文件系统的架构**

Skills 不仅仅是提示词，而是虚拟机中的真实目录：

```
pdf-skill/
├── SKILL.md           # 主要指令
├── FORMS.md           # 表单填写指南
├── REFERENCE.md       # 详细 API 参考
└── scripts/
    └── fill_form.py   # 工具脚本
```

**工作原理：**
- Claude 通过 **bash 命令**读取 SKILL.md（就像在终端中执行 `cat SKILL.md`）
- 如果指令引用其他文件，Claude 按需读取
- 执行脚本时，**只有输出进入 context**，脚本代码本身不占用 tokens

### 3. **内容类型的分工**

| 内容类型 | 用途 | 特点 |
|---------|------|------|
| **指令（Instructions）** | 工作流程、最佳实践 | 灵活指导 |
| **代码（Code）** | 可执行脚本 | 确定性操作，不消耗 context |
| **资源（Resources）** | 数据库 schema、API 文档、模板 | 事实性查找 |

## 与传统 Prompt 的区别

| 特性 | Prompt | Skill |
|------|--------|-------|
| 作用域 | 单次对话 | 跨对话复用 |
| 加载方式 | 全部前置加载 | 按需渐进加载 |
| 内容形式 | 纯文本指令 | 指令 + 代码 + 资源 |
| Token 成本 | 每次对话都消耗 | 只在触发时消耗 |

## 适用产品

- **Claude API**: 支持预构建和自定义 Skills（需要 beta headers）
- **Claude Code**: 仅支持自定义 Skills（基于文件系统）
- **Agent SDK**: 通过 `.claude/skills/` 配置
- **Claude.ai**: 两者都支持（自定义 Skills 通过 zip 上传）

## 安全考虑

官方**强烈建议**只使用可信来源的 Skills，因为：
- Skills 可以执行代码和调用工具
- 恶意 Skills 可能导致数据泄露、未授权访问
- 从外部 URL 获取数据的 Skills 风险特别高

## 预构建 Skills

Anthropic 提供 4 个官方 Skills：
- **pptx**: PowerPoint 处理
- **xlsx**: Excel 处理  
- **docx**: Word 处理
- **pdf**: PDF 处理

## 关键限制

1. **不跨平台同步**：上传到 claude.ai 的 Skills 不会出现在 API 中
2. **共享范围**：claude.ai 仅限个人；API 是 workspace 级别
3. **运行时约束**：API 环境无网络访问，不能安装新包

## 实际意义

这种设计使 Skills 成为**可复用的领域专家知识包**，而不仅仅是重复的提示词。通过文件系统架构和渐进式加载，Skills 可以包含大量内容（文档、示例、工具）而不会造成 context 负担。