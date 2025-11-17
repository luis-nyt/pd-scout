import { logger } from '../../utils/logger.js';

/**
 * Progress Indicators
 * 
 * Simple progress tracking for CLI operations.
 * Uses the logger's spinner for consistency.
 */

export const createProgressSpinner = (initialText: string) => {
  return logger.spinner(initialText);
};

export const showProgress = (message: string) => {
  logger.info(`⏳ ${message}`);
};

export const showSuccess = (message: string) => {
  logger.success(message);
};

export const showError = (message: string) => {
  logger.error(message);
};

