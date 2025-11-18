import { Injectable } from '@nestjs/common';

export interface ILoggerService {
  LogError(message: string, httpStatusCode: number): void;
  LogError(message: string): void;
  LogWarning(message: string): void;
  LogInfo(message: string): void;
}

@Injectable()
export class LoggerService implements ILoggerService {
  LogError(message: unknown, httpStatusCode?: unknown): void {
    if (httpStatusCode)
      console.error(
        '[%s]: HTTP %d - %s',
        new Date().toISOString(),
        httpStatusCode,
        message,
      );
    else console.error('[%s]: %s', new Date().toISOString(), message);
  }
  LogWarning(message: string): void {
    console.warn('[%s]: %s', new Date().toISOString(), message);
  }
  LogInfo(message: string): void {
    console.info('[%s]: %s', new Date().toISOString(), message);
  }
}
