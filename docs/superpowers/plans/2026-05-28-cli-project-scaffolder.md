# CLI Project Scaffolder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `framework create <name>` into a full project scaffolder that generates a zero-config TypeScript/Express app with User CRUD, Docker, and all tooling wired up.

**Architecture:** A `templates/project-scaffold/` directory holds every file as a static template using `__APP_NAME__` tokens. `AppGenerator.execute()` copies the whole directory to the target path, replaces tokens, runs `git init`, and optionally runs `npm install`. The Handlebars `TemplateEngine` and all `generate` sub-commands are untouched.

**Tech Stack:** TypeScript, Commander.js, fs-extra, child_process, Handlebars (generate commands only), TypeORM + PostgreSQL (scaffold target), vitest

---

## File Map

| Action | Path |
|--------|------|
| Modify | `packages/@framework/cli/src/types.ts` |
| Modify | `packages/@framework/cli/src/core/template-engine.ts` |
| Create | `packages/@framework/cli/src/__tests__/app-generator.test.ts` |
| Modify | `packages/@framework/cli/src/generators/app-generator.ts` |
| Modify | `packages/@framework/cli/src/commands/create.ts` |
| Modify | `packages/@framework/cli/package.json` |
| Create | `packages/@framework/cli/templates/project-scaffold/package.json` |
| Create | `packages/@framework/cli/templates/project-scaffold/tsconfig.json` |
| Create | `packages/@framework/cli/templates/project-scaffold/.prettierrc` |
| Create | `packages/@framework/cli/templates/project-scaffold/eslint.config.js` |
| Create | `packages/@framework/cli/templates/project-scaffold/vitest.config.ts` |
| Create | `packages/@framework/cli/templates/project-scaffold/README.md` |
| Create | `packages/@framework/cli/templates/project-scaffold/.env.example` |
| Create | `packages/@framework/cli/templates/project-scaffold/.gitignore` |
| Create | `packages/@framework/cli/templates/project-scaffold/.dockerignore` |
| Create | `packages/@framework/cli/templates/project-scaffold/Dockerfile` |
| Create | `packages/@framework/cli/templates/project-scaffold/docker-compose.yml` |
| Create | `packages/@framework/cli/templates/project-scaffold/src/main.ts` |
| Create | `packages/@framework/cli/templates/project-scaffold/src/config/app.config.ts` |
| Create | `packages/@framework/cli/templates/project-scaffold/src/config/database.config.ts` |
| Create | `packages/@framework/cli/templates/project-scaffold/src/modules/health/health.module.ts` |
| Create | `packages/@framework/cli/templates/project-scaffold/src/modules/health/controllers/health.controller.ts` |
| Create | `packages/@framework/cli/templates/project-scaffold/src/modules/users/user.module.ts` |
| Create | `packages/@framework/cli/templates/project-scaffold/src/modules/users/entities/user.entity.ts` |
| Create | `packages/@framework/cli/templates/project-scaffold/src/modules/users/dto/create-user.dto.ts` |
| Create | `packages/@framework/cli/templates/project-scaffold/src/modules/users/dto/update-user.dto.ts` |
| Create | `packages/@framework/cli/templates/project-scaffold/src/modules/users/dto/index.ts` |
| Create | `packages/@framework/cli/templates/project-scaffold/src/modules/users/repositories/user.repository.ts` |
| Create | `packages/@framework/cli/templates/project-scaffold/src/modules/users/services/user.service.ts` |
| Create | `packages/@framework/cli/templates/project-scaffold/src/modules/users/controllers/user.controller.ts` |

---

## Task 1: Update types and TemplateEngine

**Files:**
- Modify: `packages/@framework/cli/src/types.ts`
- Modify: `packages/@framework/cli/src/core/template-engine.ts`

- [ ] **Step 1: Add `skipInstall` and `packageManager` to `GeneratorContext` in `types.ts`**

In `packages/@framework/cli/src/types.ts`, add two fields to the `GeneratorContext` interface:

