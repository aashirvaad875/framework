import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SwaggerModuleConfig, OpenAPISpec } from './types.js';
import { MetadataScanner } from './metadata-scanner.js';
import { DTOSchemaGenerator } from './dto-schema-generator.js';
import { OpenAPIGenerator } from './openapi-generator.js';

interface Module {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export class SwaggerModule implements Module {
  private config: SwaggerModuleConfig;

  constructor(config: SwaggerModuleConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Module initialization - no async work needed
  }

  async shutdown(): Promise<void> {
    // Cleanup if needed
  }

  /**
   * Generate OpenAPI spec and save to file
   */
  async generateAndSave(filePath: string): Promise<void> {
    const spec = this.generateSpec();

    // Create directory if needed
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Write spec to file
    writeFileSync(filePath, JSON.stringify(spec, null, 2), 'utf-8');
  }

  /**
   * Generate OpenAPI spec object
   */
  generateSpec(): OpenAPISpec {
    // This would need to be called with actual modules/controllers
    // For now, return basic structure
    return {
      openapi: '3.1.0',
      info: {
        title: this.config.title,
        version: this.config.version,
        description: this.config.description,
      },
      paths: {},
    };
  }

  /**
   * Generate spec with controllers and DTOs
   */
  generateSpecWithData(
    controllers: any[],
    dtoClasses: Function[],
  ): OpenAPISpec {
    const dtoSchemas = DTOSchemaGenerator.generateSchemas(dtoClasses);
    return OpenAPIGenerator.buildSpec(this.config, controllers, dtoSchemas);
  }
}

/**
 * Fluent builder for SwaggerModule configuration
 */
export class SwaggerModuleBuilder {
  private config: SwaggerModuleConfig;

  constructor() {
    this.config = {
      title: 'API',
      version: '1.0.0',
      securitySchemes: {},
    };
  }

  setTitle(title: string): this {
    this.config.title = title;
    return this;
  }

  setVersion(version: string): this {
    this.config.version = version;
    return this;
  }

  setDescription(description: string): this {
    this.config.description = description;
    return this;
  }

  setContactInfo(contactInfo: {
    name?: string;
    email?: string;
    url?: string;
  }): this {
    this.config.contactInfo = contactInfo;
    return this;
  }

  setServers(
    servers: Array<{
      url: string;
      description?: string;
    }>,
  ): this {
    this.config.servers = servers;
    return this;
  }

  setSecurityScheme(
    name: string,
    scheme: {
      type: 'http' | 'apiKey' | 'oauth2';
      scheme?: string;
      bearerFormat?: string;
      in?: 'header' | 'query' | 'cookie';
      name?: string;
      description?: string;
    },
  ): this {
    if (!this.config.securitySchemes) {
      this.config.securitySchemes = {};
    }
    this.config.securitySchemes[name] = scheme;
    return this;
  }

  build(): SwaggerModule {
    return new SwaggerModule(this.config);
  }
}

// Global module instance
let globalSwaggerModule: SwaggerModule | undefined;

export function setGlobalSwaggerModule(module: SwaggerModule): void {
  globalSwaggerModule = module;
}

export function getGlobalSwaggerModule(): SwaggerModule | undefined {
  return globalSwaggerModule;
}
