import path from 'path';
import { GeneratorContext } from '../types.js';
import { BaseGenerator } from './base-generator.js';
import { ValidationUtility, NamingUtility } from '../utils/index.js';

export class GuardGenerator extends BaseGenerator {
  getTemplateName(): string {
    return 'guard';
  }

  getRegistrationType(): 'provider' {
    return 'provider';
  }

  validate(context: GeneratorContext): { valid: boolean; error?: string } {
    return ValidationUtility.validateClassName(context.className!);
  }

  protected generateFilePath(context: GeneratorContext): string {
    const fileName = NamingUtility.classNameToFileName(context.className!);
    return path.join(this.projectRoot, context.path || 'src/guards', fileName);
  }

  protected getGeneratorType(): string {
    return 'Guard';
  }
}
