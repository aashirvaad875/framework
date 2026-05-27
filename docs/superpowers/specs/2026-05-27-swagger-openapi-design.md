# Swagger/OpenAPI 3.1 Generation System Design

## Overview

An automatic OpenAPI 3.1 specification generator that extracts documentation from decorator metadata in HTTP controllers and data transfer objects (DTOs). The system requires zero manual configuration for basic documentation while supporting optional decorators for enhanced API documentation.

**Goal:** Provide automatic, accurate OpenAPI 3.1 specifications for all framework REST APIs with no extra registration burden on developers.

**Architecture:** Decorator-centric metadata extraction from module tree → metadata scanning → DTO schema generation → OpenAPI spec assembly → file output and optional Swagger UI serving.

**Tech Stack:** TypeScript, OpenAPI 3.1 specification, Joi/Zod schema introspection, JSON Schema generation, DI module pattern with fluent builders.

---

## Design Goals

1. **Zero Configuration for Basics** — All routes, parameters, and response types auto-documented from existing decorators
2. **Hybrid Approach** — Automatic coverage + optional enhancement decorators (@ApiOperation, @ApiResponse, etc.)
3. **DTO Schema Generation** — JSON schemas derived from Joi/Zod validation or TypeScript type introspection
4. **Security Documentation** — @AuthRequired and @Permissions decorators converted to OpenAPI security requirements
5. **Production Ready** — Specification suitable for Swagger UI, ReDoc, API gateways, contract testing, and CI/CD validation

---

## Architecture

### Component Responsibilities

#### 1. MetadataScanner

**Purpose:** Walk the module tree, find @Controller classes, and extract route metadata from HTTP method decorators, parameter decorators, and security decorators.

**Input:** Application instance and modules registry
**Output:** RoutesMetadata array containing all routes with paths, methods, parameters, and security requirements
**Dependencies:** HTTP decorator metadata system (@Get, @Post, @Put, @Delete, @Patch, @Body, @Param, @Query, @Header, @AuthRequired, @Permissions)

**Responsibilities:**
- Walk module tree recursively (including lazy-loaded modules if available)
- Identify @Controller classes and their routes
- Extract method names, HTTP verbs, and route paths from decorators
- Extract parameter metadata: source (@Body, @Param, @Query, @Header), names, types
- Extract security requirements from @AuthRequired and @Permissions decorators
- Build RoutesMetadata array with all extracted information

#### 2. DTOSchemaGenerator

**Purpose:** Convert DTOs to JSON Schema format suitable for OpenAPI documentation.

**Input:** All DTO classes referenced in routes
**Output:** Map of DTO class name → JSON Schema object
**Dependencies:** Joi validation schemas, Zod validation schemas, TypeScript type introspection

**Responsibilities:**
- Detect DTO classes from type information in parameters and responses
- For each DTO:
  - If Joi schema exists: convert Joi schema to JSON Schema
  - Else if Zod schema exists: convert Zod schema to JSON Schema
  - Else: introspect TypeScript type (interface/class) and generate JSON Schema from type annotations
- Handle nested DTOs recursively
- Generate required fields list from schema definitions
- Map $refs for component reuse in OpenAPI spec

#### 3. OpenAPIGenerator

**Purpose:** Orchestrate the assembly of complete OpenAPI 3.1 specification document.

**Input:** RoutesMetadata array, DTOSchemaMap, SwaggerModuleConfig (title, version, servers, security schemes, contact, etc.)
**Output:** Complete OpenAPI 3.1 JSON object
**Dependencies:** MetadataScanner, DTOSchemaGenerator

**Responsibilities:**
- Build OpenAPI info object from config (title, version, description, contact, license)
- Define servers from config
- Define security schemes from config (e.g., bearerAuth, apiKey)
- Build paths object: for each route, create path item with operation for HTTP method
- For each parameter: add to parameters array with name, in (query/path/header), schema, required flag
- For each @Body: add requestBody with schema reference or inline schema
- For each response: add response with description and schema reference
- Add securityRequirement to operation if @AuthRequired/@Permissions present
- Build components object with all DTOSchemas under schemas/
- Validate generated spec structure
- Return complete OpenAPI 3.1 object

