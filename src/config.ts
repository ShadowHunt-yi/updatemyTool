/**
 * 配置管理 - 持久化存储在 ~/.ai-tool-updater/config.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ensureDir } from './utils';

/** 配置目录和文件路径 */
const CONFIG_DIR = path.join(os.homedir(), '.ai-tool-updater');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/** 配置接口 */
export interface Config {
  /** 上次检查更新的时间戳（毫秒） */
  lastCheckTime: number;
  /** 检查间隔（小时） */
  checkIntervalHours: number;
  /** 是否启用开机自启 */
  autoStartEnabled: boolean;
}

/** 默认配置 - 12 小时检查一次，默认开启自启 */
const DEFAULT_CONFIG: Config = {
  lastCheckTime: 0,
  checkIntervalHours: 12,
  autoStartEnabled: true,
};

/**
 * 从磁盘读取配置
 * 如果文件不存在或损坏，返回默认值
 */
export function loadConfig(): Config {
  try {
    ensureDir(CONFIG_DIR);
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      // 合并：已有配置覆盖默认值，确保新增字段有默认值
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // 配置文件损坏时返回默认值
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * 保存配置到磁盘
 */
export function saveConfig(config: Config): void {
  try {
    ensureDir(CONFIG_DIR);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch {
    // 保存失败静默忽略
  }
}

/**
 * 判断是否到了该检查的时间
 * lastCheckTime 为 0 表示从未检查过，需要立即检查
 */
export function shouldCheck(config: Config): boolean {
  if (config.lastCheckTime === 0) return true;
  const elapsed = Date.now() - config.lastCheckTime;
  const intervalMs = config.checkIntervalHours * 60 * 60 * 1000;
  return elapsed >= intervalMs;
}

/**
 * 更新 "上次检查时间" 为当前时刻
 * 返回新的 config 对象（不可变风格）
 */
export function markChecked(config: Config): Config {
  return { ...config, lastCheckTime: Date.now() };
}
