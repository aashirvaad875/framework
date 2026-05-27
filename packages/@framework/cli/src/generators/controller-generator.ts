import path from 'path';
import { GeneratorContext } from '../types.js';
import { BaseGenerator } from './base-generator.js';
import { ValidationUtility, NamingUtility } from '../utils/index.js';

export class ControllerGenerator extends BaseGenerator {
  getTemplateName(): string {
    return 'controller';
  }

  getRegistrationType(): 'controller' {
    return 'controller';
  }

  validate(context: GeneratorContext): { valid: boolean; error?: string } {
    const validation = ValidationUtility.validateClassName(context.className!);
    if (!validation.valid) {
      return validation;
    }

    if (!context.className!.endsWith('Controller')) {
      return { valid: false, error: 'Controller name must end with "Controller"' };
    }

    return { valid: true };
  }

  protected generateFilePath(context: GeneratorContext): string {
    const fileName = NamingUtility.classNameToFileName(context.className!, 'Controller');
    return path.join(
      this.projectRoot,
      context.path || 'src/modules',
      context.moduleName!,
      'controllers',
      fileName
    );
  }

  protected getGeneratorType(): string {
    return 'Controller';
  }
}