```typescript
export interface GeneratorContext {
  projectRoot: string;
  modulePath: string;
  appName: string;
  moduleName?: string;
  className?: string;
  description?: string;
  path?: string;
  force?: boolean;
  skipInstall?: boolean;           // ADD THIS
  packageManager?: 'npm' | 'pnpm' | 'yarn';  // ADD THIS
  [key: string]: any;
}
```

- [ ] **Step 2: Add `templatesPath` getter to `TemplateEngine`**

In `packages/@framework/cli/src/core/template-engine.ts`, add a getter after the constructor:

```typescript
get templatesPath(): string {
  return this.builtInTemplatesPath;
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/@framework/cli/src/types.ts packages/@framework/cli/src/core/template-engine.ts
git commit -m "feat(cli): add skipInstall/packageManager types and TemplateEngine.templatesPath getter"
```

---

## Task 2: Write failing AppGenerator tests (TDD)

**Files:**
- Create: `packages/@framework/cli/src/__tests__/app-generator.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// packages/@framework/cli/src/__tests__/app-generator.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { AppGenerator } from '../generators/app-generator.js';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

function makeGenerator(tmpDir: string): AppGenerator {
  const templateEngine = {
    templatesPath: path.join(process.cwd(), 'templates'),
    render: vi.fn(),
  } as any;
  return new AppGenerator(tmpDir, templateEngine, {} as any, {} as any, {} as any);
}

describe('AppGenerator', () => {
  let tmpDir: string;
  let generator: AppGenerator;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fw-test-'));
    generator = makeGenerator(tmpDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
    vi.clearAllMocks();
  });

  it('returns error for invalid app name', async () => {
    const result = await generator.execute({
      projectRoot: tmpDir,
      appName: 'Invalid Name!',
      modulePath: 'src/modules',
      skipInstall: true,
    });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('lowercase');
  });

  it('creates all expected scaffold files', async () => {
    const targetPath = path.join(tmpDir, 'my-app');
    const result = await generator.execute({
      projectRoot: tmpDir,
      appName: 'my-app',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: true,
    });

    expect(result.success).toBe(true);
    const expectedFiles = [
      'package.json',
      'tsconfig.json',
      '.prettierrc',
      'eslint.config.js',
      'vitest.config.ts',
      'README.md',
      '.env.example',
      '.gitignore',
      '.dockerignore',
      'Dockerfile',
      'docker-compose.yml',
      'src/main.ts',
      'src/config/app.config.ts',
      'src/config/database.config.ts',
      'src/modules/health/health.module.ts',
      'src/modules/health/controllers/health.controller.ts',
      'src/modules/users/user.module.ts',
      'src/modules/users/entities/user.entity.ts',
      'src/modules/users/dto/create-user.dto.ts',
      'src/modules/users/dto/update-user.dto.ts',
      'src/modules/users/dto/index.ts',
      'src/modules/users/repositories/user.repository.ts',
      'src/modules/users/services/user.service.ts',
      'src/modules/users/controllers/user.controller.ts',
    ];
    for (const file of expectedFiles) {
      expect(
        await fs.pathExists(path.join(targetPath, file)),
        `expected ${file} to exist`,
      ).toBe(true);
    }
  });

  it('replaces __APP_NAME__ token in package.json name field', async () => {
    const targetPath = path.join(tmpDir, 'cool-api');
    await generator.execute({
      projectRoot: tmpDir,
      appName: 'cool-api',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: true,
    });
    const pkg = await fs.readJson(path.join(targetPath, 'package.json'));
    expect(pkg.name).toBe('cool-api');
  });

  it('replaces __APP_NAME__ token in README.md', async () => {
    const targetPath = path.join(tmpDir, 'cool-api');
    await generator.execute({
      projectRoot: tmpDir,
      appName: 'cool-api',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: true,
    });
    const readme = await fs.readFile(path.join(targetPath, 'README.md'), 'utf-8');
    expect(readme).toContain('cool-api');
    expect(readme).not.toContain('__APP_NAME__');
  });

  it('calls git init in the target directory', async () => {
    const { execSync } = await import('child_process');
    const targetPath = path.join(tmpDir, 'my-app');
    await generator.execute({
      projectRoot: tmpDir,
      appName: 'my-app',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: true,
    });
    expect(execSync).toHaveBeenCalledWith(
      'git init',
      expect.objectContaining({ cwd: targetPath }),
    );
  });

  it('does not call npm install when skipInstall is true', async () => {
    const { execSync } = await import('child_process');
    const targetPath = path.join(tmpDir, 'my-app');
    await generator.execute({
      projectRoot: tmpDir,
      appName: 'my-app',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: true,
    });
    const calls = (execSync as any).mock.calls.map((c: any[]) => c[0] as string);
    expect(calls.some((c: string) => c.includes('install'))).toBe(false);
  });

  it('calls npm install when skipInstall is false', async () => {
    const { execSync } = await import('child_process');
    const targetPath = path.join(tmpDir, 'my-app');
    await generator.execute({
      projectRoot: tmpDir,
      appName: 'my-app',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: false,
    });
    expect(execSync).toHaveBeenCalledWith(
      'npm install',
      expect.objectContaining({ cwd: targetPath }),
    );
  });

  it('uses pnpm install when packageManager is pnpm', async () => {
    const { execSync } = await import('child_process');
    const targetPath = path.join(tmpDir, 'my-app');
    await generator.execute({
      projectRoot: tmpDir,
      appName: 'my-app',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: false,
      packageManager: 'pnpm',
    });
    expect(execSync).toHaveBeenCalledWith(
      'pnpm install',
      expect.objectContaining({ cwd: targetPath }),
    );
  });

  it('returns error when target dir is non-empty and force is false', async () => {
    const targetPath = path.join(tmpDir, 'my-app');
    await fs.ensureDir(targetPath);
    await fs.writeFile(path.join(targetPath, 'existing.txt'), 'hello');

    const result = await generator.execute({
      projectRoot: tmpDir,
      appName: 'my-app',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: true,
      force: false,
    });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('already exists');
  });
});
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
cd packages/@framework/cli && npx vitest run src/__tests__/app-generator.test.ts
```

