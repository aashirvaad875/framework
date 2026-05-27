import { Command } from 'commander';
import { ConfigLoader } from '../config-loader.js';
import { PromptUtility, ValidationUtility } from '../utils/index.js';
import { TemplateEngine } from '../core/template-engine.js';
import { ModuleIntelligence } from '../core/module-intelligence.js';
import { ASTManipulator } from '../core/ast-manipulator.js';
import { PluginRegistry } from '../core/plugin-registry.js';
import { ModuleGenerator } from '../generators/index.js';

export function moduleCommand(): Command {
  return new Command('module')
    .description('Generate a new module')
    .argument('[name]', 'Module name')
    .option('--path <path>', 'Custom path within modules directory')
    .option('--description <description>', 'Module description')
    .option('--force', 'Overwrite without prompting')
    .action(async (name, options) => {
      try {
        const config = await ConfigLoader.load();

        let moduleName = name;
        if (!moduleName) {
          moduleName = await PromptUtility.text('Module name?', 'example');
        }

        const validation = ValidationUtility.validateModuleName(moduleName);
        if (!validation.valid) {
          console.error(`❌ ${validation.error}`);
          process.exit(1);
        }

        const templateEngine = new TemplateEngine(config.templatePath);
        const moduleIntelligence = new ModuleIntelligence(process.cwd());
        const astManipulator = new ASTManipulator(process.cwd());
        const pluginRegistry = new PluginRegistry();

        const generator = new ModuleGenerator(
          process.cwd(),
          templateEngine,
          moduleIntelligence,
          astManipulator,
          pluginRegistry
        );

        const result = await generator.execute({
          projectRoot: process.cwd(),
          modulePath: config.modulePath!,
          appName: 'app',
          moduleName,
          path: options.path,
          description: options.description,
        });

        console.log(result.message);
        if (!result.success) {
          result.errors.forEach(err => console.error(`  - ${err}`));
          process.exit(1);
        }
      } catch (err) {
        console.error('Error generating module:', err);
        process.exit(1);
      }
    });
}
