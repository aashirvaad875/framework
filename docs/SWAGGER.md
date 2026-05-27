# Swagger/OpenAPI 3.1 Generation

Automatic OpenAPI 3.1 specification generation from framework decorators with zero configuration for basic documentation and optional enhancement decorators.

## Overview

The Swagger system automatically generates production-ready OpenAPI 3.1 specifications from your controller and DTO definitions. No extra registration or configuration needed — document your routes using existing decorators.

## Quick Start

### 1. Basic Configuration

```typescript
import { SwaggerModuleBuilder } from '@framework/core';

const swaggerModule = new SwaggerModuleBuilder()
  .setTitle('My API')
  .setVersion('1.0.0')
  .setDescription('Enterprise REST API')
  .build();

await swaggerModule.initialize();
await swaggerModule.generateAndSave('./openapi.json');
```

### 2. What Gets Documented Automatically

All of these decorators are automatically scanned and included:

- **Routes:** @Get, @Post, @Put, @Delete, @Patch
- **Parameters:** @Body, @Param, @Query, @Header
- **Security:** @AuthRequired, @Permissions

Example:

```typescript
@Controller('/users')
export class UserController {
  @Post()
  @AuthRequired()
  @UsePipe(new JoiValidationPipe(CreateUserJoiSchema))
  async createUser(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(dto);
  }

  @Get('/:id')
  async getUser(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findById(id);
  }

  @Delete('/:id')
  @Permissions('users:delete')
  async deleteUser(@Param('id') id: string): Promise<void> {
    await this.userService.delete(id);
  }
}
```

This automatically generates OpenAPI documentation for:
- POST /users (with authentication requirement, request body schema, response schema)
- GET /users/:id (with path parameter)
- DELETE /users/:id (with permission requirement)

## Configuration

### FluentBuilder API

```typescript
const swaggerModule = new SwaggerModuleBuilder()
  .setTitle('My API')                          // Required
  .setVersion('1.0.0')                         // Required
  .setDescription('API description')           // Optional
  .setContactInfo({                            // Optional
    name: 'API Support',
    email: 'support@example.com',
    url: 'https://docs.example.com',
  })
  .setServers([                                // Optional
    { url: 'http://localhost:3000', description: 'Local development' },
    { url: 'https://api.example.com', description: 'Production' },
  ])
  .setSecurityScheme('bearerAuth', {          // Optional, define security schemes
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT access token',
  })
  .setSecurityScheme('apiKey', {
    type: 'apiKey',
    in: 'header',
    name: 'X-API-Key',
    description: 'API key for service integration',
  })
  .build();
```

### Generation and Output

```typescript
// Generate and save to file
await swaggerModule.generateAndSave('./openapi.json');

// Get the spec object (for serving or further processing)
const spec = swaggerModule.generateSpec();

// Return spec from API endpoint
@Get('/swagger.json')
async getSwaggerSpec() {
  return swaggerModule.generateSpec();
}
```

## DTO Schema Generation

The system automatically converts DTOs to JSON schemas using this priority order:

### 1. Joi Schemas (First Priority)

If you export a Joi schema alongside your DTO:

```typescript
// src/modules/users/dto/create-user.dto.ts
export class CreateUserDto {
  email!: string;
  name!: string;
  age?: number;
}

export const CreateUserJoiSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  age: Joi.number().optional().min(0).max(150),
});
```

The Joi schema is converted to:

```json
{
  "type": "object",
  "properties": {
    "email": { "type": "string", "format": "email" },
    "name": { "type": "string" },
    "age": { "type": "number" }
  },
  "required": ["email", "name"]
}
```

### 2. Zod Schemas (Second Priority)

Or use Zod:

```typescript
export class CreateUserDto {
  email!: string;
  name!: string;
  age?: number;
}

export const CreateUserZodSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  age: z.number().int().min(0).max(150).optional(),
});
```

### 3. TypeScript Introspection (Fallback)

If no validation schema is found, the system introspects TypeScript types:

```typescript
export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string;
  createdAt!: Date;
}
```

