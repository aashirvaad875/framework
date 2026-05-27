import path from 'path';
import { GeneratorContext, GenerateResult } from '../types.js';
import { BaseGenerator } from './base-generator.js';
import { ValidationUtility } from '../utils/index.js';
import { FileUtility } from '../utils/index.js';

export class AppGenerator extends BaseGenerator {
  getTemplateName(): string {
    return 'app';
  }

  getRegistrationType(): null {
    return null;
  }

  validate(context: GeneratorContext): { valid: boolean; error?: string } {
    return ValidationUtility.validateAppName(context.appName!);
  }

  protected generateFilePath(context: GeneratorContext): string {
    return path.join(context.path || process.cwd(), 'src', 'main.ts');
  }

  protected getGeneratorType(): string {
    return 'Application';
  }

  async execute(context: GeneratorContext): Promise<GenerateResult> {
    const validation = this.validate(context);
    if (!validation.valid) {
      return { success: false, files: [], errors: [validation.error!], message: validation.error! };
    }

    try {
      const appPath = context.path || process.cwd();
      const srcPath = path.join(appPath, 'src');

      await FileUtility.ensureDirectory(srcPath);

      const mainContent = await this.templateEngine.render('app', {
        appName: context.appName,
        moduleName: 'app',
        className: 'AppModule',
        fileName: 'main.ts',
        description: 'Application entry point',
      });

      const mainFile = path.join(srcPath, 'main.ts');
      await FileUtility.write(mainFile, mainContent);

      const moduleContent = await this.templateEngine.render('module', {
        appName: context.appName,
        moduleName: 'app',
        className: 'AppModule',
        fileName: 'app.module.ts',
        description: 'Root application module',
      });

      const moduleFile = path.join(srcPath, 'app.module.ts');
      await FileUtility.write(moduleFile, moduleContent);

      return {
        success: true,
        files: [
          { path: mainFile, content: mainContent },
          { path: moduleFile, content: moduleContent },
        ],
        errors: [],
        message: `✅ Created Application: ${context.appName}`,
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
