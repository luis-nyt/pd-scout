import * as clack from '@clack/prompts';

/**
 * Interactive Prompts
 * 
 * Uses @clack/prompts for beautiful, modern CLI interactions.
 * These are used for the init command and interactive mode.
 */

export const promptForConfig = async () => {
  const config = await clack.group(
    {
      projectName: () =>
        clack.text({
          message: 'What is your project name?',
          placeholder: 'my-app',
          validate: (value) => {
            if (!value) return 'Project name is required';
          },
        }),

      designSystem: () =>
        clack.text({
          message: 'What is your design system called?',
          placeholder: 'Design System',
          initialValue: 'Design System',
        }),

      repo: () =>
        clack.text({
          message: 'Repository URL or local path? (optional)',
          placeholder: './src or https://github.com/org/repo',
        }),

      tokenBudget: () =>
        clack.text({
          message: 'Token budget for analysis?',
          placeholder: '100000',
          initialValue: '100000',
          validate: (value) => {
            if (value && Number.isNaN(Number(value))) {
              return 'Must be a number';
            }
          },
        }),
    },
    {
      onCancel: () => {
        clack.cancel('Operation cancelled');
        process.exit(0);
      },
    }
  );

  return config;
};

export const confirmAction = async (message: string): Promise<boolean> => {
  const confirmed = await clack.confirm({
    message,
  });

  return confirmed as boolean;
};

export const selectOption = async <T extends string>(
  message: string,
  options: Array<{ value: T; label: string; hint?: string }>
): Promise<T> => {
  const result = await clack.select({
    message,
    options,
  });

  return result as T;
};

export const showSpinner = (message: string) => {
  return clack.spinner();
};