#### 4. SwaggerModule

**Purpose:** Provide DI integration and fluent configuration API for swagger system.

**Input:** SwaggerModuleBuilder configuration calls
**Output:** Initialized module with generation and serving capabilities
**Dependencies:** MetadataScanner, DTOSchemaGenerator, OpenAPIGenerator, DI container

**Responsibilities:**
- Expose SwaggerModuleBuilder with fluent API (setTitle, setVersion, setServers, setSecurityScheme, setContactInfo, etc.)
- Store configuration in module state
- On initialize(): scan metadata, generate schema map, build OpenAPI spec
- Provide generateAndSave(filePath) method to write spec to JSON file
- Optionally provide serveSwaggerUI(port, path) to run Express with Swagger UI serving generated spec
- Follow framework's module lifecycle pattern (initialize, shutdown)

---

## Data Flow

```
1. Application Bootstrap
   ↓
2. Modules Loaded → DI Container Registered
   ↓
3. SwaggerModule.initialize()
   ├→ MetadataScanner.scan(modules)
   │  └→ Find all @Controller classes
   │     Extract @Get/@Post/@Put/@Delete/@Patch routes
   │     Extract @Body/@Param/@Query/@Header parameters
   │     Extract @AuthRequired/@Permissions security
   │     Return RoutesMetadata[]
   │
   ├→ DTOSchemaGenerator.generateSchemas(referencedDTOs)
   │  └→ For each DTO:
   │     Check for Joi/Zod schema
   │     Convert to JSON Schema
   │     Handle nested references
   │     Return DTOSchemaMap
   │
   └→ OpenAPIGenerator.build(routesMetadata, dtoSchemaMap, config)
      └→ Build complete OpenAPI 3.1 spec
         Add paths, parameters, schemas, security
         Return OpenAPI JSON object
   
4. SwaggerModule.generateAndSave(filePath)
   └→ Write OpenAPI JSON to file
      (Suitable for Swagger UI, ReDoc, CI/CD, etc.)
```

---

## Decorator Support

### Automatic (Included in Scanning)

These decorators are always scanned and included in documentation:

| Decorator | Usage | OpenAPI Mapping |
|-----------|-------|-----------------|
| `@Get(path)` | HTTP GET route | path + method |
| `@Post(path)` | HTTP POST route | path + method |
| `@Put(path)` | HTTP PUT route | path + method |
| `@Delete(path)` | HTTP DELETE route | path + method |
| `@Patch(path)` | HTTP PATCH route | path + method |
| `@Body()` | Request body parameter | requestBody |
| `@Param(name)` | Path parameter | parameters[in:path] |
| `@Query(name)` | Query string parameter | parameters[in:query] |
| `@Header(name)` | HTTP header parameter | parameters[in:header] |
| `@AuthRequired()` | Requires authentication | security requirement |
| `@Permissions(...)` | Requires specific permissions | security requirement with scopes |

### Optional (For Enhanced Documentation)

These decorators provide additional details when used:

| Decorator | Purpose | Effect |
|-----------|---------|--------|
| `@ApiOperation(summary, description)` | Override operation summary/description | Sets operationId, summary, description |
| `@ApiResponse(status, type, description)` | Document specific response | Add response object with status code |
| `@ApiParam(name, description, example)` | Enhanced parameter documentation | Add description and example to parameter |

**Progressive Enhancement:** Basic routes work without these decorators. Use them to provide additional context.

---

## Configuration Example

