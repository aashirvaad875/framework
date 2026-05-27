# Getting Started Guide

This guide walks you through setting up and running the framework for the first time.

## Prerequisites

- **Node.js**: v18 or higher ([Download](https://nodejs.org/))
- **PostgreSQL**: v12 or higher ([Download](https://www.postgresql.org/download/))
- **npm or pnpm**: npm comes with Node.js, or [install pnpm](https://pnpm.io/installation)
- **Git**: For version control

## Initial Setup

### 1. Clone the Repository

```bash
git clone <repository-url> my-framework-app
cd my-framework-app
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Application
NODE_ENV=development
PORT=3000
HOST=localhost
LOG_LEVEL=info

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=framework_db
DB_LOGGING=false

# Other services...
```

### 4. Create Database

Using PostgreSQL CLI:

```bash
createdb framework_db
```

Or using Docker:

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=framework_db \
  -p 5432:5432 \
  postgres:15-alpine
```

### 5. Run Migrations

```bash
npm run migrate
```

This creates all necessary tables in the database.

### 6. Seed Database (Optional)

```bash
npm run seed
```

This populates the database with example data.

## Running the Application

### Development Mode

Start the server with automatic reloading:

```bash
npm run dev
```

The server will start at `http://localhost:3000`

### Production Mode

First, build the project:

```bash
npm run build
```

Then start the server:

```bash
npm start
```

## Project Structure Overview

```
src/
├── core/              # Framework core
│   ├── decorators/    # Route and class decorators
│   ├── exceptions/    # HTTP exceptions
│   ├── pipes/         # Validation pipes
│   ├── application.ts # Main app class
│   ├── container.ts   # Dependency injection
│   └── database.ts    # Database setup
├── common/            # Shared utilities
│   ├── logger.ts      # Winston logger
│   └── error-handler.ts
├── config/            # Configuration files
├── modules/           # Feature modules
│   └── users/         # Example: Users module
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── entities/
│       └── dtos/
└── main.ts            # Entry point
```

## Creating Your First Module

### 1. Create Module Structure

Create the folder structure:

```bash
mkdir -p src/modules/posts/{controllers,services,repositories,entities,dtos}
```

### 2. Create Entity

`src/modules/posts/entities/post.entity.ts`:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('posts')
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  content: string;

  @Column()
  authorId: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

### 3. Create DTO

`src/modules/posts/dtos/create-post.dto.ts`:

```typescript
import Joi from 'joi';

export class CreatePostDto {
  title: string;
  content: string;
  authorId: string;
}

export const createPostSchema = Joi.object({
  title: Joi.string().required(),
  content: Joi.string().required(),
  authorId: Joi.string().uuid().required(),
});
```

### 4. Create Repository

`src/modules/posts/repositories/post.repository.ts`:

```typescript
import { Repository } from 'typeorm';
import { PostEntity } from '../entities/post.entity.js';
import { getDataSource } from '../../../core/database.js';

export class PostRepository {
  private repository: Repository<PostEntity>;

  constructor() {
    this.repository = getDataSource().getRepository(PostEntity);
  }

  async create(data: Partial<PostEntity>): Promise<PostEntity> {
    const post = this.repository.create(data);
    return this.repository.save(post);
  }

  async findById(id: string): Promise<PostEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findAll(limit: number = 10, offset: number = 0): Promise<[PostEntity[], number]> {
    return this.repository.findAndCount({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
  }
}
```

### 5. Create Service

`src/modules/posts/services/post.service.ts`:

```typescript
import { Injectable } from '../../../core/decorators/index.js';
import { PostRepository } from '../repositories/post.repository.js';
import { CreatePostDto } from '../dtos/create-post.dto.js';
import { PostEntity } from '../entities/post.entity.js';

@Injectable()
export class PostService {
  constructor(private postRepository: PostRepository) {}

  async createPost(dto: CreatePostDto): Promise<PostEntity> {
    return this.postRepository.create(dto);
  }

  async getPostById(id: string): Promise<PostEntity | null> {
    return this.postRepository.findById(id);
  }

  async getPosts(limit: number = 10, offset: number = 0) {
    const [posts, total] = await this.postRepository.findAll(limit, offset);
    return { data: posts, total };
  }
}
```

### 6. Create Controller

`src/modules/posts/controllers/post.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { Controller, Get, Post, Body, Param, Query } from '../../../core/decorators/index.js';
import { PostService } from '../services/post.service.js';
import { CreatePostDto } from '../dtos/create-post.dto.js';

@Controller('/api/posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Post()
  async createPost(@Body() body: CreatePostDto, req: Request, res: Response): Promise<void> {
    const post = await this.postService.createPost(body);
    res.status(201).json({ success: true, data: post });
  }

  @Get()
  async getPosts(@Query() query: any, req: Request, res: Response): Promise<void> {
    const limit = parseInt(query.limit) || 10;
    const offset = parseInt(query.offset) || 0;
    const result = await this.postService.getPosts(limit, offset);
    res.status(200).json({ success: true, ...result });
  }

  @Get('/:id')
  async getPostById(@Param('id') id: string, req: Request, res: Response): Promise<void> {
    const post = await this.postService.getPostById(id);
    res.status(200).json({ success: true, data: post });
  }
}
```

### 7. Create Module

`src/modules/posts/post.module.ts`:

```typescript
import { Module } from '../../../core/decorators/index.js';
import { PostController } from './controllers/post.controller.js';
import { PostService } from './services/post.service.js';
import { PostRepository } from './repositories/post.repository.js';

@Module({
  controllers: [PostController],
  providers: [PostService, PostRepository],
})
export class PostModule {}
```

### 8. Register Module

Update `src/main.ts`:

```typescript
import { PostModule } from './modules/posts/post.module.js';

async function bootstrap(): Promise<void> {
  // ... existing code ...
  
  // Register modules
  await app.registerModule(UserModule);
  await app.registerModule(PostModule);  // Add this line
  
  // ... rest of code ...
}
```

## Testing Your API

### Using cURL

```bash
# Create a post
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "This is awesome!",
    "authorId": "123e4567-e89b-12d3-a456-426614174000"
  }'

# Get posts
curl http://localhost:3000/api/posts

# Get post by ID
curl http://localhost:3000/api/posts/[post-id]
```

### Using VS Code REST Client

Create `requests.http`:

```http
### Create Post
POST http://localhost:3000/api/posts
Content-Type: application/json

{
  "title": "My First Post",
  "content": "This is awesome!",
  "authorId": "123e4567-e89b-12d3-a456-426614174000"
}

### Get All Posts
GET http://localhost:3000/api/posts?limit=10&offset=0

### Get Post by ID
GET http://localhost:3000/api/posts/[post-id]
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test user.service.test.ts

# Run tests with coverage
npm test:cov

# Watch mode
npm test -- --watch
```

## Database Migrations

### Create a Migration

```bash
# Add entity to src/config/database.config.ts first
# Then run:
npm run migrate
```

### Example Migration

TypeORM migrations are in `src/migrations/`:

```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePostsTable implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'posts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'title', type: 'varchar' },
          { name: 'content', type: 'text' },
          // ... more columns
        ],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('posts');
  }
}
```

## Common Commands

```bash
# Development
npm run dev              # Start dev server with auto-reload
npm run build            # Build for production
npm start                # Run production build

# Testing
npm test                 # Run tests
npm test:cov             # Run tests with coverage
npm run lint             # Run linter
npm run type-check       # Check TypeScript types

# Database
npm run migrate          # Run migrations
npm run seed             # Seed database with example data

# Code Quality
npm run format           # Format code with Prettier
npm run lint:fix         # Fix linting issues
```

## Troubleshooting

### Database Connection Error

Check your `.env` file has correct credentials:

```bash
psql -h localhost -U postgres -d framework_db
```

### Port Already in Use

Change the `PORT` in `.env` or kill the process:

```bash
# macOS/Linux
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### TypeScript Compilation Error

Clear node_modules and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Next Steps

- Read the [Architecture Guide](../ARCHITECTURE.md)
- Check out [Design Patterns](./PATTERNS.md)
- Explore [API Documentation](./API.md)
- Build your first module following the guide above

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)

---

Happy coding! 🚀
