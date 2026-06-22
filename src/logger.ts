import pino from 'pino';

export interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  file?: string;
  name?: string;
}

let logger: pino.Logger | null = null;

export function createLogger(config: LoggerConfig): pino.Logger {
  const options: pino.LoggerOptions = {
    level: config.level,
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (config.file) {
    options.transport = {
      target: 'pino/file',
      options: { destination: config.file, mkdir: true },
    };
  } else if (process.env.NODE_ENV !== 'production') {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  }

  logger = pino(options);
  return logger;
}

export function getLogger(): pino.Logger {
  if (!logger) {
    logger = createLogger({ level: 'info' });
  }
  return logger;
}

export function setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
  if (logger) {
    logger.level = level;
  }
}

// Structured logging helpers
export function logError(error: Error, context?: Record<string, any>): void {
  const log = getLogger();
  if (context) {
    log.error({ err: error, ...context }, error.message);
  } else {
    log.error({ err: error }, error.message);
  }
}

export function logInfo(message: string, data?: Record<string, any>): void {
  const log = getLogger();
  if (data) {
    log.info(data, message);
  } else {
    log.info(message);
  }
}

export function logDebug(message: string, data?: Record<string, any>): void {
  const log = getLogger();
  if (data) {
    log.debug(data, message);
  } else {
    log.debug(message);
  }
}

export function logWarn(message: string, data?: Record<string, any>): void {
  const log = getLogger();
  if (data) {
    log.warn(data, message);
  } else {
    log.warn(message);
  }
}