Expected: All tests FAIL (AppGenerator.execute doesn't scaffold yet)

- [ ] **Step 3: Commit**

```bash
git add packages/@framework/cli/src/__tests__/app-generator.test.ts
git commit -m "test(cli): add failing AppGenerator scaffold tests"
```

---

## Task 3: Create root config scaffold templates

**Files:** 11 files in `packages/@framework/cli/templates/project-scaffold/`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "__APP_NAME__",
  "version": "0.1.0",
  "description": "",
  "type": "module",
  "scripts": {
    "dev": "node --loader tsx src/main.ts",
    "build": "tsc --project tsconfig.json",
    "start": "node dist/main.js",
    "test": "vitest",
    "test:cov": "vitest --coverage",
    "lint": "eslint src"
  },
  "dependencies": {
    "@framework/core": "^0.1.0",
    "@framework/logger": "^0.1.0",
    "reflect-metadata": "^0.1.13",
    "typeorm": "^0.3.16",
    "pg": "^8.11.2",
    "dotenv": "^16.3.1",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.3",
    "joi": "^17.10.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "@types/bcrypt": "^5.0.2",
    "@types/express": "^4.17.20",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.8.0",
    "eslint": "^9.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.2.2",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `.prettierrc`**

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 4: Create `eslint.config.js`**

```javascript
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: './tsconfig.json' },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
```

- [ ] **Step 5: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
```

- [ ] **Step 6: Create `README.md`**

```markdown
# __APP_NAME__

A REST API built with [@framework/core](https://github.com/your-org/framework).

## Quick Start

```bash
cp .env.example .env   # fill in DB credentials
npm install
npm run dev
```

## Docker

```bash
docker-compose up      # starts app + postgres
```

## API

| Method | Path             | Description     |
|--------|------------------|-----------------|
| GET    | /health          | Health check    |
| POST   | /api/users       | Create user     |
| GET    | /api/users       | List users      |
| GET    | /api/users/:id   | Get user        |
| PUT    | /api/users/:id   | Update user     |
| DELETE | /api/users/:id   | Delete user     |

## Scripts

| Command         | Description              |
|-----------------|--------------------------|
| `npm run dev`   | Start with hot reload    |
| `npm run build` | Compile TypeScript       |
| `npm start`     | Run compiled output      |
| `npm test`      | Run tests                |
| `npm run lint`  | Lint source files        |
```

- [ ] **Step 7: Create `.env.example`**

```
PORT=3000
HOST=localhost
CORS_ENABLED=true

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=__APP_NAME___db

JWT_SECRET=change_me_in_production
NODE_ENV=development
```

- [ ] **Step 8: Create `.gitignore`**

```
node_modules/
dist/
.env
.env.local
coverage/
*.log
*.tsbuildinfo
.DS_Store
```

- [ ] **Step 9: Create `.dockerignore`**

```
node_modules/
dist/
.env
.git/
coverage/
*.log
*.tsbuildinfo
```

- [ ] **Step 10: Create `Dockerfile`**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

- [ ] **Step 11: Create `docker-compose.yml`**

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "${PORT:-3000}:${PORT:-3000}"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASS:-postgres}
      POSTGRES_DB: ${DB_NAME:-__APP_NAME___db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

- [ ] **Step 12: Commit all root templates**

```bash
git add packages/@framework/cli/templates/project-scaffold/
git commit -m "feat(cli): add root config scaffold templates (package.json, tsconfig, eslint, docker, etc.)"
```

---

## Task 4: Create src scaffold templates

**Files:** `src/main.ts`, `src/config/app.config.ts`, `src/config/database.config.ts`

- [ ] **Step 1: Create `src/main.ts`**

File: `packages/@framework/cli/templates/project-scaffold/src/main.ts`

```typescript
import 'reflect-metadata';
import { config } from 'dotenv';
config();
import { Application, initializeDatabase, globalErrorHandler } from '@framework/core';
import { Logger } from '@framework/logger';
import { appConfig } from './config/app.config.js';
import { databaseConfig } from './config/database.config.js';
import { UserModule } from './modules/users/user.module.js';
import { HealthModule } from './modules/health/health.module.js';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  logger.info('Initializing database...');
  await initializeDatabase(databaseConfig);

  const app = new Application({
    port: appConfig.port,
    host: appConfig.host,
    corsEnabled: appConfig.corsEnabled,
    globalErrorHandler,
  });

  await app.registerModule(HealthModule);
  await app.registerModule(UserModule);

  await app.start();
  logger.info(`Server running on http://${appConfig.host}:${appConfig.port}`);
}

bootstrap().catch(err => {
  logger.error('Failed to start', err);
  process.exit(1);
});
```

- [ ] **Step 2: Create `src/config/app.config.ts`**

File: `packages/@framework/cli/templates/project-scaffold/src/config/app.config.ts`

```typescript
export const appConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',
  corsEnabled: process.env.CORS_ENABLED !== 'false',
};
```

- [ ] **Step 3: Create `src/config/database.config.ts`**

File: `packages/@framework/cli/templates/project-scaffold/src/config/database.config.ts`

```typescript
import type { DataSourceOptions } from 'typeorm';
import { UserEntity } from '../modules/users/entities/user.entity.js';

export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || '__APP_NAME___db',
  entities: [UserEntity],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
};
```

- [ ] **Step 4: Commit**

```bash
git add packages/@framework/cli/templates/project-scaffold/src/
git commit -m "feat(cli): add scaffold src/main.ts and config templates"
```

---

## Task 5: Create users module scaffold templates

**Files:** 7 files under `src/modules/users/`

- [ ] **Step 1: Create `entities/user.entity.ts`**

File: `packages/@framework/cli/templates/project-scaffold/src/modules/users/entities/user.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 2: Create `dto/create-user.dto.ts`**

