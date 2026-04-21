const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
const noop = () => {};

export type LogLevel = 'info' | 'warn' | 'error';
export interface LogEntry { id: number; level: LogLevel; tag: string; message: string; data?: unknown; timestamp: string; }

export const logger = {
  info:       isDev ? (tag: string, msg: string, data?: unknown) => console.log(`[${tag}] ${msg}`, data ?? '')   : noop as (tag: string, msg: string, data?: unknown) => void,
  warn:       isDev ? (tag: string, msg: string, data?: unknown) => console.warn(`[${tag}] ${msg}`, data ?? '')  : noop as (tag: string, msg: string, data?: unknown) => void,
  error:      isDev ? (tag: string, msg: string, data?: unknown) => console.error(`[${tag}] ${msg}`, data ?? '') : noop as (tag: string, msg: string, data?: unknown) => void,
  getEntries: (): LogEntry[] => [],
  clear:      noop,
  subscribe:  (_fn: () => void): (() => void) => noop,
};