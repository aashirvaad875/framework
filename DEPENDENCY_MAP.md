# Framework Dependency Map

## Package Dependencies

### Core Runtime Dependencies

```
express@^4.18.2
  └─ HTTP server framework
  └─ Used by: Application class, routing

reflect-metadata@^0.1.13
  └─ Enables decorators and metadata reflection
  └─ Used by: All decorator-based features

tsyringe@^4.8.0
  └─ Lightweight DI/IoC container
  └─ Used by: ServiceContainer, dependency resolution

typeorm@^0.3.16
  └─ Object-relational mapping and migrations
  └─ Dependencies: pg, reflect-metadata
  └─ Used by: Entities, repositories, database layer

joi@^17.10.0
  └─ Schema validation library
  └─ Used by: JoiValidationPipe, DTO validation

zod@^3.22.4
  └─ TypeScript-first schema validation
  └─ Used by: Alternative validation pipe (ZodValidationPipe)

winston@^3.10.0
  └─ Structured logging library
  └─ Used by: Logger class, application logging

pg@^8.11.2
  └─ PostgreSQL client
  └─ Used by: TypeORM database connection

dotenv@^16.3.1
  └─ Environment variable loader
  └─ Used by: Config initialization

cors@^2.8.5
  └─ CORS middleware
  └─ Used by: Application middleware setup
```

## Internal Module Dependencies

```
main.ts (Entry Point)
  ├─ src/core/application.ts
  │  ├─ src/core/module.ts
  │  │  ├─ src/core/container.ts
  │  │  └─ src/core/decorators/index.ts
  │  ├─ src/core/decorators/index.ts
  │  └─ src/common/logger.ts
  │
  ├─ src/core/database.ts
  │  ├─ src/common/logger.ts
  │  └─ typeorm (DataSource)
  │
  ├─ src/config/database.config.ts
  │  └─ src/modules/users/entities/user.entity.ts
  │
  ├─ src/config/app.config.ts
  │  └─ dotenv
  │
  ├─ src/modules/users/user.module.ts
  │  ├─ src/modules/users/controllers/user.controller.ts
  │  │  ├─ src/core/decorators/index.ts
  │  │  ├─ src/modules/users/services/user.service.ts
  │  │  └─ src/modules/users/dtos/create-user.dto.ts
  │  │
  │  ├─ src/modules/users/services/user.service.ts
  │  │  ├─ src/core/decorators/index.ts
  │  │  ├─ src/modules/users/repositories/user.repository.ts
  │  │  ├─ src/core/exceptions/index.ts
  │  │  └─ src/common/logger.ts
  │  │
  │  └─ src/modules/users/repositories/user.repository.ts
  │     ├─ typeorm
  │     ├─ src/modules/users/entities/user.entity.ts
  │     ├─ src/core/database.ts
  │     └─ src/core/exceptions/index.ts
  │
  └─ src/common/error-handler.ts
     ├─ src/core/exceptions/index.ts
     └─ src/common/logger.ts
```

## Module-Level Dependencies

### Users Module
```
UserModule
├─ Imports: [] (no external module imports)
├─ Controllers: [UserController]
├─ Providers: [UserService, UserRepository]
└─ Exports: [UserService]

UserController
├─ Depends on: UserService
├─ Uses decorators: @Controller, @Get, @Post, @Put, @Delete
└─ Validation: JoiValidationPipe

UserService
├─ Depends on: UserRepository
├─ Provides: Business logic for user operations
└─ Error handling: ConflictException, NotFoundException

UserRepository
├─ Depends on: UserEntity, TypeORM DataSource
├─ Provides: Data access abstraction
└─ Database: PostgreSQL via TypeORM

UserEntity
├─ Depends on: TypeORM decorators
├─ Represents: users table in database
└─ Relationships: None (basic example)
```

## Dependency Flow for Request Handling

```
HTTP Request
    ↓
Express Router (matches route from @Get/@Post)
    ↓
UserController.method()
    ↓
JoiValidationPipe.transform() ← joi
    ↓
UserService.method()
    ↓
UserRepository.method()
    ↓
TypeORM Query ← typeorm, pg
    ↓
Database (PostgreSQL)
    ↓
Response Builder
    ↓
HTTP Response
```