File: `packages/@framework/cli/templates/project-scaffold/src/modules/users/dto/create-user.dto.ts`

```typescript
import Joi from 'joi';

export interface CreateUserDto {
  email: string;
  name: string;
}

export const CreateUserJoiSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(1).max(100).required(),
});
```

- [ ] **Step 3: Create `dto/update-user.dto.ts`**

File: `packages/@framework/cli/templates/project-scaffold/src/modules/users/dto/update-user.dto.ts`

```typescript
import Joi from 'joi';

export interface UpdateUserDto {
  email?: string;
  name?: string;
}

export const UpdateUserJoiSchema = Joi.object({
  email: Joi.string().email().optional(),
  name: Joi.string().min(1).max(100).optional(),
}).min(1);
```

- [ ] **Step 4: Create `dto/index.ts`**

File: `packages/@framework/cli/templates/project-scaffold/src/modules/users/dto/index.ts`

```typescript
export * from './create-user.dto.js';
export * from './update-user.dto.js';
```

- [ ] **Step 5: Create `repositories/user.repository.ts`**

File: `packages/@framework/cli/templates/project-scaffold/src/modules/users/repositories/user.repository.ts`

```typescript
import { Injectable } from '@framework/core';
import { getDataSource } from '@framework/core';
import type { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity.js';

@Injectable()
export class UserRepository {
  private get repo(): Repository<UserEntity> {
    return getDataSource().getRepository(UserEntity);
  }

  async findAll(): Promise<UserEntity[]> {
    return this.repo.find();
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: { email: string; name: string }): Promise<UserEntity> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async update(id: string, data: Partial<{ email: string; name: string }>): Promise<UserEntity | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
```

