# Raycast Extension 集成操作指南

本文档提供 Inline Flow Raycast Extension 的完整集成步骤。

## 开发模式加载

### 1. 安装依赖

```bash
cd packages/raycast-extension
npm install
```

### 2. 在 Raycast 中加载开发版

1. 打开 Raycast
2. 搜索并运行命令：`Extensions`
3. 点击右上角的 `+` 按钮
4. 选择 `Add Extension`
5. 浏览并选择 `packages/raycast-extension` 目录
6. Raycast 将自动加载 Extension

## 配置 Extension

### 设置 Host URL 和 API Key

1. 打开 Raycast
2. 搜索 `Inline Flow`
3. 点击任意命令右侧的 `⌘ ,` 或右键选择 `Configure Extension`
4. 填写配置：
   - **Host URL**: `http://127.0.0.1:8787`
   - **API Key**: 你在 Host `.env` 文件中设置的 `HOST_API_KEY`
5. 保存配置

## 设置快捷键

为了高效使用，建议为三个命令设置全局快捷键：

1. 打开 Raycast Settings → Extensions → Inline Flow
2. 为每个命令设置快捷键：
   - **Run Last Skill**: 建议 `⌘⇧L` (Command + Shift + L)
   - **Cycle Skill**: 建议 `⌘⇧K` (Command + Shift + K)
   - **Run Skill (Picker)**: 建议 `⌘⇧P` (Command + Shift + P)

## 验证加载

完成上述步骤后，验证 Extension 是否正确加载：

### ✅ 检查清单

- [ ] Extension 在 Raycast Extensions 列表中显示
- [ ] 三个命令均可在 Raycast 搜索中找到：
  - Run Last Skill
  - Cycle Skill
  - Run Skill (Picker)
- [ ] 命令可以正常执行（不报错）
- [ ] 配置页面可以正常打开和保存
- [ ] 快捷键已设置并可正常触发

## 使用流程

### 首次使用

1. **选择技能**：
   - 运行 `Run Skill (Picker)` 或按 `⌘⇧P`
   - 从列表中选择一个技能（如 "Vocab · Pronunciation"）

2. **执行技能**：
   - 在任意应用中选中文本
   - 按 `⌘⇧L` 执行当前技能
   - 查看结果

### 日常使用

1. **切换技能**: 按 `⌘⇧K` 循环切换技能
2. **执行技能**: 按 `⌘⇧L` 执行当前技能
3. **查看结果**: 在结果页面可以：
   - Re-run (Force): 强制重新执行，生成新结果
   - Copy Content: 复制内容到剪贴板

## 故障排查

### 问题：Extension 无法加载

**解决方案**：
- 检查 `package.json` 配置是否正确
- 运行 `npm run build` 检查编译错误
- 查看 Raycast 开发者日志：按 `⌘⇧D` 打开开发工具
- 确保所有依赖已正确安装：`npm install`

### 问题：命令不显示

**解决方案**：
- 检查 `package.json` 中的 `commands` 配置
- 重新加载 Extension：
  1. 在 Raycast Extensions 中找到 Inline Flow
  2. 右键选择 `Reload Extension`
- 确认命令文件存在于 `src/commands/` 目录

### 问题：配置无法保存

**解决方案**：
- 检查 `preferences` 配置是否正确
- 验证字段类型（textfield, password）是否匹配
- 重启 Raycast

### 问题：Host not reachable

**解决方案**：
- 确认 Bun Host 正在运行：
  ```bash
  cd packages/host
  bun run start
  ```
- 检查 Host URL 是否正确：`http://127.0.0.1:8787`
- 确认端口 8787 未被占用
- 检查防火墙设置

### 问题：Unauthorized – check API key

**解决方案**：
- 确认 Host `.env` 文件中的 `HOST_API_KEY` 与 Raycast 配置中的一致
- 重新启动 Host 以加载新的环境变量
- 在 Raycast 中重新输入 API Key

### 问题：This skill requires selected text

**解决方案**：
- 确保在执行命令前选中了文本
- 如果某些应用无法获取选中文本，尝试：
  1. 先复制文本到剪贴板
  2. 再执行技能（会使用剪贴板内容）

## 发布到 Raycast Store（可选）

如果希望将 Extension 发布到 Raycast 官方商店：

```bash
# 1. 确保所有配置正确
cd packages/raycast-extension

# 2. 构建 Extension
npm run build

# 3. 提交到 Raycast Store
npm run publish
```

发布前请确保：
- 所有功能正常工作
- 代码符合 Raycast 规范（运行 `npm run lint`）
- 提供清晰的描述和图标
- 遵循 Raycast Extension Guidelines

## 开发技巧

### 查看日志

按 `⌘⇧D` 打开 Raycast 开发工具，可以：
- 查看 console.log 输出
- 查看错误堆栈
- 实时调试 Extension

### 热重载

在开发模式下，修改代码后：
- Raycast 会自动重新加载 Extension
- 无需手动重启

### 调试技巧

在代码中添加 `console.log()` 输出：

```typescript
console.log('Current skill index:', currentIndex);
console.log('Input:', { selectionText, clipboardText });
```

然后在开发工具中查看输出。

## 相关文档

- [Raycast Extension API](https://developers.raycast.com/api-reference)
- [Raycast Extension Guidelines](https://developers.raycast.com/basics/guidelines)
- [Inline Flow PRD](./prd.md)
- [Bun Host Design](./web-app-design.md)
