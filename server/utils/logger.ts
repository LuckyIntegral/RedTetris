// we use any here to allow flexible logging arguments, including objects
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

type LogFn = (...args: any[]) => void;

const colorMap: Record<string, string> = {
  info: '\x1b[32m', // Green
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  debug: '\x1b[34m', // Blue
  reset: '\x1b[0m', // Reset
};

const makePrefixed = (level: string): LogFn => {
  return (...args: any[]) => {
    console.log(`[${colorMap[level]}${level}${colorMap.reset}]`, ...args);
  };
};

export const logger = {
  info: makePrefixed('info'),
  warn: makePrefixed('warn'),
  error: makePrefixed('error'),
  debug: makePrefixed('debug'),
};

export const logDbError = (context: string, error: unknown): void => {
  const safeErrorInfo =
    error instanceof Error ? { name: error.name, message: error.message } : { message: 'Unknown error type' };
  logger.error('Database error', { context, error: safeErrorInfo });
};