```typescript
import { SwaggerModuleBuilder } from '@framework/core';

const swaggerModule = new SwaggerModuleBuilder()
  .setTitle('My API')
  .setVersion('1.0.0')
  .setDescription('Enterprise REST API with automatic OpenAPI documentation')
  .setContactInfo({
    name: 'API Support',
    email: 'support@example.com',
    url: 'https://docs.example.com',
  })
  .setServers([
    { url: 'http://localhost:3000', description: 'Local development' },
    { url: 'https://api.example.com', description: 'Production' },
  ])
  .setSecurityScheme('bearerAuth', {
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

await swaggerModule.initialize();
await swaggerModule.generateAndSave('./openapi.json');

// Optional: Serve Swagger UI
// await swaggerModule.serveSwaggerUI(8080, '/docs');
```

---

## Example Output

Given this controller:

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

Generated OpenAPI includes:

```json
{
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
          }
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
            "schema": { "$ref": "#/components/schemas/UserResponseDto" }
          }
        }
      },
      "delete": {
        "operationId": "UserController_deleteUser",
        "security": [{ "bearerAuth": ["users:delete"] }],
        "parameters": [...],
        "responses": [...]
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
          "age": { "type": "integer" }
        },
        "required": ["email", "name"]
      },
      "UserResponseDto": { ... }
    }
  }
}
```

---

## DTO Schema Generation Strategy

### Priority Order

1. **Joi Schema First** — If `export const XyzSchema = Joi.object({...})` exists, use it
2. **Zod Schema Second** — If `export const XyzSchema = z.object({...})` exists, use it
3. **TypeScript Introspection** — If no schema, introspect TypeScript type annotations

### Implementation Details

**Joi → JSON Schema Conversion:**
- `Joi.string()` → `{ type: "string" }`
- `Joi.string().email()` → `{ type: "string", format: "email" }`
- `Joi.number().required()` → `{ type: "number" }` (required tracked separately)
- `Joi.array().items(Joi.object(...))` → `{ type: "array", items: {...} }`
- Custom error messages ignored; focus on type/format

**Zod → JSON Schema Conversion:**
- `z.string()` → `{ type: "string" }`
- `z.string().email()` → `{ type: "string", format: "email" }`
- `z.object({...})` → `{ type: "object", properties: {...} }`
- `.optional()` excluded from required array
- `.describe()` captured as description

**TypeScript Introspection:**
- Reflect on type annotations using `design:paramtypes` and `design:returntype`
- Generate JSON Schema from interfaces/classes
- Infer types: string, number, boolean, array, object
- Handle optional properties via `?` syntax
- Nested types generate `$ref` references

---

## Security and Authentication Documentation

### @AuthRequired Decorator

Routes marked with `@AuthRequired()` automatically include security requirement:

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

### @Permissions Decorator

Routes marked with `@Permissions('scope1', 'scope2')` include scopes in security requirement:

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

### Security Scheme Definition

Configure in SwaggerModuleBuilder:

```typescript
.setSecurityScheme('bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'JWT access token in Authorization header',
})
```

Results in OpenAPI components:

```json
{
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT access token in Authorization header"
      }
    }
  }
}
```

---

## Integration Points

### With HTTP Engine

- Reads existing @Get, @Post, @Put, @Delete, @Patch decorators
- Reads existing @Body, @Param, @Query, @Header decorators
- Reads existing @AuthRequired, @Permissions decorators
- No changes to HTTP engine required

### With DI Container

- SwaggerModule registered via DI system
- Can access resolved controllers if needed for advanced scanning
- Lifecycle hooks (initialize, shutdown) aligned with framework pattern

### With Validation System

- DTOSchemaGenerator reads Joi/Zod schemas from DTO exports
- Integrates with existing validation infrastructure
- No new validation registration required

---

## File Structure

### New Files (8 total)

**Core Implementation (4 files):**
- `packages/core/src/swagger/types.ts` — Type definitions
- `packages/core/src/swagger/metadata-scanner.ts` — Route metadata extraction
- `packages/core/src/swagger/dto-schema-generator.ts` — DTO to JSON Schema conversion
- `packages/core/src/swagger/openapi-generator.ts` — OpenAPI spec assembly

