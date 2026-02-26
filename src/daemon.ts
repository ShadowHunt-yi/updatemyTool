/**
 * 守护进程模式 - 后台运行，定时检查更新并发送系统通知
 *
 * 工作流程：
 * 1. 启动后立即判断是否需要检查（基于上次检查时间）
 * 2. 如需检查则执行一次完整检查
 * 3. 设置定时器，每 N 小时自动检查一次
 * 4. 进程保持存活，持续在后台运行
 */

import { checkAllUpdates, getUpdatableTools } from './checker';
import { notifyUpdatesAvailable } from './notifier';
import { loadConfig, saveConfig, shouldCheck, markChecked } from './config';
import { log } from './utils';

/**
 * 执行一次完整的检查周期
 * 检查所有已安装工具 → 筛选有更新的 → 发送通知 → 记录检查时间
 */
async function runCheckCycle(): Promise<void> {
  try {
    const results = await checkAllUpdates();
    const updates = getUpdatableTools(results);

    if (updates.length > 0) {
      log(`发现 ${updates.length} 个工具有可用更新`);
      notifyUpdatesAvailable(updates);
    } else {
      log('所有工具均为最新版本');
    }

    // 更新上次检查时间
    const config = loadConfig();
    saveConfig(markChecked(config));
  } catch (err: any) {
    log(`检查周期出错: ${err.message}`);
  }
}

/**
 * 启动守护进程
 * - 首先判断距上次检查是否超过了设定间隔
 * - 是：立即执行检查
 * - 否：等待下次定时触发
 * - 然后设置 setInterval 定期检查
 */
export async function startDaemon(): Promise<void> {
  const config = loadConfig();
  const intervalMs = config.checkIntervalHours * 60 * 60 * 1000;

  log(`守护进程启动，检查间隔: ${config.checkIntervalHours} 小时`);

  // 判断是否需要立即检查
  if (shouldCheck(config)) {
    log('距上次检查已超过间隔，立即执行检查...');
    await runCheckCycle();
  } else {
    const nextCheckIn = config.lastCheckTime + intervalMs - Date.now();
    log(`上次检查较近，${Math.round(nextCheckIn / 1000 / 60)} 分钟后再检查`);
  }

  // 设置定时器：每隔 intervalMs 毫秒执行一次检查
  // 使用 setInterval 而非 node-schedule，减少依赖
  setInterval(async () => {
    log('定时检查触发');
    await runCheckCycle();
  }, intervalMs);

  // 进程不会退出，setInterval 会保持事件循环活跃
  log('守护进程已在后台运行...');
}
