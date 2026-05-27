import { Command } from 'commander';
import { ConfigLoader } from '../config-loader.js';
import { PromptUtility, ValidationUtility } from '../utils/index.js';
import { TemplateEngine } from '../core/template-engine.js';
import { ModuleIntelligence } from '../core/module-intelligence.js';
import { ASTManipulator } from '../core/ast-manipulator.js';
import { PluginRegistry } from '../core/plugin-registry.js';
import { AppGenerator } from '../generators/index.js';

export function createAppCommand(): Command {
  return new Command('create')
    .description('Create a new framework application')
    .argument('[name]', 'Application name')
    .option('--path <path>', 'Output directory')
    .option('--force', 'Overwrite without prompting')
    .action(async (name, options) => {
      try {
        let appName = name;

        if (!appName) {
          appName = await PromptUtility.text('What is your app name?', 'my-app');
        }

        const validation = ValidationUtility.validateAppName(appName);
        if (!validation.valid) {
          console.error(`❌ ${validation.error}`);
          process.exit(1);
        }

        const config = await ConfigLoader.load();
        const templateEngine = new TemplateEngine(config.templatePath);
        const moduleIntelligence = new ModuleIntelligence(process.cwd());
        const astManipulator = new ASTManipulator(process.cwd());
        const pluginRegistry = new PluginRegistry();

        const generator = new AppGenerator(
          process.cwd(),
          templateEngine,
          moduleIntelligence,
          astManipulator,
          pluginRegistry
        );

        const result = await generator.execute({
          projectRoot: process.cwd(),
          appName,
          modulePath: config.modulePath!,
          path: options.path,
        });

        console.log(result.message);
        if (!result.success) {
          result.errors.forEach(err => console.error(`  - ${err}`));
          process.exit(1);
        }
      } catch (err) {
        console.error('Error creating app:', err);
        process.exit(1);
      }
    });
}
