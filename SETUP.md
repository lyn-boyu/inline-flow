# Inline Flow - 快速设置指南

本文档提供 Inline Flow 系统的快速设置步骤。

## 前置要求

- macOS with Raycast installed
- Bun >= 1.0
- Node.js >= 20
- OpenAI API Key (必需)
- Anthropic API Key (可选)

## 设置步骤

### 1. 配置 Bun Host

```bash
# 进入 Host 目录
cd packages/host

# 创建环境变量文件
cp .env.example .env

# 编辑 .env 文件，填入以下配置
nano .env
```

必需的环境变量：

```env
VAULT_DIR=~/Documents/InlineFlow
HOST_API_KEY=your-secret-key-here  # 自己生成一个随机字符串
PORT=8787
OPENAI_API_KEY=your-openai-key-here  # 从 OpenAI 获取
ANTHROPIC_API_KEY=your-anthropic-key-here  # 可选
```

```bash
# 启动 Host
bun run start

# 你应该看到：
# 🚀 Inline Flow Host running on http://127.0.0.1:8787
```

### 2. 加载 Raycast Extension

```bash
# 进入 Extension 目录
cd packages/raycast-extension

# 安装依赖
npm install
```

在 Raycast 中：
1. 打开 Raycast → Extensions → + → Add Extension
2. 选择 `packages/raycast-extension` 目录
3. Extension 自动加载

### 3. 配置 Raycast Extension

在 Raycast 中：
1. 搜索 `Inline Flow`
2. 右键任意命令 → Configure Extension
3. 填写配置：
   - Host URL: `http://127.0.0.1:8787`
   - API Key: 你在 `.env` 中设置的 `HOST_API_KEY`

### 4. 验证安装

测试基本功能：

1. 在任意应用中选中单词 "hello"
2. 打开 Raycast → Run Skill (Picker)
3. 选择 "Vocab · Pronunciation"
4. 查看结果

如果看到发音和释义，说明设置成功！

## 推荐快捷键

- **Run Last Skill**: `⌘⇧L`
- **Cycle Skill**: `⌘⇧K`
- **Run Skill (Picker)**: `⌘⇧P`

## 故障排查

### Host 无法启动

```bash
# 检查 Bun 版本
bun --version  # 应该 >= 1.0

# 检查端口是否被占用
lsof -i :8787

# 查看详细错误
bun run start
```

### Extension 无法加载

```bash
# 检查依赖
cd packages/raycast-extension
npm install

# 检查配置
cat package.json  # 确认 name, commands 等字段

# 重新加载
# 在 Raycast Extensions 中右键 Inline Flow → Reload
```

### "Host not reachable"

1. 确认 Host 正在运行
2. 检查 URL: `http://127.0.0.1:8787`
3. 测试连接：`curl http://127.0.0.1:8787/health`

### "Unauthorized"

1. 确认 `.env` 中的 `HOST_API_KEY`
2. 确认 Raycast 配置中的 API Key 相同
3. 重启 Host 以加载新环境变量

## 下一步

查看完整文档：
- [README.md](./readme.md) - 项目概览
- [Raycast Integration Guide](./docs/raycast-integration-guide.md) - 详细集成步骤
- [PRD](./docs/prd.md) - 产品需求文档