- [ ] **Step 6: Create `services/user.service.ts`**

File: `packages/@framework/cli/templates/project-scaffold/src/modules/users/services/user.service.ts`

```typescript
import { Injectable, Inject } from '@framework/core';
import { UserRepository } from '../repositories/user.repository.js';
import type { UserEntity } from '../entities/user.entity.js';
import type { CreateUserDto, UpdateUserDto } from '../dto/index.js';

@Injectable()
export class UserService {
  constructor(@Inject(UserRepository) private userRepository: UserRepository) {}

  async createUser(dto: CreateUserDto): Promise<UserEntity> {
    return this.userRepository.create(dto);
  }

  async getAllUsers(): Promise<UserEntity[]> {
    return this.userRepository.findAll();
  }

  async getUserById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findById(id);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<UserEntity | null> {
    return this.userRepository.update(id, dto);
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.userRepository.delete(id);
  }
}
```

- [ ] **Step 7: Create `controllers/user.controller.ts`**

File: `packages/@framework/cli/templates/project-scaffold/src/modules/users/controllers/user.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  Res,
  Inject,
  UsePipe,
  JoiValidationPipe,
} from '@framework/core';
import { UserService } from '../services/user.service.js';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateUserJoiSchema,
  UpdateUserJoiSchema,
} from '../dto/index.js';

@Controller('/api/users')
export class UserController {
  constructor(@Inject(UserService) private userService: UserService) {}

  @Post()
  @UsePipe(new JoiValidationPipe(CreateUserJoiSchema))
  async createUser(@Body() dto: CreateUserDto, @Req() _req: any, @Res() res: any): Promise<void> {
    const user = await this.userService.createUser(dto);
    res.status(201).json({ success: true, data: user });
  }

  @Get()
  async getAllUsers(@Req() _req: any, @Res() res: any): Promise<void> {
    const users = await this.userService.getAllUsers();
    res.status(200).json({ success: true, data: users });
  }

  @Get('/:id')
  async getUserById(@Param('id') id: string, @Req() _req: any, @Res() res: any): Promise<void> {
    const user = await this.userService.getUserById(id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.status(200).json({ success: true, data: user });
  }

  @Put('/:id')
  @UsePipe(new JoiValidationPipe(UpdateUserJoiSchema))
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() _req: any,
    @Res() res: any,
  ): Promise<void> {
    const user = await this.userService.updateUser(id, dto);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.status(200).json({ success: true, data: user });
  }

  @Delete('/:id')
  async deleteUser(@Param('id') id: string, @Req() _req: any, @Res() res: any): Promise<void> {
    const deleted = await this.userService.deleteUser(id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.status(204).send();
  }
}
```

