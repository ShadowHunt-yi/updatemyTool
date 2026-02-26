#!/usr/bin/env node

/**
 * AI Tool Update Checker - CLI 主入口
 *
 * 命令说明：
 *   aiuc                     交互模式 - 检查并更新
 *   aiuc --check / -c        仅检查，不提示更新
 *   aiuc --daemon / -d       守护进程模式（后台运行）
 *   aiuc --enable-autostart  启用开机自启
 *   aiuc --disable-autostart 禁用开机自启
 *   aiuc --status / -s       显示当前状态
 *   aiuc --version / -v      显示版本号
 *   aiuc --help / -h         显示帮助信息
 */

import { runInteractive, runCheckOnly } from './interactive';
import { startDaemon } from './daemon';
import { enableAutoStart, disableAutoStart, isAutoStartEnabled } from './autostart';
import { loadConfig } from './config';
import { log } from './utils';

const chalk = require('chalk');

// 从 package.json 读取版本号
const VERSION = require('../package.json').version;

/**
 * 打印帮助信息
 */
function printHelp(): void {
  console.log(`
${chalk.bold.cyan('AI Tool Update Checker')} v${VERSION}

${chalk.bold('用法:')}
  aiuc                     交互模式 - 检查并更新工具
  aiuc --check             仅检查更新（无交互提示）
  aiuc --daemon            启动后台守护进程
  aiuc --enable-autostart  启用开机自启
  aiuc --disable-autostart 禁用开机自启
  aiuc --status            显示当前状态
  aiuc --version           显示版本号
  aiuc --help              显示此帮助

${chalk.bold('支持的 AI 工具:')}
  - Claude Code (@anthropic-ai/claude-code)
  - OpenAI Codex (@openai/codex)
  - OpenCode (opencode-ai)
  - GitHub Copilot CLI
  - Aider (aider-chat)

${chalk.bold('配置文件:')}
  ~/.ai-tool-updater/config.json   配置
  ~/.ai-tool-updater/debug.log     日志
`);
}

/**
 * 显示当前状态信息
 */
async function showStatus(): Promise<void> {
  const config = loadConfig();
  const autoStart = await isAutoStartEnabled();

  console.log();
  console.log(chalk.bold.cyan('  AI Tool Updater 状态'));
  console.log(chalk.gray('  ─────────────────────────'));
  console.log(`  开机自启:   ${autoStart ? chalk.green('已启用') : chalk.red('未启用')}`);
  console.log(`  检查间隔:   ${config.checkIntervalHours} 小时`);

  if (config.lastCheckTime > 0) {
    const lastCheck = new Date(config.lastCheckTime);
    const ago = Math.round((Date.now() - config.lastCheckTime) / 1000 / 60);
    console.log(`  上次检查:   ${lastCheck.toLocaleString()} (${ago} 分钟前)`);
  } else {
    console.log(`  上次检查:   ${chalk.gray('从未检查')}`);
  }
  console.log();
}

/**
 * 主函数 - 解析命令行参数并分发到对应功能
 */
async function main(): Promise<void> {
  // process.argv: [node路径, 脚本路径, ...用户参数]
  // slice(2) 取用户传入的参数
  const args = process.argv.slice(2);
  const arg = args[0];

  try {
    switch (arg) {
      case '--help':
      case '-h':
        printHelp();
        break;

      case '--version':
      case '-v':
        console.log(`ai-tool-updater v${VERSION}`);
        break;

      case '--check':
      case '-c':
        await runCheckOnly();
        break;

      case '--daemon':
      case '-d':
        await startDaemon();
        break;

      case '--enable-autostart': {
        const ok = await enableAutoStart();
        if (ok) {
          console.log(chalk.green('  开机自启已启用，守护进程将在开机时自动运行'));
        } else {
          console.log(chalk.red('  启用开机自启失败'));
        }
        break;
      }

      case '--disable-autostart': {
        const ok = await disableAutoStart();
        if (ok) {
          console.log(chalk.green('  开机自启已禁用'));
        } else {
          console.log(chalk.red('  禁用开机自启失败'));
        }
        break;
      }

      case '--status':
      case '-s':
        await showStatus();
        break;

      default:
        // 未知选项报错
        if (arg && arg.startsWith('-')) {
          console.log(chalk.red(`  未知选项: ${arg}`));
          console.log(chalk.gray('  运行 "aiuc --help" 查看用法'));
          process.exit(1);
        }
        // 无参数 → 进入交互模式
        await runInteractive();
        break;
    }
  } catch (err: any) {
    log(`致命错误: ${err.message}`);
    console.error(chalk.red(`错误: ${err.message}`));
    process.exit(1);
  }
}

main();
