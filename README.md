# Enterprise-Grade Backend Framework

A TypeScript-based backend framework that abstracts Express.js complexity while providing NestJS/Laravel/Spring Boot-like developer experience.

## ✨ Features

- 🎯 **Familiar Syntax**: Decorator-based controllers, services, and modules
- 🔧 **Type-Safe**: Full TypeScript with strict mode
- 💉 **Dependency Injection**: Built-in IoC container with TSyringe
- 🗄️ **ORM Integration**: TypeORM with automatic migrations
- 🛡️ **Exception Handling**: Consistent HTTP exception hierarchy
- 📝 **Logging**: Winston-based structured logging
- ✅ **Testing**: Vitest integration with test utilities
- 🧩 **Modular**: Self-contained feature modules
- 📦 **Monorepo Ready**: Workspace support for multiple packages
- 🚀 **Scalable**: Designed for microservices and large applications

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or pnpm

### Installation

```bash
# Clone or create new project
git clone <repo-url> my-api
cd my-api

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Update database credentials in .env
```

### Running the Application

```bash
# Development with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run migrations
npm run migrate

# Seed database
npm run seed

# Run tests
npm test

# Run tests with coverage
npm test:cov
```

## 📁 Project Structure

```
src/
├── core/              # Framework core (decorators, DI, app)
├── common/            # Shared utilities (logger, error handler)
├── config/            # Configuration (app, database)
├── modules/           # Feature modules
│   └── users/         # Example: Users module
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── entities/
│       └── dtos/
├── migrations/        # Database migrations
├── seeds/             # Database seeds
└── main.ts            # Application entry point
```

## 📚 Core Concepts

### Decorators

Define controllers and routes using decorators:

```typescript
import { Controller, Get, Post, Body, Param } from '@/core/decorators';
import { UserService } from './services/user.service';

@Controller('/api/users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  async getUsers() {
    return this.userService.getUsers();
  }

  @Get('/:id')
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }
}
```

### Services

Business logic is isolated in services:

```typescript
import { Injectable } from '@/core/decorators';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    // Business logic here
    return this.userRepository.create(dto);
  }
}
```

### Repositories

Data access abstraction using repositories:

```typescript
export class UserRepository {
  constructor() {
    this.repository = getDataSource().getRepository(UserEntity);
  }

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }

  async findById(id: string): Promise<UserEntity> {
    return this.repository.findOneOrFail({ where: { id } });
  }
}
```

### Modules

Organize code into feature modules:

```typescript
import { Module } from '@/core/decorators';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { UserRepository } from './repositories/user.repository';

@Module({
  controllers: [UserController],
  providers: [UserService, UserRepository],
})
export class UserModule {}
```

### Entities

Define database models with TypeORM:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;
}
```

## 🔄 Request/Response Flow

```
Request → Controller → Validation → Service → Repository → Database
   ↓          ↓            ↓           ↓          ↓           ↓
HTTP      Route Handler   Pipe       Logic      Query      Response
```

## 🧪 Testing

Run unit tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm test:cov
```

Example test:

```typescript
import { describe, it, expect } from 'vitest';
import { UserService } from '@/modules/users/services/user.service';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService(mockRepository);
  });

  it('should create a user', async () => {
    const user = await userService.createUser({ email: 'test@example.com' });
    expect(user.email).toBe('test@example.com');
  });
});
```

## 📊 Database

### Migrations

Create a new migration:

```bash
npm run migrate
```

Migrations are automatically applied on startup in development.

### Seeds

Run database seeds:

```bash
npm run seed
```

## 🔐 Security

### Environment Variables

Never commit `.env` to version control. Use `.env.example` as template.

### Exception Handling

The framework provides HTTP exceptions with proper status codes:

```typescript
import { NotFoundException, ConflictException } from '@/core/exceptions';

throw new NotFoundException('User not found');
throw new ConflictException('Email already exists');
```

## 📖 Documentation

- [Architecture Guide](./ARCHITECTURE.md) - Deep dive into framework design
- [Getting Started](./docs/GETTING_STARTED.md) - Detailed setup guide
- [API Reference](./docs/API.md) - Framework API documentation
- [Design Patterns](./docs/PATTERNS.md) - Common patterns and best practices
- [Plugin Development](./docs/PLUGINS.md) - Creating custom plugins

## 🛠️ Creating New Modules

Generate a new module:

```bash
npm run new:module <name>
```

This creates:
```
src/modules/<name>/
├── controllers/<name>.controller.ts
├── services/<name>.service.ts
├── repositories/<name>.repository.ts
├── entities/<name>.entity.ts
├── dtos/
│   ├── create-<name>.dto.ts
│   └── update-<name>.dto.ts
└── <name>.module.ts
```

## 🚀 Deployment

### Docker

```bash
docker build -t my-api .
docker run -p 3000:3000 --env-file .env my-api
```

### Docker Compose

```bash
docker-compose up -d
```

## 📝 Coding Standards

- **TypeScript**: Strict mode required
- **Formatting**: Prettier for code style
- **Linting**: ESLint for code quality
- **Testing**: >80% coverage required
- **Documentation**: JSDoc for public APIs

## 🤝 Contributing

1. Create a feature branch
2. Follow coding standards
3. Add tests for new features
4. Submit pull request

## 📞 Support

- Issues: GitHub Issues
- Documentation: See `./docs` folder
- Examples: Check `./tests` for usage examples

## 📄 License

MIT

---

**Framework Version**: 1.0.0  
**Node Version**: 18+  
**TypeScript Version**: 5.2+
