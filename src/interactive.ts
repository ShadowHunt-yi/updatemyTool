/**
 * 交互式 CLI 模式 - 展示更新状态，让用户选择并确认更新
 *
 * 功能：
 * - 带进度动画的检查过程
 * - 表格展示所有已安装工具的版本对比
 * - 用户可选择全部更新或逐个确认
 * - 执行更新时显示实时状态
 */

import { checkAllUpdates, getUpdatableTools, UpdateCheckResult } from './checker';
import { runShellCommand, log } from './utils';
import { loadConfig, saveConfig, markChecked } from './config';

// 使用 chalk v4 (CommonJS 版本，兼容 Node.js require)
// 使用 ora v5 (CommonJS 版本，v6+ 是纯 ESM 无法直接 require)
import chalk = require('chalk');
import ora = require('ora');

/**
 * 打印带样式的标题头
 */
function printHeader(): void {
  console.log();
  console.log(chalk.bold.cyan('  AI Tool Update Checker'));
  console.log(chalk.gray('  ─────────────────────────────'));
  console.log();
}

/**
 * 以表格形式打印检查结果
 */
function printResults(results: UpdateCheckResult[]): void {
  if (results.length === 0) {
    console.log(chalk.yellow('  未检测到任何已安装的 AI 工具'));
    console.log(chalk.gray('  支持的工具: Claude Code, OpenAI Codex, OpenCode, GitHub Copilot CLI, Aider'));
    return;
  }

  // 表头
  console.log(
    chalk.gray('  ') +
    padRight('工具', 22) +
    padRight('当前版本', 14) +
    padRight('最新版本', 14) +
    '状态'
  );
  console.log(chalk.gray('  ' + '─'.repeat(60)));

  // 逐行打印每个工具的状态
  for (const r of results) {
    const name = padRight(r.tool.name, 22);
    const current = padRight(r.currentVersion || 'unknown', 14);
    const latest = padRight(r.latestVersion || 'unknown', 14);
    let status: string;

    if (r.hasUpdate) {
      status = chalk.yellow.bold('有可用更新');
    } else if (r.currentVersion && r.latestVersion) {
      status = chalk.green('已是最新');
    } else {
      status = chalk.gray('检查失败');
    }

    console.log(`  ${name}${current}${latest}${status}`);
  }
  console.log();
}

/**
 * 字符串右填充到指定长度（用于表格对齐）
 */
function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

/**
 * 通过 stdin 提示用户确认（Y/n）
 * 默认为 Y（用户直接回车即同意）
 * 非交互式环境（如管道输入）自动返回 true
 */
async function confirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    process.stdout.write(chalk.bold(`  ${question} [Y/n] `));

    // 检测是否为交互式终端
    if (!process.stdin.isTTY) {
      console.log('y (非交互模式)');
      resolve(true);
      return;
    }

    process.stdin.setEncoding('utf-8');
    process.stdin.resume();  // 恢复 stdin 读取（默认是暂停状态）
    process.stdin.once('data', (data: string) => {
      process.stdin.pause();  // 读取完毕后暂停，避免阻塞进程退出
      const answer = data.trim().toLowerCase();
      // 空字符串（直接回车）或 y/yes 视为同意
      resolve(answer === '' || answer === 'y' || answer === 'yes');
    });
  });
}

/**
 * 执行更新操作
 * 逐个工具执行更新命令，显示 spinner 动画和结果
 */
async function executeUpdates(updates: UpdateCheckResult[]): Promise<void> {
  for (const u of updates) {
    const spinner = ora(`  正在更新 ${u.tool.name}...`).start();
    const cmd = u.tool.updateCommand.join(' ');
    const result = await runShellCommand(cmd);

    if (result.ok) {
      spinner.succeed(chalk.green(`  ${u.tool.name} 已更新至 ${u.latestVersion}`));
    } else {
      spinner.fail(chalk.red(`  ${u.tool.name} 更新失败`));
      console.log(chalk.gray(`    ${result.output.split('\n')[0]}`));

      // Unix 下权限不足时提示使用 sudo
      if (process.platform !== 'win32' && result.output.includes('EACCES')) {
        console.log(chalk.yellow(`    尝试: sudo ${cmd}`));
      }
    }
  }
}

/**
 * 运行交互式 CLI（主入口）
 * 流程：检查 → 展示结果 → 如有更新则询问用户 → 执行更新
 */
export async function runInteractive(): Promise<void> {
  printHeader();

  const spinner = ora('  正在检查更新...').start();

  let results: UpdateCheckResult[];
  try {
    results = await checkAllUpdates();
  } catch (err: any) {
    spinner.fail(chalk.red('  检查更新失败'));
    console.log(chalk.gray(`  ${err.message}`));
    return;
  }

  // 记录本次检查时间
  const config = loadConfig();
  saveConfig(markChecked(config));

  spinner.stop();
  printResults(results);

  const updates = getUpdatableTools(results);

  if (updates.length === 0) {
    if (results.length > 0) {
      console.log(chalk.green('  所有已安装的 AI 工具均为最新版本!'));
    }
    console.log();
    return;
  }

  // 询问用户是否更新
  console.log(chalk.cyan(`  发现 ${updates.length} 个可用更新`));
  console.log();

  const shouldUpdate = await confirm('是否全部更新?');

  if (shouldUpdate) {
    console.log();
    await executeUpdates(updates);
    console.log();
    console.log(chalk.green.bold('  全部完成!'));
  } else {
    // 用户拒绝全部更新，逐个询问
    console.log();
    for (const u of updates) {
      const shouldUpdateSingle = await confirm(
        `更新 ${u.tool.name} (${u.currentVersion} → ${u.latestVersion})?`
      );
      if (shouldUpdateSingle) {
        await executeUpdates([u]);
      }
    }
    console.log();
    console.log(chalk.bold('  完成!'));
  }

  console.log();
}

/**
 * 仅检查模式（不交互，只输出结果）
 * 适用于脚本调用或 CI 环境
 */
export async function runCheckOnly(): Promise<void> {
  printHeader();

  const spinner = ora('  正在检查更新...').start();

  let results: UpdateCheckResult[];
  try {
    results = await checkAllUpdates();
  } catch (err: any) {
    spinner.fail(chalk.red('  检查更新失败'));
    console.log(chalk.gray(`  ${err.message}`));
    process.exit(1);
  }

  spinner.stop();
  printResults(results);

  const updates = getUpdatableTools(results);
  if (updates.length > 0) {
    console.log(chalk.yellow(`  运行 ${chalk.bold('aiuc')} 进入交互式更新`));
    console.log();
  }

  // 记录检查时间
  const config = loadConfig();
  saveConfig(markChecked(config));
}
