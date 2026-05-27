import { BadRequestException } from '../exceptions/index.js';

export interface ValidationSchema {
  validate(data: any): Promise<{ error?: any; value?: any }>;
}

export class ValidationPipe {
  constructor(private schema: ValidationSchema) {}

  async transform(value: any): Promise<any> {
    try {
      const result = await this.schema.validate(value);

      if (result.error) {
        throw new BadRequestException(
          `Validation failed: ${result.error.message || 'Invalid data'}`
        );
      }

      return result.value;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Validation error: ${(error as any).message}`);
    }
  }
}

export class JoiValidationPipe extends ValidationPipe {
  constructor(schema: any) {
    super({
      validate: async (data: any) => {
        try {
          const value = await schema.validateAsync(data);
          return { value };
        } catch (error) {
          return { error };
        }
      },
    });
  }
}

export class ZodValidationPipe extends ValidationPipe {
  constructor(schema: any) {
    super({
      validate: async (data: any) => {
        try {
          const value = await schema.parseAsync(data);
          return { value };
        } catch (error) {
          return { error };
        }
      },
    });
  }
}
