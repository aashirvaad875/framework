import type {
  OpenAPISpec,
  SwaggerModuleConfig,
  ControllerMetadata,
  DTOSchemaMap,
  JSONSchema,
} from './types.js';

export class OpenAPIGenerator {
  /**
   * Build complete OpenAPI 3.1 specification
   */
  static buildSpec(
    config: SwaggerModuleConfig,
    controllers: ControllerMetadata[],
    dtoSchemas: DTOSchemaMap,
  ): OpenAPISpec {
    const spec: OpenAPISpec = {
      openapi: '3.1.0',
      info: {
        title: config.title,
        version: config.version,
        description: config.description,
      },
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {},
      },
    };

    // Add contact info if provided
    if (config.contactInfo) {
      spec.info.contact = config.contactInfo;
    }

    // Add servers if provided
    if (config.servers && config.servers.length > 0) {
      spec.servers = config.servers;
    }

    // Add security schemes if provided
    if (config.securitySchemes && Object.keys(config.securitySchemes).length > 0) {
      spec.components!.securitySchemes = config.securitySchemes;
    }

    // Add all DTO schemas to components
    for (const [dtoName, dtoSchema] of dtoSchemas) {
      if (spec.components && spec.components.schemas) {
        spec.components.schemas[dtoName] = dtoSchema;
      }
    }

    // Build paths from controllers and routes
    for (const controller of controllers) {
      for (const route of controller.routes) {
        const fullPath = `${controller.controllerPath}${route.path}`;

        if (!spec.paths[fullPath]) {
          spec.paths[fullPath] = {};
        }

        const operation = this.buildOperation(route, controller, dtoSchemas);
        spec.paths[fullPath][route.method.toLowerCase()] = operation;
      }
    }

    return spec;
  }

  /**
   * Build operation object for a single route
   */
  private static buildOperation(
    route: any,
    controller: ControllerMetadata,
    dtoSchemas: DTOSchemaMap,
  ): Record<string, any> {
    const controllerName = (controller.controllerClass as any).name || 'Controller';
    const operation: Record<string, any> = {
      operationId: `${controllerName}_${route.handlerName}`,
      summary: this.generateSummary(route.handlerName),
      parameters: [],
    };

    // Add parameters (@Param, @Query, @Header)
    for (const param of route.parameters) {
      if (param.source === 'body') {
        // Body goes in requestBody, not parameters
        continue;
      }

      operation.parameters.push({
        name: param.name,
        in: param.source === 'param' ? 'path' : param.source,
        required: param.required,
        schema: {
          type: this.getSchemaTypeForFunction(param.type),
        },
      });
    }

    // Add request body if present
    if (route.bodyType) {
      const dtoName = route.bodyType.name;
      operation.requestBody = {
        content: {
          'application/json': {
            schema: dtoSchemas.has(dtoName)
              ? { $ref: `#/components/schemas/${dtoName}` }
              : { type: 'object' },
          },
        },
        required: true,
      };
    }

    // Add responses
    operation.responses = {
      '200': {
        description: 'Success',
        content: route.returnType
          ? {
              'application/json': {
                schema: this.buildResponseSchema(route.returnType, dtoSchemas),
              },
            }
          : {},
      },
      '400': {
        description: 'Bad Request',
      },
      '401': {
        description: 'Unauthorized',
      },
      '500': {
        description: 'Internal Server Error',
      },
    };

    // Add security if required
    if (route.security) {
      operation.security = [
        {
          [route.security.scheme]: route.security.scopes || [],
        },
      ];
    }

    return operation;
  }

  /**
   * Generate response schema reference
   */
  private static buildResponseSchema(
    returnType: Function,
    dtoSchemas: DTOSchemaMap,
  ): JSONSchema {
    const dtoName = (returnType as any).name || 'Object';

    if (dtoSchemas.has(dtoName)) {
      return { $ref: `#/components/schemas/${dtoName}` };
    }

    // Fallback to basic type inference
    return {
      type: this.getSchemaTypeForFunction(returnType),
    };
  }

  /**
   * Map TypeScript function/constructor to JSON Schema type
   */
  private static getSchemaTypeForFunction(fn: Function): string {
    const name = (fn as any)?.name || '';
    const typeMap: Record<string, string> = {
      'String': 'string',
      'Number': 'number',
      'Boolean': 'boolean',
      'Array': 'array',
      'Date': 'string',
      'Object': 'object',
    };

    return typeMap[name] || 'object';
  }

  /**
   * Generate human-readable summary from method name
   * e.g., "createUser" -> "Create user"
   */
  private static generateSummary(methodName: string): string {
    // Convert camelCase to Title Case with spaces
    const withSpaces = methodName
      .replace(/([A-Z])/g, ' $1')
      .trim();

    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
  }
}
