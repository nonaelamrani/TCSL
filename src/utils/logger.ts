export const logger = {
  info(message: string, metadata?: unknown) {
    console.info(`[INFO] ${new Date().toISOString()} ${message}`, metadata ?? "");
  },
  error(message: string, error?: unknown) {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, error ?? "");
  },
};