- [ ] **Step 8: Create `user.module.ts`**

File: `packages/@framework/cli/templates/project-scaffold/src/modules/users/user.module.ts`

```typescript
import { Module } from '@framework/core';
import { UserController } from './controllers/user.controller.js';
import { UserService } from './services/user.service.js';
import { UserRepository } from './repositories/user.repository.js';

@Module({
  controllers: [UserController],
  providers: [UserService, UserRepository],
})
export class UserModule {}
```

- [ ] **Step 9: Commit**

```bash
git add packages/@framework/cli/templates/project-scaffold/src/modules/users/
git commit -m "feat(cli): add users module scaffold templates (entity, dto, repo, service, controller)"
```

---

## Task 6: Create health module scaffold templates

**Files:** 2 files under `src/modules/health/`

- [ ] **Step 1: Create `health.module.ts`**

File: `packages/@framework/cli/templates/project-scaffold/src/modules/health/health.module.ts`

```typescript
import { Module } from '@framework/core';
import { HealthController } from './controllers/health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [],
})
export class HealthModule {}
```

- [ ] **Step 2: Create `controllers/health.controller.ts`**

File: `packages/@framework/cli/templates/project-scaffold/src/modules/health/controllers/health.controller.ts`

```typescript
import { Controller, Get, Req, Res } from '@framework/core';

@Controller('/health')
export class HealthController {
  @Get()
  health(@Req() _req: any, @Res() res: any): void {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/@framework/cli/templates/project-scaffold/src/modules/health/
git commit -m "feat(cli): add health module scaffold templates"
```

---

## Task 7: Implement new AppGenerator.execute()

**Files:**
- Modify: `packages/@framework/cli/src/generators/app-generator.ts`

- [ ] **Step 1: Replace the entire file content**

```typescript
import path from 'path';
import fs from 'fs-extra';
import { execSync } from 'child_process';
import { GeneratorContext, GenerateResult } from '../types.js';
import { BaseGenerator } from './base-generator.js';
import { ValidationUtility } from '../utils/index.js';

export class AppGenerator extends BaseGenerator {
  getTemplateName(): string {
    return 'app';
  }

  getRegistrationType(): null {
    return null;
  }

  validate(context: GeneratorContext): { valid: boolean; error?: string } {
    return ValidationUtility.validateAppName(context.appName!);
  }

  protected generateFilePath(context: GeneratorContext): string {
    return path.join(context.path || process.cwd(), 'src', 'main.ts');
  }

  protected getGeneratorType(): string {
    return 'Application';
  }

  async execute(context: GeneratorContext): Promise<GenerateResult> {
    const validation = this.validate(context);
    if (!validation.valid) {
      return { success: false, files: [], errors: [validation.error!], message: validation.error! };
    }

    const appName = context.appName!;
    const targetPath = context.path || path.join(process.cwd(), appName);
    const skipInstall = context.skipInstall ?? false;
    const packageManager = context.packageManager ?? 'npm';

    try {
      if (await fs.pathExists(targetPath) && !context.force) {
        const items = await fs.readdir(targetPath);
        if (items.length > 0) {
          return {
            success: false,
            files: [],
            errors: [`Directory already exists and is not empty: ${targetPath}. Use --force to overwrite.`],
            message: 'Target directory already exists',
          };
        }
      }

      const scaffoldPath = path.join(this.templateEngine.templatesPath, 'project-scaffold');
      await fs.copy(scaffoldPath, targetPath, { overwrite: context.force ?? false });
      await this.replaceTokens(targetPath, appName);

      try {
        execSync('git init', { cwd: targetPath, stdio: 'pipe' });
      } catch {
        console.warn('Warning: git init failed. Initialize manually.');
      }

      if (!skipInstall) {
        const installCmd =
          packageManager === 'pnpm' ? 'pnpm install'
          : packageManager === 'yarn' ? 'yarn install'
          : 'npm install';
        execSync(installCmd, { cwd: targetPath, stdio: 'inherit' });
      }

      const runCmd = packageManager === 'pnpm' ? 'pnpm' : packageManager === 'yarn' ? 'yarn' : 'npm';
      const installNote = skipInstall ? `  ${runCmd} install\n` : '';

      return {
        success: true,
        files: [],
        errors: [],
        message: [
          `\n✅ Project ${appName} created successfully!`,
          `\n  cd ${appName}`,
          `  cp .env.example .env`,
          installNote,
          `  ${runCmd} run dev\n`,
        ].filter(Boolean).join('\n'),
      };
    } catch (err) {
      await fs.remove(targetPath).catch(() => {});
      return {
        success: false,
        files: [],
        errors: [(err as Error).message],
        message: `Error creating project: ${(err as Error).message}`,
      };
    }
  }

  private async replaceTokens(dir: string, appName: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const textExts = new Set(['.ts', '.js', '.json', '.md', '.yml', '.yaml', '.txt', '.example', '.prettierrc', '.gitignore', '.dockerignore', '']);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.replaceTokens(fullPath, appName);
      } else if (textExts.has(path.extname(entry.name))) {
        const content = await fs.readFile(fullPath, 'utf-8');
        if (content.includes('__APP_NAME__')) {
          await fs.writeFile(fullPath, content.replaceAll('__APP_NAME__', appName), 'utf-8');
        }
      }
    }
  }
}
```

