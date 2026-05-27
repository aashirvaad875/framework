import { Command } from 'commander';
import {
  controllerCommand,
  serviceCommand,
  middlewareCommand,
  guardCommand,
  interceptorCommand,
  moduleCommand,
} from './index.js';

export function generateCommand(): Command {
  const generate = new Command('generate').description('Generate code for your application');

  generate.addCommand(controllerCommand());
  generate.addCommand(serviceCommand());
  generate.addCommand(middlewareCommand());
  generate.addCommand(guardCommand());
  generate.addCommand(interceptorCommand());
  generate.addCommand(moduleCommand());

  return generate;
}
