/**
 * 开机自启管理 - 注册/注销开机自动启动
 *
 * 跨平台实现原理：
 * - Windows: 写入注册表 HKCU\Software\Microsoft\Windows\CurrentVersion\Run
 * - macOS:   创建 ~/Library/LaunchAgents/ai-tool-updater.plist
 * - Linux:   创建 ~/.config/autostart/ai-tool-updater.desktop
 */

import AutoLaunch = require('auto-launch');
import * as fs from 'fs';
import * as path from 'path';
import { log } from './utils';

let launcher: AutoLaunch | null = null;

function resolveDaemonEntryScript(): string {
  // Prefer the compiled CLI entry next to this file (dist/index.js).
  // This avoids accidentally registering postinstall.js or other callers.
  const distIndex = path.resolve(__dirname, 'index.js');
  if (fs.existsSync(distIndex)) return distIndex;

  // Fallback for uncommon dev setups (e.g. running TS directly).
  return process.argv[1];
}

/**
 * 获取 AutoLaunch 实例（单例模式）
 *
 * 关键点：
 * - auto-launch 的 path 选项需要指向可执行文件
 * - 我们需要让它在开机时以 `node <script> --daemon` 方式运行
 * - 通过扩展 options 将 args 传入（auto-launch 实际支持但类型定义中缺失）
 */
function getLauncher(): AutoLaunch {
  if (!launcher) {
    const scriptPath = resolveDaemonEntryScript();

    // auto-launch 库实际支持 args 参数，但 @types/auto-launch 类型定义中缺失
    // 使用 as any 绕过 TypeScript 类型检查
    launcher = new AutoLaunch({
      name: 'AI Tool Updater',
      path: process.execPath,
      isHidden: true,  // 隐藏窗口启动（Windows 适用）
      args: [scriptPath, '--daemon'],  // 开机后以守护模式运行
    } as any);
  }
  return launcher;
}

/**
 * 启用开机自启
 * 如果已经启用则跳过
 */
export async function enableAutoStart(): Promise<boolean> {
  try {
    const al = getLauncher();
    const isEnabled = await al.isEnabled();
    if (!isEnabled) {
      await al.enable();
      log('开机自启已启用');
    } else {
      log('开机自启已经是启用状态');
    }
    return true;
  } catch (err: any) {
    log(`启用开机自启失败: ${err.message}`);
    return false;
  }
}

/**
 * 禁用开机自启
 */
export async function disableAutoStart(): Promise<boolean> {
  try {
    const al = getLauncher();
    const isEnabled = await al.isEnabled();
    if (isEnabled) {
      await al.disable();
      log('开机自启已禁用');
    } else {
      log('开机自启已经是禁用状态');
    }
    return true;
  } catch (err: any) {
    log(`禁用开机自启失败: ${err.message}`);
    return false;
  }
}

/**
 * 查询当前开机自启是否已启用
 */
export async function isAutoStartEnabled(): Promise<boolean> {
  try {
    return await getLauncher().isEnabled();
  } catch {
    return false;
  }
}
