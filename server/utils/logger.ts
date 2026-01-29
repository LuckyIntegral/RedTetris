type LogFn = (...args: any[]) => void;

const makePrefixed = (level: string): LogFn => {
  return (...args: any[]) => {
    // Simple wrapper that prefixes messages; can be replaced with winston/pino later
    // Avoid JSON.stringify on complex objects to keep console behavior

    console.log(`[${level}]`, ...args);
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
