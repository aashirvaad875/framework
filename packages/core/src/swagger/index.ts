export { MetadataScanner } from './metadata-scanner.js';
export { DTOSchemaGenerator } from './dto-schema-generator.js';
export { OpenAPIGenerator } from './openapi-generator.js';
export {
  SwaggerModule,
  SwaggerModuleBuilder,
  setGlobalSwaggerModule,
  getGlobalSwaggerModule,
} from './swagger.module.js';
export type {
  RouteMetadata,
  ControllerMetadata,
  SecurityRequirement,
  JSONSchema,
  DTOSchemaMap,
  SwaggerModuleConfig,
  SecurityScheme,
  OpenAPISpec,
  JoiSchema,
  ZodSchema,
} from './types.js';
