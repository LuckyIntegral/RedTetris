export const logDbError = (context: string, error: unknown): void => {
  const safeErrorInfo =
    error instanceof Error ? { name: error.name, message: error.message } : { message: 'Unknown error type' };

  console.error('Database error', { context, error: safeErrorInfo });
};
