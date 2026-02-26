#!/usr/bin/env node

/**
 * postinstall 脚本 - npm 全局安装完成后自动执行
 *
 * 功能：
 * 1. 注册开机自启
 * 2. 创建默认配置文件
 * 3. 输出使用提示
 *
 * 注意：此脚本中任何错误都不应导致 npm install 失败（用 try-catch 包裹）
 */

const chalk = require('chalk');

async function postinstall() {
  try {
    console.log();
    console.log(chalk.bold.cyan('  AI Tool Update Checker - 安装配置'));
    console.log(chalk.gray('  ─────────────────────────────────'));
    console.log();

    // 1. 注册开机自启
    const { enableAutoStart } = require('./autostart');
    const autoOk = await enableAutoStart();
    if (autoOk) {
      console.log(chalk.green('  ✓ 开机自启已注册'));
    } else {
      console.log(chalk.yellow('  ⚠ 开机自启注册失败（稍后可手动执行: aiuc --enable-autostart）'));
    }

    // 2. 创建默认配置
    const { loadConfig, saveConfig } = require('./config');
    const config = loadConfig();
    saveConfig(config);
    console.log(chalk.green('  ✓ 配置文件已创建: ~/.ai-tool-updater/config.json'));

    // 3. 输出使用提示
    console.log();
    console.log(chalk.bold('  快速使用:'));
    console.log(chalk.gray('    aiuc           检查并更新 AI 工具（交互式）'));
    console.log(chalk.gray('    aiuc --check   仅检查，不更新'));
    console.log(chalk.gray('    aiuc --status  查看当前状态'));
    console.log(chalk.gray('    aiuc --help    查看所有命令'));
    console.log();
    console.log(chalk.green.bold('  安装完成! 更新检查将在每次开机时自动运行'));
    console.log();
  } catch (err) {
    // postinstall 失败不应阻止 npm install
    console.log('  AI Tool Updater: 安装配置已跳过（可手动执行 "aiuc --enable-autostart"）');
  }
}

postinstall();
