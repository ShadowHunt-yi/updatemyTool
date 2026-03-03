/**
 * 工具函数 - 命令执行封装、版本解析、日志记录
 */

import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

/** 日志和配置文件存放目录 */
const LOG_DIR = path.join(os.homedir(), '.ai-tool-updater');
const LOG_FILE = path.join(LOG_DIR, 'debug.log');

/**
 * 确保目录存在，不存在则递归创建
 */
export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 写入一行带时间戳的日志
 * 静默失败，不影响主流程
 */
export function log(message: string): void {
  try {
    ensureDir(LOG_DIR);
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, line, 'utf-8');
  } catch {
    // 日志写入失败不应影响程序运行
  }
}

/**
 * 执行外部命令并返回 stdout 文本
 * 失败时返回 null（不抛异常，便于调用方安全处理）
 *
 * @param command  - 可执行文件名
 * @param args     - 参数数组
 * @param timeoutMs - 超时时间（毫秒），默认 30 秒
 *
 * 注意：Windows 下 execFile 需要 shell:true 才能找到 .cmd/.bat 脚本
 */
export async function runCommand(command: string, args: string[], timeoutMs = 30000): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(command, args, {
      timeout: timeoutMs,
      env: { ...process.env },
      // Windows 下 npm/codex 等命令实际是 .cmd 脚本，必须通过 shell 执行
      shell: process.platform === 'win32',
      windowsHide: true,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * 以 shell 方式执行完整命令字符串（用于更新操作）
 * 返回 { ok, output } 对象
 *
 * @param cmd       - 完整命令字符串
 * @param timeoutMs - 超时时间，默认 2 分钟（更新操作可能较慢）
 */
export async function runShellCommand(cmd: string, timeoutMs = 120000): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: timeoutMs,
      env: { ...process.env },
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { ok: true, output: (stdout + '\n' + stderr).trim() };
  } catch (err: any) {
    const stdout = typeof err?.stdout === 'string' ? err.stdout : '';
    const stderr = typeof err?.stderr === 'string' ? err.stderr : '';
    const output = (stdout + '\n' + stderr).trim();
    return { ok: false, output: output || err?.message || String(err) };
  }
}

/**
 * 检测系统中是否安装了某个命令
 * Windows 使用 `where`，Unix 使用 `which`
 */
export async function commandExists(command: string): Promise<boolean> {
  const checkCmd = process.platform === 'win32' ? 'where' : 'which';
  const result = await runCommand(checkCmd, [command]);
  return result !== null && result.length > 0;
}

/**
 * 用正则从文本中提取版本号
 */
export function extractVersion(text: string, regex: RegExp): string | null {
  const match = text.match(regex);
  return match ? match[1] : null;
}
