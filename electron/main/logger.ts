import { app } from 'electron';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { EnvironmentConfig } from './environment';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function serializeContext(context: unknown): string {
  if (context === undefined) {
    return '';
  }

  if (context instanceof Error) {
    return ` ${context.stack ?? context.message}`;
  }

  try {
    return ` ${JSON.stringify(context)}`;
  } catch {
    return ' [unserializable context]';
  }
}

class AppLogger {
  private logFilePath?: string;
  private echoToConsole = false;

  initialize(config: EnvironmentConfig): void {
    this.echoToConsole = config.echoLogsToConsole;
    this.logFilePath = join(app.getPath('logs'), 'the-cabinet.log');
    mkdirSync(dirname(this.logFilePath), { recursive: true });
    this.info('Logger initialized', { environment: config.name });
  }

  debug(message: string, context?: unknown): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: unknown): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: unknown): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: unknown): void {
    this.write('error', message, context);
  }

  private write(level: LogLevel, message: string, context?: unknown): void {
    const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}${serializeContext(context)}`;

    if (this.echoToConsole) {
      const method = level === 'debug' ? 'log' : level;
      console[method](line);
    }

    if (!this.logFilePath) {
      return;
    }

    try {
      appendFileSync(this.logFilePath, `${line}\n`, 'utf8');
    } catch (error) {
      process.stderr.write(`The Cabinet logger failed: ${String(error)}\n`);
    }
  }
}

export const logger = new AppLogger();
