// CLI entry point - minimal placeholder for build
// Actual implementation will be added in subsequent tasks

import { Command } from 'commander';

export const program = new Command();

program.name('framework').description('Enterprise CLI for scaffolding framework projects and modules').version('1.0.0');

// Export for bin/framework.js entry point
export default program;
