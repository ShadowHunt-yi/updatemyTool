/**
 * 核心检查逻辑 - 检测已安装工具、获取版本、比对更新
 */

import * as semver from 'semver';
import { TOOLS, ToolDefinition } from './tools';
import { commandExists, runCommand, extractVersion, log } from './utils';

/** 单个工具的检查结果 */
export interface UpdateCheckResult {
  /** 工具定义 */
  tool: ToolDefinition;
  /** 是否已安装 */
  installed: boolean;
  /** 当前安装的版本 */
  currentVersion: string | null;
  /** 注册表中的最新版本 */
  latestVersion: string | null;
  /** 是否有可用更新 */
  hasUpdate: boolean;
}

/**
 * 检测系统中已安装了哪些 AI 工具
 * 并行执行所有检测，提高速度
 */
export async function detectInstalledTools(): Promise<ToolDefinition[]> {
  const results = await Promise.all(
    TOOLS.map(async (tool) => {
      const exists = await commandExists(tool.command);
      return exists ? tool : null;
    })
  );
  // 过滤掉 null（未安装的工具）
  return results.filter((t): t is ToolDefinition => t !== null);
}

/**
 * 获取工具当前安装的版本号
 * 执行 `<command> --version` 并用正则提取版本
 */
export async function getCurrentVersion(tool: ToolDefinition): Promise<string | null> {
  const output = await runCommand(tool.command, tool.versionArgs);
  if (!output) return null;
  return extractVersion(output, tool.versionRegex);
}

/**
 * 从包管理器注册表获取工具的最新版本
 * - npm 工具：执行 `npm view <包名> version`
 * - pip 工具：执行 `pip index versions <包名>` 并解析输出
 */
export async function getLatestVersion(tool: ToolDefinition): Promise<string | null> {
  if (tool.packageManager === 'npm') {
    const output = await runCommand('npm', ['view', tool.packageName, 'version']);
    if (!output) return null;
    return extractVersion(output, /(\d+\.\d+\.\d+)/);
  }

  if (tool.packageManager === 'pip') {
    // pip index versions 输出格式: "aider-chat (0.42.1)\nAvailable versions: 0.42.1, 0.42.0, ..."
    const output = await runCommand('pip', ['index', 'versions', tool.packageName]);
    if (output) {
      const match = output.match(/\((\d+\.\d+\.\d+[^)]*)\)/);
      if (match) return extractVersion(match[1], /(\d+\.\d+\.\d+)/);
    }
    // 备用方案：利用安装不存在的版本来获取可用版本列表
    const fallback = await runCommand('pip', ['install', '--dry-run', `${tool.packageName}==999.999.999`]);
    if (fallback) {
      const vMatch = fallback.match(/from versions:\s*([^)]+)\)/);
      if (vMatch) {
        const versions = vMatch[1].split(',').map(v => v.trim());
        return versions[versions.length - 1] || null;
      }
    }
    return null;
  }

  return null;
}

/**
 * 检查所有已安装工具的更新状态
 * 对每个工具并行获取当前版本和最新版本，然后用 semver 比较
 */
export async function checkAllUpdates(): Promise<UpdateCheckResult[]> {
  log('开始检查所有工具的更新...');

  const installedTools = await detectInstalledTools();
  log(`检测到 ${installedTools.length} 个已安装工具: ${installedTools.map(t => t.name).join(', ')}`);

  const results = await Promise.all(
    installedTools.map(async (tool): Promise<UpdateCheckResult> => {
      try {
        // 并行获取当前版本和最新版本
        const [currentVersion, latestVersion] = await Promise.all([
          getCurrentVersion(tool),
          getLatestVersion(tool),
        ]);

        let hasUpdate = false;
        if (currentVersion && latestVersion) {
          // semver.coerce 可以处理不完全规范的版本号（如 "v2.1.0"）
          const current = semver.coerce(currentVersion);
          const latest = semver.coerce(latestVersion);
          if (current && latest) {
            hasUpdate = semver.lt(current, latest);
          }
        }

        log(`${tool.name}: 当前=${currentVersion}, 最新=${latestVersion}, 需更新=${hasUpdate}`);

        return { tool, installed: true, currentVersion, latestVersion, hasUpdate };
      } catch (err) {
        log(`检查 ${tool.name} 时出错: ${err}`);
        return { tool, installed: true, currentVersion: null, latestVersion: null, hasUpdate: false };
      }
    })
  );

  return results;
}

/**
 * 从检查结果中筛选出有可用更新的工具
 */
export function getUpdatableTools(results: UpdateCheckResult[]): UpdateCheckResult[] {
  return results.filter(r => r.hasUpdate);
}
