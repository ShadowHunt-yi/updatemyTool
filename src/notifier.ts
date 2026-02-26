/**
 * 跨平台系统通知封装
 * Windows: Toast 通知 | Mac: Notification Center | Linux: notify-send / DBus
 */

import * as notifier from 'node-notifier';
import { UpdateCheckResult } from './checker';
import { log } from './utils';

/**
 * 发送"有可用更新"的系统通知
 * 通知内容包含每个工具的版本变化，并提示用户运行 aiuc 更新
 */
export function notifyUpdatesAvailable(updates: UpdateCheckResult[]): void {
  if (updates.length === 0) return;

  // 构建通知内容：每行一个工具的版本变化
  const toolList = updates
    .map(u => `${u.tool.name}: ${u.currentVersion} → ${u.latestVersion}`)
    .join('\n');

  const title = updates.length === 1
    ? `${updates[0].tool.name} 有新版本`
    : `${updates.length} 个 AI 工具有更新`;

  const message = `${toolList}\n\n在终端运行 "aiuc" 来更新`;

  log(`发送通知: ${title}`);

  notifier.notify(
    {
      title: '🔄 AI 工具有可用更新',
      message,
      subtitle: title,
      sound: true,   // 播放提示音
      wait: false,    // 不阻塞进程等待用户点击
      timeout: 15,    // 通知显示 15 秒后自动消失
    },
    (err) => {
      if (err) {
        log(`通知发送失败: ${err.message}`);
      }
    }
  );
}

/**
 * 发送简单文本通知（通用用途）
 */
export function notifySimple(title: string, message: string): void {
  notifier.notify({
    title,
    message,
    sound: false,
    wait: false,
    timeout: 10,
  });
}
