import path from 'path';
import { GeneratorContext, GenerateResult } from '../types.js';
import { BaseGenerator } from './base-generator.js';
import { ValidationUtility, NamingUtility } from '../utils/index.js';
import { FileUtility } from '../utils/index.js';

export class ModuleGenerator extends BaseGenerator {
  getTemplateName(): string {
    return 'module';
  }

  getRegistrationType(): null {
    return null;
  }

  validate(context: GeneratorContext): { valid: boolean; error?: string } {
    return ValidationUtility.validateModuleName(context.moduleName!);
  }

  protected generateFilePath(context: GeneratorContext): string {
    const fileName = `${context.moduleName!}.module.ts`;
    return path.join(this.projectRoot, 'src/modules', context.moduleName!, fileName);
  }

  protected getGeneratorType(): string {
    return 'Module';
  }

  async execute(context: GeneratorContext): Promise<GenerateResult> {
    const validation = this.validate(context);
    if (!validation.valid) {
      return { success: false, files: [], errors: [validation.error!], message: validation.error! };
    }

    try {
      const modulePath = path.join(this.projectRoot, 'src/modules', context.moduleName!);
      await FileUtility.ensureDirectory(modulePath);

      const moduleContent = await this.templateEngine.render('module', {
        appName: context.appName,
        moduleName: context.moduleName!,
        className: NamingUtility.toPascalCase(context.moduleName!) + 'Module',
        fileName: `${context.moduleName!}.module.ts`,
        description: context.description || '',
      });

      const moduleFile = path.join(modulePath, `${context.moduleName!}.module.ts`);
      await FileUtility.write(moduleFile, moduleContent);

      const indexContent = `export * from './${context.moduleName!}.module.js';\n`;
      const indexFile = path.join(modulePath, 'index.ts');
      await FileUtility.write(indexFile, indexContent);

      await FileUtility.ensureDirectory(path.join(modulePath, 'controllers'));
      await FileUtility.ensureDirectory(path.join(modulePath, 'services'));
      await FileUtility.ensureDirectory(path.join(modulePath, 'dto'));

      return {
        success: true,
        files: [
          { path: moduleFile, content: moduleContent },
          { path: indexFile, content: indexContent },
        ],
        errors: [],
        message: `✅ Generated Module: ${context.moduleName!}`,
      };
    } catch (err) {
      return {
        success: false,
        files: [],
        errors: [(err as Error).message],
        message: `Error: ${(err as Error).message}`,
      };
    }
  }
}
