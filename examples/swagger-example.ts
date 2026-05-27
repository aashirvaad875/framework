import 'reflect-metadata';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Injectable,
  SwaggerModuleBuilder,
} from '@framework/core';
import Joi from 'joi';
import z from 'zod';

/**
 * Example 1: Basic User DTO with Joi validation
 */
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

export const CreateUserZodSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  age: z.number().int().min(0).max(150).optional(),
});

/**
 * Example 2: Response DTO with TypeScript introspection
 */
export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string;
  age?: number;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Example 3: Update DTO with Joi schema
 */
export class UpdateUserDto {
  email?: string;
  name?: string;
  age?: number;
}

export const UpdateUserJoiSchema = Joi.object({
  email: Joi.string().email().optional(),
  name: Joi.string().min(2).max(100).optional(),
  age: Joi.number().optional().min(0).max(150),
}).min(1);

/**
 * Example 4: Query/Search DTO
 */
export class QueryUsersDto {
  search?: string;
  page?: number;
  limit?: number;
}

export const QueryUsersJoiSchema = Joi.object({
  search: Joi.string().optional(),
  page: Joi.number().optional().min(1),
  limit: Joi.number().optional().min(1).max(100),
});

/**
 * Example 5: User Service (would normally be database service)
 */
@Injectable()
export class UserService {
  private users: Map<string, UserResponseDto> = new Map();

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const id = Math.random().toString(36).substr(2, 9);
    const user: UserResponseDto = {
      id,
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async findById(id: string): Promise<UserResponseDto | undefined> {
    return this.users.get(id);
  }

  async findAll(query?: QueryUsersDto): Promise<UserResponseDto[]> {
    let users = Array.from(this.users.values());

    if (query?.search) {
      users = users.filter((u) =>
        u.name.toLowerCase().includes(query.search!.toLowerCase())
      );
    }

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const start = (page - 1) * limit;

    return users.slice(start, start + limit);
  }

  async update(
    id: string,
    dto: UpdateUserDto
  ): Promise<UserResponseDto | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updated = {
      ...user,
      ...dto,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}

/**
 * Example 6: User Controller with automatic OpenAPI documentation
 */
@Controller('/users')
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Create a new user
   * Automatically documented with:
   * - POST /users
   * - @Body() parameter with CreateUserDto schema
   * - @AuthRequired() security requirement
   * - Response UserResponseDto schema
   */
  @Post()
  // @AuthRequired()  // Uncomment to add security requirement
  // @UsePipe(new JoiValidationPipe(CreateUserJoiSchema))  // Uncomment for validation
  async createUser(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(dto);
  }

  /**
   * Get user by ID
   * Automatically documented with:
   * - GET /users/:id
   * - @Param('id') path parameter
   * - Response UserResponseDto schema
   */
  @Get('/:id')
  async getUser(@Param('id') id: string): Promise<UserResponseDto | undefined> {
    return this.userService.findById(id);
  }

  /**
   * List all users with optional filtering
   * Automatically documented with:
   * - GET /users
   * - @Query() parameters for search, page, limit
   * - Response array of UserResponseDto
   */
  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<UserResponseDto[]> {
    return this.userService.findAll({
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * Update user
   * Automatically documented with:
   * - PUT /users/:id
   * - @Param('id') path parameter
   * - @Body() parameter with UpdateUserDto schema
   * - Response UserResponseDto schema
   */
  @Put('/:id')
  // @AuthRequired()  // Uncomment to require authentication
  // @UsePipe(new JoiValidationPipe(UpdateUserJoiSchema))  // Uncomment for validation
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto
  ): Promise<UserResponseDto | undefined> {
    return this.userService.update(id, dto);
  }

  /**
   * Delete user
   * Automatically documented with:
   * - DELETE /users/:id
   * - @Param('id') path parameter
   * - @Permissions() required scopes (if uncommented)
   */
  @Delete('/:id')
  // @Permissions('users:delete', 'admin')  // Uncomment to require permissions
  async deleteUser(@Param('id') id: string): Promise<void> {
    await this.userService.delete(id);
  }
}

/**
 * Example 7: Generating OpenAPI Spec
 */
export async function generateSwaggerSpec(): Promise<void> {
  const swaggerModule = new SwaggerModuleBuilder()
    .setTitle('User Management API')
    .setVersion('1.0.0')
    .setDescription('API for managing users with automatic OpenAPI documentation')
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
      description: 'JWT access token in Authorization header',
    })
    .build();

  await swaggerModule.initialize();

  // Generate and save spec
  await swaggerModule.generateAndSave('./openapi.json');
  console.log('✅ OpenAPI spec generated: ./openapi.json');

  // Get spec for serving
  const spec = swaggerModule.generateSpec();
  console.log('📋 Spec info:', {
    title: spec.info.title,
    version: spec.info.version,
    paths: Object.keys(spec.paths).length,
  });
}

/**
 * Example 8: Using metadata scanner directly
 */
export function scanControllerMetadata(): void {
  // This would be used internally by the swagger module
  // Example shows how to access metadata programmatically
  console.log('Controller:', UserController.name);
  console.log('DTOs:', {
    CreateUserDto: CreateUserDto.name,
    UserResponseDto: UserResponseDto.name,
    UpdateUserDto: UpdateUserDto.name,
    QueryUsersDto: QueryUsersDto.name,
  });
}

// Run if executed directly
if (require.main === module) {
  generateSwaggerSpec().catch(console.error);
}