Generates:

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "email": { "type": "string" },
    "name": { "type": "string" },
    "createdAt": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "email", "name", "createdAt"]
}
```

## Authentication & Permissions

### @AuthRequired Decorator

Routes marked with @AuthRequired automatically document the security requirement:

```typescript
@Get('/protected')
@AuthRequired()
async protectedRoute() {
  return { data: 'secret' };
}
```

Generated OpenAPI:

```json
{
  "security": [{ "bearerAuth": [] }]
}
```

Requires configuring the security scheme:

```typescript
.setSecurityScheme('bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
})
```

### @Permissions Decorator

Routes can document required permissions:

```typescript
@Delete('/:id')
@Permissions('users:delete', 'admin')
async deleteUser(@Param('id') id: string) {
  // ...
}
```

Generated OpenAPI:

```json
{
  "security": [{ "bearerAuth": ["users:delete", "admin"] }]
}
```

## Example Generated Spec

Given the controllers and DTOs above, the generated `openapi.json` includes:

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "My API",
    "version": "1.0.0",
    "description": "Enterprise REST API"
  },
  "servers": [
    { "url": "http://localhost:3000", "description": "Local development" }
  ],
  "paths": {
    "/users": {
      "post": {
        "operationId": "UserController_createUser",
        "summary": "Create user",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/CreateUserDto" }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/UserResponseDto" }
              }
            }
          }
        },
        "security": [{ "bearerAuth": [] }]
      }
    },
    "/users/{id}": {
      "get": {
        "operationId": "UserController_getUser",
        "summary": "Get user",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/UserResponseDto" }
              }
            }
          }
        }
      },
      "delete": {
        "operationId": "UserController_deleteUser",
        "summary": "Delete user",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "security": [{ "bearerAuth": ["users:delete", "admin"] }]
      }
    }
  },
  "components": {
    "schemas": {
      "CreateUserDto": {
        "type": "object",
        "properties": {
          "email": { "type": "string", "format": "email" },
          "name": { "type": "string" },
          "age": { "type": "number" }
        },
        "required": ["email", "name"]
      },
      "UserResponseDto": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "email": { "type": "string" },
          "name": { "type": "string" },
          "createdAt": { "type": "string" }
        },
        "required": ["id", "email", "name", "createdAt"]
      }
    },
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  }
}
```

## Using Generated Specs

### Swagger UI

Use with Swagger UI to render interactive documentation:

```html
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui-bundle.js"></script>
<script>
  SwaggerUIBundle({
    url: '/swagger.json',
    dom_id: '#swagger-ui',
  });
</script>
```

### ReDoc

Or use ReDoc for alternative documentation:

```html
<script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
<redoc spec-url='/swagger.json'></redoc>
```

### API Gateways

The spec is suitable for API gateways, CI/CD validation, and contract testing tools.

### Programmatic Access

```typescript
@Get('/api-spec')
async getApiSpec() {
  const swaggerModule = getGlobalSwaggerModule();
  return swaggerModule?.generateSpec();
}
```

## API Reference

### SwaggerModuleBuilder

```typescript
new SwaggerModuleBuilder()
  .setTitle(string) → this
  .setVersion(string) → this
  .setDescription(string) → this
  .setContactInfo(object) → this
  .setServers(array) → this
  .setSecurityScheme(name, config) → this
  .build() → EventsModule
```

### EventsModule

```typescript
async initialize(): Promise<void>
async shutdown(): Promise<void>
async generateAndSave(filePath: string): Promise<void>
generateSpec(): OpenAPISpec
generateSpecWithData(controllers, dtoClasses): OpenAPISpec
```

### MetadataScanner

```typescript
static scanControllers(modules: any[]): ControllerMetadata[]
```

### DTOSchemaGenerator

```typescript
static generateSchemas(dtoClasses: Function[]): DTOSchemaMap
```

### OpenAPIGenerator

```typescript
static buildSpec(
  config: SwaggerModuleConfig,
  controllers: ControllerMetadata[],
  dtoSchemas: DTOSchemaMap
): OpenAPISpec
```

## Best Practices

1. **Always define Joi or Zod schemas** alongside DTOs for accurate API documentation
2. **Use @AuthRequired consistently** for all protected routes
3. **Include description in @ApiOperation** for enhanced documentation
4. **Serve spec from your API** (e.g., GET /swagger.json or GET /api-spec)
5. **Validate generated spec** with standard OpenAPI validators
6. **Update spec on deployment** by regenerating it as part of CI/CD

## Troubleshooting

**Q: Schema not being detected**
A: Ensure Joi/Zod schema is exported from the same file as the DTO class, using standard naming (e.g., `CreateUserJoiSchema` or `CreateUserZodSchema`).

**Q: Parameter types showing as 'object'**
A: Add a Joi or Zod schema to get accurate type information, or use TypeScript type annotations.

**Q: Security not showing in spec**
A: Ensure `@AuthRequired()` decorator is used and `bearerAuth` security scheme is configured via `.setSecurityScheme()`.

**Q: DTOs not appearing in schema components**
A: Ensure DTOs are referenced from route responses or request bodies.