**Integration (2 files):**
- `packages/core/src/swagger/swagger.module.ts` — DI module and SwaggerModuleBuilder
- `packages/core/src/swagger/index.ts` — Barrel exports

**Documentation & Examples (2 files):**
- `docs/SWAGGER.md` — Complete user guide (400-500 lines)
- `examples/swagger-example.ts` — Working example demonstrating all features

### Modified Files (1 file)

- `packages/core/src/index.ts` — Add `export * from './swagger/index.js';`

---

## Type Definitions

### Core Types

```typescript
// Metadata extracted from route decorators
interface RoutesMetadata {
  controllerClass: Function;
  controllerPath: string;
  routes: RouteMetadata[];
}

interface RouteMetadata {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handlerName: string;
  parameters: ParameterMetadata[];
  bodyType?: Function;
  returnType?: Function;
  security?: SecurityRequirement;
}

interface ParameterMetadata {
  name: string;
  source: 'path' | 'query' | 'header' | 'body';
  type: Function;
  required: boolean;
}

interface SecurityRequirement {
  scheme: string;
  scopes?: string[];
}

// DTO to JSON Schema map
type DTOSchemaMap = Map<string, JSONSchema>;

// OpenAPI configuration
interface SwaggerModuleConfig {
  title: string;
  version: string;
  description?: string;
  contactInfo?: { name?: string; email?: string; url?: string };
  servers?: Array<{ url: string; description?: string }>;
  securitySchemes?: Record<string, SecurityScheme>;
}

interface SecurityScheme {
  type: 'http' | 'apiKey' | 'oauth2';
  scheme?: string;
  bearerFormat?: string;
  in?: 'header' | 'query' | 'cookie';
  name?: string;
  description?: string;
}
```

---

## Verification & Testing

### Build Verification
- TypeScript compilation succeeds for all 4 core files + swagger module
- No circular imports
- All exports properly typed

### Runtime Verification
- MetadataScanner correctly identifies all @Controller classes
- DTOSchemaGenerator generates valid JSON Schemas for all DTO types
- OpenAPIGenerator produces valid OpenAPI 3.1 JSON
- Generated spec passable by standard OpenAPI validators
- Swagger UI and ReDoc can render generated spec without errors

### Example Test Scenarios
1. **Basic Route** — @Get with no parameters generates correct OpenAPI path
2. **Parameter Injection** — @Param, @Query, @Body correctly mapped to parameters
3. **DTO Validation** — Joi/Zod schemas converted to required fields + format
4. **Security** — @AuthRequired/@Permissions correctly added to security requirement
5. **Nested DTO** — Nested object properties generate $ref correctly
6. **Optional Decorator** — @ApiOperation provides summary/description override

---

## Production Readiness

✅ **Accuracy** — Documentation source is live decorators, always in sync with code
✅ **Zero Configuration** — Automatic for all standard patterns
✅ **Extensibility** — Optional decorators for custom documentation
✅ **Compatibility** — Generated spec usable by Swagger UI, ReDoc, API gateways
✅ **Maintainability** — Single source of truth (decorators), no manual spec updates
✅ **Scalability** — Handles large APIs with many routes and nested DTOs

---

## Summary

The Swagger/OpenAPI generation system automatically documents REST APIs by extracting metadata from existing framework decorators. It requires no additional registration or configuration beyond standard controller and DTO definitions. The system provides accurate, production-ready OpenAPI 3.1 specifications suitable for documentation, API gateways, and contract testing tools.

**Scope:** 8 new files, 1 modified file
**Dependencies:** No new external packages required (uses existing Joi/Zod, TypeScript reflection)
**Implementation Time:** 15-20 bite-sized tasks
**Production Ready:** Yes, on completion
