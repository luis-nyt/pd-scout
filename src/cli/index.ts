/**
 * pd-scout CLI
 * 
 * Main entry point for the command-line interface.
 * 
 * This is the file that runs when users type `pd-scout` in their terminal.
 * It sets up the commander program and registers all commands.
 */

import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze.js';
import { initCommand } from './commands/init.js';
import { validateCommand } from './commands/validate.js';
import { listCommand } from './commands/list.js';

// Create the main program
const program = new Command();

program
  .name('pd-scout')
  .description('Pattern-driven codebase analysis tool for design system visibility')
  .version('1.0.0');

// Register commands
program.addCommand(analyzeCommand);
program.addCommand(initCommand);
program.addCommand(validateCommand);
program.addCommand(listCommand);

// Parse command line arguments
program.parse(process.argv);

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

