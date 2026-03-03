# AI Tool Update Checker (aiuc)

> 跨平台 AI CLI 工具自动更新检查器 — 安装即用，开机自动检查，发现更新弹通知

## 功能特点

- **零配置**：`npm i -g` 一条命令安装，自动注册开机启动
- **跨平台**：Windows / macOS / Linux 全支持
- **自动检测**：只检查你实际安装过的工具，未安装的自动跳过
- **双模式运行**：开机后台守护 + 手动交互式更新
- **系统原生通知**：Windows Toast / macOS Notification Center / Linux notify-send
- **定时巡检**：长时间不重启的机器每 12 小时静默检查一次

## 支持的 AI 工具

| 工具 | 包名 | 类型 |
|------|------|------|
| Claude Code | `@anthropic-ai/claude-code` | npm |
| OpenAI Codex | `@openai/codex` | npm |
| OpenCode | `opencode-ai` | npm |
| GitHub Copilot CLI | `@githubnext/github-copilot-cli` | npm |
| Aider | `aider-chat` | pip |

## 安装

```bash
npm install -g ai-tool-updater
```

安装完成后自动：
1. 注册开机自启（守护进程）
2. 创建配置文件 `~/.ai-tool-updater/config.json`

## 使用

### 交互式更新（最常用）

```bash
aiuc
```

输出示例：

```
  AI Tool Update Checker
  ─────────────────────────────

  工具                    当前版本        最新版本        状态
  ────────────────────────────────────────────────────────────
  Claude Code           2.1.39        2.1.58        有可用更新
  OpenAI Codex          0.104.0       0.105.0       有可用更新
  OpenCode              1.1.19        1.2.14        有可用更新

  发现 3 个可用更新

  是否全部更新? [Y/n]
```

### 仅检查（不更新）

```bash
aiuc --check
```

### 查看状态

```bash
aiuc --status
```

```
  AI Tool Updater 状态
  ─────────────────────────
  开机自启:   已启用
  检查间隔:   12 小时
  上次检查:   2026/2/26 08:56:26 (5 分钟前)
```

### 所有命令

```
aiuc                     交互模式 - 检查并更新工具
aiuc --check     / -c    仅检查更新（无交互提示）
aiuc --daemon    / -d    启动后台守护进程
aiuc --enable-autostart  启用开机自启
aiuc --disable-autostart 禁用开机自启
aiuc --status    / -s    显示当前状态
aiuc --version   / -v    显示版本号
aiuc --help      / -h    显示帮助
```

## 工作原理

```
开机 / 定时触发
  │
  ├─ 读取配置（上次检查时间）
  ├─ 距上次 > 12小时？
  │    ├─ 是 → 检测已安装工具 → 比对版本 → 有更新？
  │    │         └─ 是 → 发送系统通知 "运行 aiuc 来更新"
  │    └─ 否 → 静默等待
  │
  └─ setInterval 12h 后再次检查
```

### 守护进程

开机后自动启动 `aiuc --daemon`，在后台持续运行：
- **Windows**：写入注册表 `HKCU\...\Run`
- **macOS**：创建 `~/Library/LaunchAgents/ai-tool-updater.plist`
- **Linux**：创建 `~/.config/autostart/ai-tool-updater.desktop`

### 版本检测方式

| 类型 | 当前版本 | 最新版本 |
|------|---------|---------|
| npm | `claude --version` | `npm view @anthropic-ai/claude-code version` |
| pip | `aider --version` | `pip index versions aider-chat` |

## 配置

配置文件：`~/.ai-tool-updater/config.json`

```json
{
  "lastCheckTime": 1740000000000,
  "checkIntervalHours": 12,
  "autoStartEnabled": true
}
```

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `lastCheckTime` | 上次检查时间戳 (ms) | `0` |
| `checkIntervalHours` | 检查间隔 (小时) | `12` |
| `autoStartEnabled` | 自启开关 | `true` |

日志文件：`~/.ai-tool-updater/debug.log`

## 项目结构

```
src/
├── tools.ts         工具注册表 — 定义所有支持的 AI 工具
├── utils.ts         底层工具 — 命令执行、日志、版本提取
├── config.ts        配置管理 — 读写 ~/.ai-tool-updater/config.json
├── checker.ts       核心逻辑 — 检测安装、获取版本、semver 比对
├── notifier.ts      通知封装 — node-notifier 跨平台通知
├── autostart.ts     自启管理 — auto-launch 注册/注销
├── daemon.ts        守护进程 — 后台定时检查 + 通知
├── interactive.ts   交互 CLI — 表格展示 + 用户确认 + 执行更新
├── index.ts         CLI 入口 — 命令行参数解析与分发
└── postinstall.ts   安装脚本 — npm install 后自动配置
```

> 如需更深入的源码说明，可在仓库 Wiki / 文档中补充维护。

## 添加新工具

编辑 `src/tools.ts`，在 `TOOLS` 数组中追加：

```typescript
{
  name: '你的工具名',
  command: 'tool-cli-command',
  versionArgs: ['--version'],
  versionRegex: /(\d+\.\d+\.\d+)/,
  packageName: 'npm-package-name',
  packageManager: 'npm',  // 或 'pip'
  updateCommand: ['npm', 'install', '-g', 'npm-package-name@latest'],
},
```

不需要修改其他任何文件。

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 本地测试
node dist/index.js --check
node dist/index.js --help

# 本地全局安装测试
npm install -g .
aiuc --check
```

## 发布到 npm

项目包含 GitHub Actions CI（`.github/workflows/ci.yml`）：

1. 在 GitHub 创建仓库并推送代码
2. 在仓库 Settings → Secrets → Actions 中添加 `NPM_TOKEN`
3. 发布：

```bash
npm version patch   # 自动 bump 版本并创建 git tag
git push --tags     # 推送 tag → 触发 CI → 自动发布到 npm
```

CI 会在 `ubuntu / macos / windows` × `node 18 / 20` 共 6 个环境下验证构建。

## 技术栈

| 依赖 | 用途 |
|------|------|
| [auto-launch](https://github.com/4ppl3/auto-launch) | 跨平台开机自启注册 |
| [node-notifier](https://github.com/mikaelbr/node-notifier) | 原生系统通知 |
| [semver](https://github.com/npm/node-semver) | 语义化版本比较 |
| [chalk](https://github.com/chalk/chalk) v4 | 终端彩色输出 |
| [ora](https://github.com/sindresorhus/ora) v5 | 终端加载动画 |

## License

MIT
