import { GeneratorContext, GenerateResult, FileToWrite } from '../types.js';
import { TemplateEngine } from '../core/template-engine.js';
import { ModuleIntelligence } from '../core/module-intelligence.js';
import { ASTManipulator } from '../core/ast-manipulator.js';
import { PluginRegistry } from '../core/plugin-registry.js';
import { FileUtility, NamingUtility } from '../utils/index.js';

export abstract class BaseGenerator {
  protected projectRoot: string;
  protected templateEngine: TemplateEngine;
  protected moduleIntelligence: ModuleIntelligence;
  protected astManipulator: ASTManipulator;
  protected pluginRegistry: PluginRegistry;

  constructor(
    projectRoot: string,
    templateEngine: TemplateEngine,
    moduleIntelligence: ModuleIntelligence,
    astManipulator: ASTManipulator,
    pluginRegistry: PluginRegistry
  ) {
    this.projectRoot = projectRoot;
    this.templateEngine = templateEngine;
    this.moduleIntelligence = moduleIntelligence;
    this.astManipulator = astManipulator;
    this.pluginRegistry = pluginRegistry;
  }

  abstract getTemplateName(): string;
  abstract getRegistrationType():
    | 'controller'
    | 'provider'
    | 'guard'
    | 'middleware'
    | 'interceptor'
    | null;
  abstract validate(context: GeneratorContext): { valid: boolean; error?: string };

  async execute(context: GeneratorContext): Promise<GenerateResult> {
    try {
      // Validate input
      const validation = this.validate(context);
      if (!validation.valid) {
        return {
          success: false,
          files: [],
          errors: [validation.error || 'Validation failed'],
          message: `Validation failed: ${validation.error}`,
        };
      }

      // Run before hook
      const modifiedContext = await this.pluginRegistry.executeBeforeGenerate(context);

      // Render template
      const content = await this.templateEngine.render(this.getTemplateName(), {
        appName: modifiedContext.appName,
        moduleName: modifiedContext.moduleName || '',
        className: modifiedContext.className || '',
        fileName: NamingUtility.classNameToFileName(modifiedContext.className || 'Index'),
        description: modifiedContext.description || '',
      });

      // Generate file path
      const filePath = this.generateFilePath(modifiedContext);
      const file: FileToWrite = { path: filePath, content };

      // Run before write hook
      const modifiedFile = await this.pluginRegistry.executeBeforeWrite(file);

      // Check for conflicts
      const fileExists = await FileUtility.exists(modifiedFile.path);
      if (fileExists && !modifiedFile.overwrite) {
        return {
          success: false,
          files: [],
          errors: [`File already exists: ${modifiedFile.path}`],
          message: `Conflict: ${modifiedFile.path} already exists`,
        };
      }

      // Write file
      await FileUtility.write(modifiedFile.path, modifiedFile.content, modifiedFile.overwrite);

      // Run after write hook
      await this.pluginRegistry.executeAfterWrite(modifiedFile);

      // Run after generate hook
      const result: GenerateResult = {
        success: true,
        files: [modifiedFile],
        errors: [],
        message: `✅ Generated ${this.getGeneratorType()}: ${modifiedFile.path}`,
      };

      const finalResult = await this.pluginRegistry.executeAfterGenerate(result);

      return finalResult;
    } catch (err) {
      return {
        success: false,
        files: [],
        errors: [(err as Error).message],
        message: `Error: ${(err as Error).message}`,
      };
    }
  }

  protected abstract generateFilePath(context: GeneratorContext): string;
  protected abstract getGeneratorType(): string;
}
