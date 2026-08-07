import type { LoggerService } from '@nestjs/common';

type LogLevel = 'debug' | 'error' | 'info' | 'warn';
type StructuredFields = Record<string, boolean | number | string>;

export class JsonLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write('info', message, context);
  }

  error(message: unknown, stack?: string, context?: string): void {
    this.write('error', message, context, stack);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  event(level: LogLevel, fields: StructuredFields, stack?: string): void {
    this.emit({
      timestamp: new Date().toISOString(),
      level,
      ...fields,
      ...(stack ? { stack } : {}),
    });
  }

  private write(level: LogLevel, message: unknown, context?: string, stack?: string): void {
    const record = {
      timestamp: new Date().toISOString(),
      level,
      message: this.safeMessage(message),
      ...(context ? { context } : {}),
      ...(stack ? { stack } : {}),
    };
    this.emit(record);
  }

  private safeMessage(message: unknown): string {
    if (typeof message === 'string') return message;
    if (message instanceof Error) return message.message;
    return 'Application log event';
  }

  private emit(record: { level: LogLevel; [key: string]: unknown }): void {
    const output = JSON.stringify(record);
    if (record.level === 'error') process.stderr.write(`${output}\n`);
    else process.stdout.write(`${output}\n`);
  }
}