## Circular Dependencies (Avoided)

The framework architecture prevents circular dependencies:

- **Controllers** → Services (one direction)
- **Services** → Repositories (one direction)
- **Repositories** → Entities (one direction)
- No cross-layer dependencies within modules
- Shared utilities in `/common` are leaf nodes

## Shared Dependencies

### Accessible Across All Modules

```
src/common/
├─ logger.ts           ← All modules can use Logger
├─ error-handler.ts    ← Registered globally
└─ helpers.ts          ← Utility functions

src/core/
├─ exceptions/         ← All modules throw HTTP exceptions
├─ decorators/         ← All modules use decorators
├─ database.ts         ← Repositories use database connection
└─ container.ts        ← ServiceContainer for DI
```

## Peer Dependencies (Optional)

For advanced features:

```
redis (for caching/sessions)
  └─ Optional caching layer for performance

bull (for job queues)
  └─ Optional background job processing

passport (for authentication)
  └─ Optional authentication strategies

stripe (for payments)
  └─ Optional payment processing
```

## Development Dependencies

```
TypeScript@^5.2.2
  └─ Language and type checking

tsx@^3.14.0
  └─ TypeScript execution for scripts

Vitest@^0.34.6
  └─ Testing framework

@typescript-eslint/*@^6.7.4
  └─ TypeScript linting

Prettier@^3.0.3
  └─ Code formatting

@types/express@^4.17.20
@types/node@^20.8.0
  └─ Type definitions for dependencies
```

## Monorepo Package Dependencies

If using monorepo structure with `/packages`:

```
packages/core/
└─ Exports: Framework core (@framework/core)
   Dependencies: express, reflect-metadata, tsyringe

packages/orm/
└─ Exports: ORM abstractions (@framework/orm)
   Dependencies: typeorm, @framework/core

packages/auth/
└─ Exports: Authentication (@framework/auth)
   Dependencies: passport, jwt, @framework/core

packages/testing/
└─ Exports: Testing utilities (@framework/testing)
   Dependencies: vitest, @framework/core

packages/validation/
└─ Exports: Validation schemas (@framework/validation)
   Dependencies: joi, zod, @framework/core
```

## Dependency Version Compatibility

### Node.js Compatibility
- Express.js: Requires Node 14+
- TypeORM: Requires Node 14+
- Vitest: Requires Node 14+
- **Minimum**: Node 18+ recommended

### TypeScript Compatibility
- Decorators: Requires experimentalDecorators enabled
- Metadata: Requires emitDecoratorMetadata enabled
- **Version**: 5.0+ required for strict mode

### Database Compatibility
- TypeORM: Supports PostgreSQL, MySQL, SQLite, etc.
- Primary: PostgreSQL 12+
- Compatible with TypeORM migration system

## Performance Implications

### Critical Dependencies
1. **Express.js**: Core HTTP handling
2. **TypeORM**: Database operations (usually slowest)
3. **Joi/Zod**: Validation (per-request cost)

### Optimization Points
- Cache Joi schemas for reuse
- Connection pooling via TypeORM
- Query optimization with indexes
- Async/await for non-blocking I/O

## Security Dependencies

### Built-in
- CORS middleware for cross-origin requests
- JSON parser limit to prevent large payloads
- Exception sanitization (no stack traces)

### Recommended Additions
- helmet (security headers)
- express-rate-limit (rate limiting)
- bcryptjs (password hashing)
- jsonwebtoken (JWT tokens)

## Dependency Management Scripts

```bash
# Check outdated dependencies
npm outdated

# Update dependencies
npm update

# Audit for vulnerabilities
npm audit
npm audit fix

# Check dependency tree
npm ls

# Analyze bundle size (dev dependencies only)
npm ls --depth=0
```

## Migration Path for Major Updates

### Example: Express 4 → 5
1. Update `package.json`
2. Check breaking changes in documentation
3. Update type definitions
4. Run tests and fix any issues
5. Validate core functionality

### Example: TypeORM 0.2 → 0.3
1. Update `package.json`
2. Check migration guide
3. Update entity and migration syntax
4. Update database configuration
5. Re-run migrations in test environment

---

**Last Updated**: 2026-05-26  
**Framework Version**: 1.0.0
