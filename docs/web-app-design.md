好，这是一个**可以直接交给 Claude Code Agent 开发 Bun Host WebApp 的产品说明文档（v1）**。
我会用**工程可执行文档**的标准来写，而不是市场 PRD。

---

# Inline Flow — Bun Host WebApp 产品说明文档（v1）

## 1. 产品定位（Role & Responsibility）

**名称**：Inline Flow Host
**类型**：本地 Bun.js WebApp（HTTP Service + 可选 Web UI）

### 核心角色

Inline Flow Host 是 **Inline Flow 体系的能力中枢与资产层**，负责：

* Skill 解析与模板渲染
* LLM / MCP 调用
* 缓存命中与复用
* Markdown 结果生成
* 本地文件系统落盘（Vault）
* 为 Raycast Extension 提供稳定、简洁的 HTTP API

> Host 是“系统大脑”，
> Raycast 只是“触发器和显示器”。

---

## 2. Host 的边界（明确不做什么）

### Host **做**

* 解析 `skills/*.md`
* 执行 Skill（LLM / MCP）
* 管理缓存（cacheKey）
* 写 Markdown 文件
* 返回完整 Markdown 内容

### Host **不做**

* ❌ 不采集 selection / clipboard（Raycast 负责）
* ❌ 不做快捷键
* ❌ 不依赖 Raycast 运行
* ❌ 不强制提供 Web UI（v1 可选）

---

## 3. 运行环境

### 技术栈

* **Runtime**：Bun
* **协议**：HTTP (JSON)
* **监听地址**：`127.0.0.1:<PORT>`
* **数据存储**：本地文件系统（Markdown + JSON）

### 环境变量

```env
VAULT_DIR=~/Documents/InlineFlow
HOST_API_KEY=xxxxxx

# LLM keys（由 skill 引用）
OPENAI_API_KEY=xxxx
ANTHROPIC_API_KEY=xxxx
```

---

## 4. Vault 目录结构（v1 定稿）

```text
InlineFlow/
  records/
    vocab-pronunciation/
      2026-02-08_01-02-33__weasel.md
      2026-02-08_01-02-33__weasel__2.md
    grammar-rewrite/
      ...
  skills/
    vocab-pronunciation.md
    grammar-rewrite.md
  _cache/
    index.json
```

---

## 5. Skill 文件规范（Host 视角）

### Skill 文件路径

```text
skills/<skillId-dot-to-dash>.md
```

### Skill Markdown 示例

```md
---
id: vocab.pronunciation
name: Vocab · Pronunciation
version: 0.1.0
tags: [vocab, pronunciation, english]

inputs:
  selectionText:
    required: true
  clipboardText:
    optional: true
    allowAsPrimary: true

llm:
  provider: openai
  model: gpt-4.1-mini
  temperature: 0.2

secrets:
  apiKeyEnv: OPENAI_API_KEY
---

# System
You are a precise English tutor.

# User
Input:
{{selectionText}}

Clipboard:
{{clipboardText}}

App:
{{frontmostApp}}
```

---

## 6. 输入决策逻辑（Host 核心规则）

```text
if selectionText exists:
  primaryInput = selectionText
else if clipboardText exists and allowAsPrimary != false:
  primaryInput = clipboardText
else:
  return 400 ("This skill requires selected text")
```

* `primaryInput`：

  * 用于模板中的 `{{selectionText}}`
  * 用于 cacheKey 计算
* clipboardText：

  * 作为补充上下文注入
  * **不参与 cacheKey**

---

## 7. 缓存机制（Cache）

### Cache Key 定义（已锁定）

```text
cacheKey =
  sha256(
    skillId
    + "@"
    + skillVersion
    + "\n"
    + normalize(primaryInput)
  )
```

### normalize 规则

* trim
* 压缩空格
* **不改大小写**

### Cache Index 文件

`_cache/index.json`

```json
{
  "sha256:xxxx": {
    "recordPath": "records/vocab-pronunciation/2026-02-08_01-02-33__weasel.md",
    "skillId": "vocab.pronunciation",
    "skillVersion": "0.1.0",
    "updatedAt": "2026-02-08_01-02-33"
  }
}
```

### Cache 行为

* `force=false` 且命中 → 直接返回旧内容
* `force=true` → 重新执行，生成新文件（`__2`），并更新 index

---

## 8. Record 文件生成规范

### 文件路径

```text
records/<skill-folder>/<timestamp>__<slug>.md
```

### slug 规则

* 全小写
* 来源于 primaryInput
* 空格 → `-`
* 最大长度：40

### Record frontmatter（Host 生成）

```md
---
createdAt: 2026-02-08_01-02-33
skillId: vocab.pronunciation
skillVersion: 0.1.0
tags: [vocab, pronunciation, english]
source:
  frontmostApp: "Google Chrome"
input:
  selectionText: "weasel"
cachedFrom: ""
---
```

---

## 9. HTTP API（Raycast / 其它客户端）

### `POST /api/run`

#### Headers

```http
Authorization: Bearer <HOST_API_KEY>
Content-Type: application/json
```

#### Request

```json
{
  "skillId": "vocab.pronunciation",
  "selectionText": "weasel",
  "clipboardText": "weasel\nnoun\n...",
  "frontmostApp": "Google Chrome",
  "force": false
}
```

#### Response（统一返回）

```json
{
  "ok": true,
  "cached": true,
  "finalPath": "records/vocab-pronunciation/2026-02-08_01-02-33__weasel.md",
  "content": "---\n...\n---\n\n## Result\n..."
}
```

#### Error Codes

* `400`：输入不满足 skill 约束
* `401`：API Key 不对
* `503`：LLM / MCP 不可用
* `500`：未知错误

---

## 10. 安全与约束

* 仅监听 `127.0.0.1`
* 必须携带 API Key
* 禁止路径穿越（`..` / 绝对路径）
* 所有写入限定在 `VAULT_DIR`

---

## 11. v1 不做但已预留的扩展点

* MCP Server 调用
* 多 Provider 路由
* Web UI（浏览 / 搜索 / 复盘）
* SQLite / 向量索引
* Skill Marketplace

---

## 12. 给 Claude Code Agent 的开发指令（可直接用）

> 请实现一个本地 Bun.js WebApp，严格遵循以下约束：
>
> * 提供 `/api/run`
> * 使用 Skill Markdown + frontmatter
> * 支持缓存复用
> * 写 Markdown 文件到本地 Vault
> * 不依赖 Raycast
> * 不实现快捷键或 UI
 