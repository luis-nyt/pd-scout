/**
 * Logger Utility
 * 
 * Simple logging with levels and optional verbose mode.
 * We avoid using console.log directly per NYT rules, but in a CLI tool,
 * controlled output to stdout/stderr is the primary user interface.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

class Logger {
  private level: LogLevel = 'info';
  private verbose = false;

  setLevel(level: LogLevel) {
    this.level = level;
  }

  setVerbose(verbose: boolean) {
    this.verbose = verbose;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.level === 'silent') return false;

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];
    const currentIndex = levels.indexOf(this.level);
    const messageIndex = levels.indexOf(level);

    return messageIndex >= currentIndex;
  }

  debug(...args: unknown[]) {
    if (this.shouldLog('debug') && this.verbose) {
      console.debug('[DEBUG]', ...args);
    }
  }

  info(...args: unknown[]) {
    if (this.shouldLog('info')) {
      console.log(...args);
    }
  }

  warn(...args: unknown[]) {
    if (this.shouldLog('warn')) {
      console.warn('⚠️', ...args);
    }
  }

  error(...args: unknown[]) {
    if (this.shouldLog('error')) {
      console.error('❌', ...args);
    }
  }

  success(...args: unknown[]) {
    if (this.shouldLog('info')) {
      console.log('✅', ...args);
    }
  }

  // For spinner/progress indicators
  // Returns a simple object with methods to update/finish
  spinner(text: string) {
    if (!this.shouldLog('info')) {
      return {
        update: () => {},
        succeed: () => {},
        fail: () => {},
        stop: () => {},
      };
    }

    // Simple text-based spinner for now
    // In real implementation, could use ora or similar
    this.info(`⏳ ${text}`);

    return {
      update: (newText: string) => this.info(`⏳ ${newText}`),
      succeed: (message?: string) => this.success(message || text),
      fail: (message?: string) => this.error(message || text),
      stop: () => {},
    };
  }
}

// Singleton instance
export const logger = new Logger();