- [ ] **Step 2: Run the tests — they should now pass**

```bash
cd packages/@framework/cli && npx vitest run src/__tests__/app-generator.test.ts
```

Expected output:
```
✓ returns error for invalid app name
✓ creates all expected scaffold files
✓ replaces __APP_NAME__ token in package.json name field
✓ replaces __APP_NAME__ token in README.md
✓ calls git init in the target directory
✓ does not call npm install when skipInstall is true
✓ calls npm install when skipInstall is false
✓ uses pnpm install when packageManager is pnpm
✓ returns error when target dir is non-empty and force is false

Test Files  1 passed
Tests       9 passed
```

- [ ] **Step 3: Commit**

```bash
git add packages/@framework/cli/src/generators/app-generator.ts
git commit -m "feat(cli): implement AppGenerator full project scaffolder with token replacement, git init, and npm install"
```

---

## Task 8: Update create.ts command

**Files:**
- Modify: `packages/@framework/cli/src/commands/create.ts`

- [ ] **Step 1: Replace the full file with updated version**

```typescript
import { Command } from 'commander';
import { PromptUtility, ValidationUtility } from '../utils/index.js';
import { ConfigLoader } from '../config-loader.js';
import { TemplateEngine } from '../core/template-engine.js';
import { ModuleIntelligence } from '../core/module-intelligence.js';
import { ASTManipulator } from '../core/ast-manipulator.js';
import { PluginRegistry } from '../core/plugin-registry.js';
import { AppGenerator } from '../generators/index.js';
import type { GeneratorContext } from '../types.js';

export function createAppCommand(): Command {
  return new Command('create')
    .description('Create a new framework application')
    .argument('[name]', 'Application name')
    .option('--path <path>', 'Output directory')
    .option('--force', 'Overwrite existing directory without prompting')
    .option('--skip-install', 'Skip package installation')
    .option('--package-manager <manager>', 'Package manager to use (npm, pnpm, yarn)', 'npm')
    .action(async (name, options) => {
      try {
        let appName = name;
        if (!appName) {
          appName = await PromptUtility.text('What is your app name?', 'my-app');
        }

        const validation = ValidationUtility.validateAppName(appName);
        if (!validation.valid) {
          console.error(`❌ ${validation.error}`);
          process.exit(1);
        }

        const config = await ConfigLoader.load();
        const templateEngine = new TemplateEngine(config.templatePath!);
        const moduleIntelligence = new ModuleIntelligence(process.cwd());
        const astManipulator = new ASTManipulator(process.cwd());
        const pluginRegistry = new PluginRegistry();

        const generator = new AppGenerator(
          process.cwd(),
          templateEngine,
          moduleIntelligence,
          astManipulator,
          pluginRegistry,
        );

        const context: GeneratorContext = {
          projectRoot: process.cwd(),
          appName,
          modulePath: config.modulePath!,
          path: options.path,
          force: options.force ?? false,
          skipInstall: options.skipInstall ?? false,
          packageManager: options.packageManager ?? 'npm',
        };

        console.log(`\nCreating project ${appName}...`);
        const result = await generator.execute(context);

        console.log(result.message);
        if (!result.success) {
          result.errors.forEach(err => console.error(`  ❌ ${err}`));
          process.exit(1);
        }
      } catch (err) {
        console.error('Error creating app:', err);
        process.exit(1);
      }
    });
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/@framework/cli/src/commands/create.ts
git commit -m "feat(cli): add --skip-install and --package-manager flags to create command"
```

