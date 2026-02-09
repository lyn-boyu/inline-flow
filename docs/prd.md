下面是一份**完整、正式、可执行的 PRD 文档（v1）**，基于我们所有已确认的决策整理而成。
这是一份**“可以交给工程团队 / Claude Code Agent 直接开工”的 PRD**，不是概念稿。

---

# PRD｜Inline Flow – Raycast Extension（v1）

---

## 1. 产品背景（Background）

在日常工作与学习中，用户频繁遇到以下问题：

* 想快速利用 LLM 处理**当前上下文**（查词、润色、解释、改写）
* 现有 AI 工具往往需要：

  * 切换 App / 浏览器
  * 复制粘贴
  * 重复输入 prompt
* 生成结果是**一次性的**，难以复盘、积累、复用

与此同时，高频用户（工程师、知识工作者）已经形成：

* 使用 Raycast 作为**全局入口**
* 使用 Markdown / 本地文件作为**长期知识资产**

Inline Flow 正是为了解决：

> **如何在不打断当前工作流的情况下，把“当前上下文”即时交给 LLM，并把结果沉淀为可复盘资产？**

---

## 2. 产品目标（Goals）

### 核心目标

* 通过 **Raycast 全局快捷键**
* 对当前上下文（selection / clipboard）
* 执行**可版本化的 Skill**
* 并**即时展示结果**

### 非目标（v1 不做）

* ❌ 不在 Raycast 中调用 LLM
* ❌ 不在 Raycast 中写文件
* ❌ 不在 Raycast 中管理 prompt / vault
* ❌ 不做云端服务

---

## 3. 产品定位（Positioning）

### 产品名称

**Inline Flow**

### 定位一句话

> Run versioned skills on your current context — inline.

### 架构定位

* **Raycast Extension**：入口 + 交互层
* **Local Host (Bun WebApp)**：能力 + 资产层

---

## 4. 用户画像（Target Users）

### 核心用户

* 工程师
* 英语学习者
* 知识工作者
* 高度依赖 Raycast 的 power user

### 使用特征

* 高频快捷键操作
* 强烈的上下文连续性需求
* 希望结果可复盘、可积累

---

## 5. 核心使用场景（Use Cases）

### 场景 1：查词与发音

* 选中一个英文单词
* 快捷键触发
* 即时获得发音、释义、示例

### 场景 2：语法改写

* 选中一句英文
* 快速改写为更自然的表达

### 场景 3：上下文缺失

* 某些 App 无法获取 selection
* 自动使用 clipboard 作为兜底输入

---

## 6. 核心设计原则（Principles）

1. **Inline First**

   * 不切换 App
   * 不破坏注意力流

2. **Host-Centric**

   * Raycast 不承载业务逻辑
   * 所有智能能力在本地 Host

3. **Skill as Contract**

   * Skill 是稳定接口
   * 可版本化、可替换

4. **Fast Path > Configurability**

   * 默认行为必须快
   * 高级配置延后

---

## 7. 功能范围（Scope）

### v1 包含

* 3 个固定命令（Run / Cycle / Picker）
* selection + clipboard 输入采集
* HTTP 调用本地 Host
* Markdown 结果展示
* Re-run（force）

### v1 不包含

* 动态技能注册
* Skill Marketplace
* Web UI 管理
* 云同步

---

## 8. 功能设计（Functional Requirements）

---

### 8.1 命令设计（Commands）

#### Command 1：Run Last Skill

**主执行命令**

* 快捷键：用户自定义
* 行为：

  1. 执行当前选中的 skill
  2. 若未选择任何 skill → fallback 到 Picker
* 成功后更新 lastSkill

---

#### Command 2：Cycle Skill

**切换 skill，不执行**

* 快捷键：用户自定义
* 行为：

  1. 在 skill 列表中循环切换
  2. Toast 显示当前 skill
  3. 不发起请求

---

#### Command 3：Run Skill (Picker)

**兜底入口**

* 展示 skill 列表（≤9）
* 选择即执行
* 更新 currentSkill + lastSkill

---

### 8.2 Skill 管理（Raycast 侧）

* Skill 列表为**静态数组**
* Skill 数量限制：≤9
* Skill 字段：

  * `skillId`
  * `displayName`

---

### 8.3 输入采集（Input）

* `selectionText`（优先）
* `clipboardText`（兜底）
* `frontmostApp`（尽可能提供）

> Raycast 不做输入校验，统一交由 Host 决策。

---

### 8.4 Host 调用（API）

#### Endpoint

```
POST {hostUrl}/api/run
```

#### Headers

```
Authorization: Bearer <API_KEY>
```

#### Request Body

```json
{
  "skillId": "vocab.pronunciation",
  "selectionText": "weasel",
  "clipboardText": "...",
  "frontmostApp": "Google Chrome",
  "force": false
}
```

---

### 8.5 结果展示（UI）

* 使用 Raycast `Detail` View
* 渲染完整 Markdown

#### Actions

* Re-run（force=true）
* Copy
* Open Host（可选）

---

## 9. 状态管理（State）

Raycast Extension 仅存储：

```ts
currentSkillIndex: number | null
lastSkillId: string | null
```

---

## 10. 错误处理（Error Handling）

| 场景           | 行为                |
| ------------ | ----------------- |
| Host URL 未配置 | Toast + 中断        |
| Host 不可达     | Toast             |
| 401          | Toast（API Key 错误） |
| 其他错误         | Toast + 状态码       |

---

## 11. 安全设计（Security）

* 仅访问 `127.0.0.1`
* 必须 API Key
* Raycast 不存储任何 LLM key
* 不读写用户文件

---

## 12. 非功能需求（NFR）

### 性能

* 请求超时：10s
* UI 不阻塞

### 可维护性

* 清晰模块划分
* Skill 列表集中管理

### 可演进性

* Host 可替换
* Skill 可扩展

---

## 13. 技术实现建议（Engineering Notes）

### 目录结构

```
src/
  commands/
  lib/
  types.ts
```

### 模块职责

* `input.ts`：selection / clipboard
* `host.ts`：HTTP client
* `state.ts`：local storage
* `skills.ts`：skill 列表

---

## 14. 验收标准（Acceptance Criteria）

* [ ] 3 个命令可用
* [ ] 快捷键可配置
* [ ] selection / clipboard 正常工作
* [ ] Host 成功返回结果并展示
* [ ] Re-run 生效
* [ ] 错误提示清晰

---

## 15. v2 展望（Out of Scope）

* 动态 skill 加载
* Slot 快捷键
* MCP Server
* Web UI
* 云同步

---

## 16. PRD 总结

Inline Flow v1 的目标不是“功能多”，而是：

> **极快、极稳、极少假设**

Raycast 只做一件事：
**让你在 flow 里，按一下，就发生。**

 