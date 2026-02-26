/**
 * AI 工具注册表 - 定义所有支持的 AI CLI 工具信息
 */

/** 包管理器类型 */
export type PackageManager = 'npm' | 'pip';

/** 单个 AI 工具的完整定义 */
export interface ToolDefinition {
  /** 显示名称 */
  name: string;
  /** CLI 命令名 (用于检测是否已安装) */
  command: string;
  /** 获取当前版本的命令参数 */
  versionArgs: string[];
  /** 从命令输出中提取版本号的正则表达式 */
  versionRegex: RegExp;
  /** 包管理器中的包名 */
  packageName: string;
  /** 使用的包管理器类型 */
  packageManager: PackageManager;
  /** 执行更新的完整命令 */
  updateCommand: string[];
}

/**
 * 所有支持的 AI 工具列表
 * 要添加新工具，只需在此数组中追加一项即可
 */
export const TOOLS: ToolDefinition[] = [
  {
    name: 'Claude Code',
    command: 'claude',
    versionArgs: ['--version'],
    versionRegex: /(\d+\.\d+\.\d+)/,
    packageName: '@anthropic-ai/claude-code',
    packageManager: 'npm',
    updateCommand: ['npm', 'install', '-g', '@anthropic-ai/claude-code@latest'],
  },
  {
    name: 'OpenAI Codex',
    command: 'codex',
    versionArgs: ['--version'],
    versionRegex: /(\d+\.\d+\.\d+)/,
    packageName: '@openai/codex',
    packageManager: 'npm',
    updateCommand: ['npm', 'install', '-g', '@openai/codex@latest'],
  },
  {
    name: 'OpenCode',
    command: 'opencode',
    versionArgs: ['--version'],
    versionRegex: /(\d+\.\d+\.\d+)/,
    packageName: 'opencode-ai',
    packageManager: 'npm',
    updateCommand: ['npm', 'install', '-g', 'opencode-ai@latest'],
  },
  {
    name: 'GitHub Copilot CLI',
    command: 'github-copilot-cli',
    versionArgs: ['--version'],
    versionRegex: /(\d+\.\d+\.\d+)/,
    packageName: '@githubnext/github-copilot-cli',
    packageManager: 'npm',
    updateCommand: ['npm', 'install', '-g', '@githubnext/github-copilot-cli@latest'],
  },
  {
    name: 'Aider',
    command: 'aider',
    versionArgs: ['--version'],
    versionRegex: /(\d+\.\d+\.\d+)/,
    packageName: 'aider-chat',
    packageManager: 'pip',
    updateCommand: ['pip', 'install', '-U', 'aider-chat'],
  },
];
