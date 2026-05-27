import { Command } from 'commander';
import { ConfigLoader } from '../config-loader.js';
import { PromptUtility, ValidationUtility } from '../utils/index.js';
import { TemplateEngine } from '../core/template-engine.js';
import { ModuleIntelligence } from '../core/module-intelligence.js';
import { ASTManipulator } from '../core/ast-manipulator.js';
import { PluginRegistry } from '../core/plugin-registry.js';
import { ServiceGenerator } from '../generators/index.js';

export function serviceCommand(): Command {
  return new Command('service')
    .description('Generate a new service')
    .argument('[name]', 'Service class name')
    .option('--module <module>', 'Target module')
    .option('--path <path>', 'Custom path within module')
    .option('--description <description>', 'Service description')
    .option('--force', 'Overwrite without prompting')
    .action(async (name, options) => {
      try {
        const config = await ConfigLoader.load();
        const modules = await new ModuleIntelligence(process.cwd()).listModules(config.modulePath!);

        let className = name;
        if (!className) {
          className = await PromptUtility.text('Service name?', 'ExampleService');
        }

        if (!className.endsWith('Service')) {
          className += 'Service';
        }

        let moduleName = options.module;
        if (!moduleName) {
          moduleName = await PromptUtility.select('Select module:', modules);
        }

        const validation = ValidationUtility.validateClassName(className);
        if (!validation.valid) {
          console.error(`❌ ${validation.error}`);
          process.exit(1);
        }

        const templateEngine = new TemplateEngine(config.templatePath);
        const moduleIntelligence = new ModuleIntelligence(process.cwd());
        const astManipulator = new ASTManipulator(process.cwd());
        const pluginRegistry = new PluginRegistry();

        const generator = new ServiceGenerator(
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
          className,
          path: options.path,
          description: options.description,
        });

        console.log(result.message);
        if (!result.success) {
          result.errors.forEach(err => console.error(`  - ${err}`));
          process.exit(1);
        }
      } catch (err) {
        console.error('Error generating service:', err);
        process.exit(1);
      }
    });
}
