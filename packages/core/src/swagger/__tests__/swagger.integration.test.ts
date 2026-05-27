import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import type { OpenAPISpec } from '../types.js';
import { MetadataScanner } from '../metadata-scanner.js';
import { DTOSchemaGenerator } from '../dto-schema-generator.js';
import { OpenAPIGenerator } from '../openapi-generator.js';

describe('Swagger Integration', () => {
  it('should generate valid OpenAPI spec', () => {
    const config = {
      title: 'Test API',
      version: '1.0.0',
      description: 'Test Description',
    };

    const spec = OpenAPIGenerator.buildSpec(config, [], new Map());

    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info.title).toBe('Test API');
    expect(spec.info.version).toBe('1.0.0');
    expect(spec.paths).toEqual({});
  });

  it('should add security schemes to spec', () => {
    const config = {
      title: 'Test API',
      version: '1.0.0',
      securitySchemes: {
        bearerAuth: {
          type: 'http' as const,
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    };

    const spec = OpenAPIGenerator.buildSpec(config, [], new Map());

    expect(spec.components?.securitySchemes).toBeDefined();
    expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
  });

  it('should add servers to spec', () => {
    const config = {
      title: 'Test API',
      version: '1.0.0',
      servers: [
        { url: 'http://localhost:3000', description: 'Local' },
        { url: 'https://api.example.com', description: 'Production' },
      ],
    };

    const spec = OpenAPIGenerator.buildSpec(config, [], new Map());

    expect(spec.servers).toHaveLength(2);
    expect(spec.servers?.[0].url).toBe('http://localhost:3000');
    expect(spec.servers?.[1].description).toBe('Production');
  });

  it('should add contact info to spec', () => {
    const config = {
      title: 'Test API',
      version: '1.0.0',
      contactInfo: {
        name: 'Support',
        email: 'support@example.com',
      },
    };

    const spec = OpenAPIGenerator.buildSpec(config, [], new Map());

    expect(spec.info.contact?.name).toBe('Support');
    expect(spec.info.contact?.email).toBe('support@example.com');
  });

  it('should generate DTO schemas from map', () => {
    const dtoSchemas = new Map([
      [
        'CreateUserDto',
        {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
          },
          required: ['email', 'name'],
        },
      ],
    ]);

    const config = {
      title: 'Test API',
      version: '1.0.0',
    };

    const spec = OpenAPIGenerator.buildSpec(config, [], dtoSchemas);

    expect(spec.components?.schemas?.CreateUserDto).toBeDefined();
    expect(spec.components?.schemas?.CreateUserDto.type).toBe('object');
  });
});
