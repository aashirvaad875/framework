import { Command } from 'commander';
import { createAppCommand, generateCommand } from './commands/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

export const program = new Command()
  .name('framework')
  .description('Framework CLI - Scaffold projects and modules')
  .version(packageJson.version)
  .helpOption('-h, --help', 'Display help for command');

// Register commands
program.addCommand(createAppCommand());
program.addCommand(generateCommand());

// Error handling
program.exitOverride(err => {
  if (err.code !== 'executeSubcommand') {
    console.error(`Error: ${err.message}`);
  }
  process.exit(err.exitCode);
});

// Main entry
if (process.argv.length < 3) {
  program.help();
} else {
  program.parse(process.argv);
}
