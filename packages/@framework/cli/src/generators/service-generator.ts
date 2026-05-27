import path from 'path';
import { GeneratorContext } from '../types.js';
import { BaseGenerator } from './base-generator.js';
import { ValidationUtility, NamingUtility } from '../utils/index.js';

export class ServiceGenerator extends BaseGenerator {
  getTemplateName(): string {
    return 'service';
  }

  getRegistrationType(): 'provider' {
    return 'provider';
  }

  validate(context: GeneratorContext): { valid: boolean; error?: string } {
    const validation = ValidationUtility.validateClassName(context.className!);
    if (!validation.valid) {
      return validation;
    }

    if (!context.className!.endsWith('Service')) {
      return { valid: false, error: 'Service name must end with "Service"' };
    }

    return { valid: true };
  }

  protected generateFilePath(context: GeneratorContext): string {
    const fileName = NamingUtility.classNameToFileName(context.className!, 'Service');
    return path.join(
      this.projectRoot,
      context.path || 'src/modules',
      context.moduleName!,
      'services',
      fileName
    );
  }

  protected getGeneratorType(): string {
    return 'Service';
  }
}
