import type { JSONSchema, DTOSchemaMap, JoiSchema, ZodSchema } from './types.js';

export class DTOSchemaGenerator {
  /**
   * Generate JSON schemas for all referenced DTOs
   */
  static generateSchemas(dtoClasses: Function[]): DTOSchemaMap {
    const schemaMap: DTOSchemaMap = new Map();

    for (const dtoClass of dtoClasses) {
      const className = dtoClass.name;
      const schema = this.generateSchemaForDTO(dtoClass);
      schemaMap.set(className, schema);
    }

    return schemaMap;
  }

  /**
   * Generate schema for a single DTO class
   * Priority: Joi schema > Zod schema > TypeScript introspection
   */
  private static generateSchemaForDTO(dtoClass: Function): JSONSchema {
    // Try to find Joi schema (named as <Class>JoiSchema or <Class>Schema)
    const joiSchema = this.findJoiSchema(dtoClass);
    if (joiSchema) {
      return this.convertJoiToJsonSchema(joiSchema);
    }

    // Try to find Zod schema (named as <Class>ZodSchema or <Class>Schema)
    const zodSchema = this.findZodSchema(dtoClass);
    if (zodSchema) {
      return this.convertZodToJsonSchema(zodSchema);
    }

    // Fall back to TypeScript introspection
    return this.introspectTypeScriptType(dtoClass);
  }

  /**
   * Find Joi schema exported from module
   */
  private static findJoiSchema(dtoClass: Function): any {
    // Get the module where this class is defined
    const moduleName = dtoClass.name;

    // Try common naming patterns
    const patterns = [
      `${moduleName}JoiSchema`,
      `${moduleName}Schema`,
    ];

    // This would need to be integrated with actual module system
    // For now, return undefined - will be enhanced with full module scanning
    return undefined;
  }

  /**
   * Find Zod schema exported from module
   */
  private static findZodSchema(dtoClass: Function): any {
    // Similar to findJoiSchema, check for Zod schema exports
    return undefined;
  }

  /**
   * Convert Joi schema to JSON Schema
   */
  private static convertJoiToJsonSchema(joiSchema: JoiSchema): JSONSchema {
    const description = joiSchema.describe();
    const schema: JSONSchema = {
      type: this.mapJoiType(description.type),
    };

    // Handle required fields
    if (description.flags?.presence === 'required') {
      schema.type = 'string'; // Will be overridden by actual type
    }

    // Handle rules (e.g., string().email())
    if (description.rules) {
      for (const rule of description.rules) {
        if (rule.name === 'email') {
          schema.format = 'email';
        } else if (rule.name === 'min') {
          schema.minimum = rule.args?.limit;
        } else if (rule.name === 'max') {
          schema.maximum = rule.args?.limit;
        }
      }
    }

    // Handle object properties
    if (description.keys) {
      schema.properties = {};
      schema.required = [];

      for (const [key, keySchema] of Object.entries(description.keys)) {
        const keyDesc = (keySchema as JoiSchema).describe();
        schema.properties[key] = {
          type: this.mapJoiType(keyDesc.type),
        };

        if (keyDesc.flags?.presence === 'required') {
          schema.required!.push(key);
        }
      }
    }

    // Handle arrays
    if (description.items) {
      schema.items = {
        type: this.mapJoiType(description.items[0]?.describe?.().type || 'object'),
      };
    }

    return schema;
  }

  /**
   * Convert Zod schema to JSON Schema
   */
  private static convertZodToJsonSchema(zodSchema: ZodSchema): JSONSchema {
    const def = zodSchema._def;
    const schema: JSONSchema = {};

    // Map Zod type names to JSON Schema types
    const typeMap: Record<string, string> = {
      'ZodString': 'string',
      'ZodNumber': 'number',
      'ZodBoolean': 'boolean',
      'ZodArray': 'array',
      'ZodObject': 'object',
    };

    schema.type = typeMap[def.typeName] || 'object';

    // Handle object properties
    if (def.shape) {
      schema.properties = {};
      schema.required = [];

      for (const [key, fieldSchema] of Object.entries(def.shape)) {
        const fieldDef = (fieldSchema as ZodSchema)._def;
        const fieldTypeMap: Record<string, string> = {
          'ZodString': 'string',
          'ZodNumber': 'number',
          'ZodBoolean': 'boolean',
        };

        schema.properties[key] = {
          type: fieldTypeMap[fieldDef.typeName] || 'object',
        };

        // If not optional, add to required
        if (fieldDef.typeName !== 'ZodOptional') {
          schema.required!.push(key);
        }
      }
    }

    // Handle arrays
    if (def.items) {
      const itemDef = (def.items as ZodSchema)._def;
      const itemTypeMap: Record<string, string> = {
        'ZodString': 'string',
        'ZodNumber': 'number',
      };
      schema.items = {
        type: itemTypeMap[itemDef.typeName] || 'object',
      };
    }

    return schema;
  }

  /**
   * Introspect TypeScript type and generate JSON Schema
   */
  private static introspectTypeScriptType(dtoClass: Function): JSONSchema {
    // Basic TypeScript introspection
    const schema: JSONSchema = {
      type: 'object',
      properties: {},
      required: [],
    };

    // Get constructor parameter types
    const paramTypes: Function[] = Reflect.getMetadata('design:paramtypes', dtoClass) || [];

    // Get property types from class prototype
    const prototype = Object.getPrototypeOf(new (dtoClass as any)());
    const propertyNames = Object.getOwnPropertyNames(prototype);

    for (const propName of propertyNames) {
      if (propName === 'constructor') continue;

      const propertyType = Reflect.getMetadata('design:type', prototype, propName);
      if (!propertyType) continue;

      const typeName = propertyType.name;
      const jsonType = this.mapTypeScriptType(typeName);

      if (schema.properties) {
        schema.properties[propName] = { type: jsonType };
      }

      // Assume all properties are required by default (can be refined)
      if (schema.required && !propName.endsWith('?')) {
        schema.required.push(propName);
      }
    }

    return schema;
  }

  /**
   * Map Joi type name to JSON Schema type
   */
  private static mapJoiType(joiType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'date': 'string',
      'array': 'array',
      'object': 'object',
      'binary': 'string',
      'any': 'string',
    };
    return typeMap[joiType] || 'string';
  }

  /**
   * Map TypeScript type name to JSON Schema type
   */
  private static mapTypeScriptType(tsType: string): string {
    const typeMap: Record<string, string> = {
      'String': 'string',
      'Number': 'number',
      'Boolean': 'boolean',
      'Array': 'array',
      'Object': 'object',
      'Date': 'string',
    };
    return typeMap[tsType] || 'string';
  }
}