---

## Task 9: Update CLI package.json for npm publish

**Files:**
- Modify: `packages/@framework/cli/package.json`

- [ ] **Step 1: Add `files` and `publishConfig` fields**

In `packages/@framework/cli/package.json`, add these two fields at the top level (after `"bin"`):

```json
"files": ["dist", "bin", "templates"],
"publishConfig": {
  "access": "public"
},
```

The full updated `package.json` should look like:

```json
{
  "name": "@framework/cli",
  "version": "1.0.0",
  "description": "Enterprise CLI for scaffolding framework projects and modules",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "bin": {
    "framework": "./bin/framework.js"
  },
  "files": ["dist", "bin", "templates"],
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --outDir dist --dts",
    "dev": "node --loader tsx src/index.ts",
    "test": "vitest",
    "cli": "node --loader tsx bin/framework.js"
  },
  "dependencies": {
    "commander": "^11.1.0",
    "inquirer": "^9.2.15",
    "ts-morph": "^21.0.1",
    "handlebars": "^4.7.8",
    "fs-extra": "^11.2.0"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "tsup": "^8.5.1",
    "vitest": "^1.2.0",
    "@types/fs-extra": "^11.0.4",
    "@types/node": "^20.11.0",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/@framework/cli/package.json
git commit -m "feat(cli): add files and publishConfig for npm publish"
```

---

## Task 10: Build and smoke test

- [ ] **Step 1: Run the full test suite**

```bash
cd packages/@framework/cli && npx vitest run
```

Expected: All tests pass including the new `app-generator.test.ts`

- [ ] **Step 2: Build the CLI**

```bash
cd packages/@framework/cli && npm run build
```

Expected: `dist/index.js` and `dist/index.d.ts` created with no errors

- [ ] **Step 3: Smoke test — run create command with --skip-install**

```bash
cd /tmp && node /Users/webandapp/Documents/Office/framework/packages/@framework/cli/bin/framework.js create smoke-test --skip-install
```

Expected output:
```
Creating project smoke-test...

✅ Project smoke-test created successfully!

  cd smoke-test
  cp .env.example .env
  npm install
  npm run dev
```

- [ ] **Step 4: Verify generated file structure**

```bash
find /tmp/smoke-test -not -path '*/node_modules/*' | sort | head -40
```

Expected: All scaffold files present (package.json, tsconfig.json, Dockerfile, docker-compose.yml, src/main.ts, src/modules/users/..., src/modules/health/...)

- [ ] **Step 5: Verify token replacement**

```bash
grep -r "__APP_NAME__" /tmp/smoke-test/
```

Expected: No output (all tokens replaced)

```bash
cat /tmp/smoke-test/package.json | grep '"name"'
```

Expected: `"name": "smoke-test"`

- [ ] **Step 6: Clean up and final commit**

```bash
rm -rf /tmp/smoke-test
git add -A
git commit -m "feat(cli): complete framework create full project scaffolder

- Adds templates/project-scaffold/ with all config, source, and Docker files
- AppGenerator now copies scaffold, replaces __APP_NAME__ tokens, runs git init and npm install
- Adds --skip-install and --package-manager flags to create command
- Adds files + publishConfig to package.json for npm i -g support"
```
