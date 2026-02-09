下面是一份**完整、可执行、可直接交给 Claude Code Agent 的 Raycast Extension 开发说明文档（v1）**。
这份文档是**最终整合版**，已经把我们前面所有决策**收敛、去歧义、定行为**，目标是：**一次性开发完成，不返工**。

---

# Inline Flow — Raycast Extension

**开发说明文档（v1 / Final）**

---

## 0. 文档定位（请先读）

* 本文档是 **工程开发说明**，不是 PRD
* 目标读者：**Claude Code Agent / 开发者**
* 本 Extension **不调用 LLM、不写文件、不做缓存**
* 所有智能能力都在 **本地 Bun Host WebApp**

---

## 1. 产品定位（What is Inline Flow）

**Inline Flow** 是一个 Raycast Extension，用于：

> 在不离开当前应用的情况下，通过快捷键
> 将“当前上下文（selection / clipboard）”
> 发送给本地 Host 执行 Skill，并即时展示结果。

### 核心原则

* **Inline**：不切 App，不切思路
* **Flow**：技能可循环、可复用、可积累
* **Raycast = 入口**
* **Host = 能力 + 资产**

---

## 2. 架构边界（非常重要）

### Raycast Extension 负责

* 获取输入（selection / clipboard）
* 管理 skill 的选择状态
* 调用本地 Host（HTTP）
* 展示 Host 返回的 Markdown
* 提供 Run / Cycle / Picker 交互

### Raycast Extension **不负责**

* ❌ 不调用 LLM
* ❌ 不管理 prompt
* ❌ 不缓存
* ❌ 不落盘
* ❌ 不解析 skill 文件
* ❌ 不持有任何 LLM API Key

---

## 3. 本地 Host 交互约定（不可违反）

* Host URL：`http://127.0.0.1:<port>`
* API：`POST /api/run`
* 鉴权：

  ```
  Authorization: Bearer <HOST_API_KEY>
  ```
* 超时建议：10s
* Host 不可用时 Extension 必须 **优雅失败**

---

## 4. 用户配置（Raycast Preferences）

### 必填字段

1. **Host URL**

   * 示例：`http://127.0.0.1:8787`
   * 为空时：

     * 不发请求
     * Toast 提示：`Host URL not configured`

2. **API Key**

   * Header：`Authorization: Bearer <key>`
   * 401 时提示用户检查

---

## 5. Skill 模型（Raycast 侧）

### 约束

* Skill 数量：**≤ 9**
* Raycast 内部维护一个 **静态 skill 列表**
* Skill 真实定义在 Host（md），Raycast 只认 `skillId`

### 示例（Raycast 侧）

```ts
const SKILLS = [
  { id: "vocab.pronunciation", name: "Vocab · Pronunciation" },
  { id: "grammar.rewrite", name: "Grammar · Rewrite" },
  { id: "sentence.polish", name: "Sentence · Polish" },
] as const;
```

---

## 6. 命令设计（v1 定稿）

### 固定命令（仅 3 个）

#### 1️⃣ Run Last Skill（主执行键）

**语义（最终定义）**：

> **Run Current Skill**
> 若无 current → fallback 到 Picker

##### 行为

1. 读取本地状态 `currentSkillIndex`
2. 若不存在：

   * 打开 `Run Skill (Picker)`
3. 若存在：

   * 采集输入
   * 调用 Host（`force=false`）
   * 展示结果
4. 成功后：

   * `lastSkillId = currentSkillId`

---

#### 2️⃣ Cycle Skill（切换键）

**语义**：只切换，不执行

##### 行为

1. `currentSkillIndex = (currentSkillIndex + 1) % skills.length`
2. Toast / HUD 提示：

   ```
   Selected: Grammar · Rewrite (2/3)
   ```
3. **不发请求**

---

#### 3️⃣ Run Skill (Picker)（兜底）

**语义**：明确选择 skill 并执行

##### 行为

1. 展示 skill 列表（≤9）
2. 标记当前 skill（✓）
3. 用户选择后：

   * 更新 `currentSkillIndex`
   * 更新 `lastSkillId`
   * 执行该 skill（`force=false`）

---

## 7. 输入采集规范（非常关键）

### 输入来源

* `selectionText`（优先）
* `clipboardText`（兜底）

### Extension 行为

* **始终采集二者**
* 不做任何校验或决策
* 全部交给 Host 判断

### Request 示例

```json
{
  "skillId": "vocab.pronunciation",
  "selectionText": "weasel",
  "clipboardText": "weasel\nnoun\n...",
  "frontmostApp": "Google Chrome",
  "force": false
}
```

> ⚠️ 即使 selection 为空，也必须继续请求

---

## 8. Host 调用协议（Raycast 必须严格遵守）

### Endpoint

```
POST {hostUrl}/api/run
```

### Headers

```
Authorization: Bearer <apiKey>
Content-Type: application/json
```

### Response（成功）

```json
{
  "ok": true,
  "cached": true,
  "finalPath": "records/vocab-pronunciation/2026-02-08_01-02-33__weasel.md",
  "content": "---\n...\n---\n\n## Result\n..."
}
```

* `content`：**完整 Markdown，直接渲染**
* `cached`：仅用于 UI 提示（可选）

---

## 9. UI 展示规范

### View

* 使用 `Detail` View
* `markdown = response.content`

### Actions（必须）

* **Re-run**

  * 再次调用 `/api/run`
  * `force=true`
* **Copy**

  * 复制 `content`
* （可选）Open Host（打开 hostUrl）

---

## 10. 状态管理（LocalStorage）

Raycast Extension 仅保存：

```ts
currentSkillIndex: number | null
lastSkillId: string | null
```

❌ 不保存：

* LLM key
* prompt
* vault 信息
* 执行结果

---

## 11. 错误处理规范（必须）

| 场景         | 行为                                  |
| ---------- | ----------------------------------- |
| hostUrl 为空 | toast + return                      |
| 网络失败       | toast: Host not reachable           |
| 401        | toast: Unauthorized – check API key |
| 其他错误       | toast: Error + status               |

---

## 12. 项目结构建议（Agent 必须输出）

```
src/
  commands/
    run-last-skill.tsx
    cycle-skill.tsx
    run-skill-picker.tsx
  lib/
    host.ts        // HTTP client
    input.ts       // selection / clipboard / app
    skills.ts      // static skill list
    state.ts       // storage helpers
  types.ts
package.json
```

---

## 13. Definition of Done（验收标准）

* [ ] 三个命令在 Raycast 可见
* [ ] 能配置 hostUrl + apiKey
* [ ] Run / Cycle / Picker 行为正确
* [ ] selection 为空但 clipboard 有值时仍可运行
* [ ] Re-run 生效（force=true）
* [ ] Host 不可用 / 401 有清晰提示
* [ ] 不调用任何 LLM
* [ ] 不写任何文件

---

## 14. 给 Claude Code Agent 的一句话指令（可直接复制）

> 请实现一个 Raycast Extension，名称为 **Inline Flow**，严格遵循以下规则：
>
> * Extension 仅作为输入与展示层
> * 所有智能能力通过 HTTP 调用本地 Host
> * 提供 Run Last Skill / Cycle Skill / Run Skill Picker 三个命令
> * 支持 selection + clipboard 输入
> * 不调用 LLM、不写文件、不做缓存

 
