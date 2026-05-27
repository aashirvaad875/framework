/**
 * Example: Enterprise Authentication System
 *
 * Demonstrates complete authentication setup with:
 * - JWT authentication and token management
 * - Role-based access control (RBAC)
 * - Permission-based access control (PBAC)
 * - Password hashing and validation
 * - Multiple authentication methods
 * - Custom guards and middleware
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Body,
  Param,
  Req,
  Injectable,
  Auth,
  Roles,
  Permissions,
  RequireAllPermissions,
  Public,
  Role,
  Permission,
  AuthService,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@framework/core';

// User service
@Injectable()
class UserService {
  private users = new Map<string, any>();
  private counter = 0;

  async create(data: any) {
    const id = String(++this.counter);
    const user = { id, ...data, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async findByEmail(email: string) {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async findById(id: string) {
    return this.users.get(id);
  }

  async findAll() {
    return Array.from(this.users.values());
  }

  async update(id: string, data: any) {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string) {
    return this.users.delete(id);
  }

  async findByRole(role: Role) {
    return Array.from(this.users.values()).filter((u) =>
      u.roles.includes(role)
    );
  }
}

// Authentication controller
@Controller('/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService
  ) {}

  /**
   * Register new user
   * POST /auth/register
   * { email: "user@example.com", password: "SecurePass123!" }
   */
  @Post('/register')
  @Public()
  async register(
    @Body()
    body: {
      email: string;
      password: string;
      name: string;
    }
  ) {
    // Check if user exists
    const exists = await this.userService.findByEmail(body.email);
    if (exists) {
      throw new ForbiddenException(
        'User already exists',
        'USER_EXISTS',
        { email: body.email }
      );
    }

    // Validate password strength
    const passwordService = this.authService.getPasswordService();
    const validation = passwordService.validatePasswordStrength(body.password);
    if (!validation.strong) {
      throw new BadRequestException(
        'Password does not meet requirements',
        'WEAK_PASSWORD',
        { errors: validation.errors }
      );
    }

    // Hash password
    const hashedPassword = await passwordService.hashPassword(body.password);

    // Create user
    const user = await this.userService.create({
      email: body.email,
      password: hashedPassword,
      name: body.name,
      roles: [Role.USER],
      permissions: [],
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    // Create tokens
    const tokens = this.authService.createTokenPair(
      user.id,
      user.email,
      user.roles,
      user.permissions
    );

    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  /**
   * Login user
   * POST /auth/login
   * { email: "user@example.com", password: "SecurePass123!" }
   */
  @Post('/login')
  @Public()
  async login(
    @Body() body: { email: string; password: string }
  ) {
    // Find user
    const user = await this.userService.findByEmail(body.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const passwordService = this.authService.getPasswordService();
    const isValid = await passwordService.comparePassword(
      body.password,
      user.password
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Create tokens
    const tokens = this.authService.createTokenPair(
      user.id,
      user.email,
      user.roles,
      user.permissions
    );

    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  /**
   * Refresh access token
   * POST /auth/refresh
   * { refreshToken: "..." }
   */
  @Post('/refresh')
  @Public()
  refreshToken(@Body() body: { refreshToken: string }) {
    try {
      const jwtService = this.authService.getJwtService();
      const tokens = jwtService.refreshAccessToken(body.refreshToken);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user
   * POST /auth/logout
   * Note: Client should delete tokens locally
   */
  @Post('/logout')
  @Auth()
  logout(@Req() req: any) {
    return { success: true, message: 'Logged out successfully' };
  }
}

// User management controller
@Controller('/api/users')
export class UserController {
  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  /**
   * Get current user profile
   * GET /api/users/profile
   */
  @Get('/profile')
  @Auth()
  async getProfile(@Req() req: any) {
    const user = await this.userService.findById(req.user.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword };
  }

  /**
   * Get all users (ADMIN only)
   * GET /api/users
   */
  @Get()
  @Auth()
  @Roles(Role.ADMIN)
  async getAllUsers() {
    const users = await this.userService.findAll();
    return {
      users: users.map(({ password, ...user }) => user),
      total: users.length,
    };
  }

  /**
   * Get user by ID (ADMIN or self)
   * GET /api/users/:id
   */
  @Get('/:id')
  @Auth()
  async getUserById(@Param('id') id: string, @Req() req: any) {
    // Allow users to view their own profile or admins to view any
    const isSelf = req.user.sub === id;
    const isAdmin = req.user.roles.includes(Role.ADMIN);

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException('Cannot view other users');
    }

    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword };
  }

  /**
   * Update own profile
   * PUT /api/users/profile
   */
  @Put('/profile')
  @Auth()
  async updateProfile(
    @Req() req: any,
    @Body() body: { name?: string; email?: string }
  ) {
    if (body.email) {
      const exists = await this.userService.findByEmail(body.email);
      if (exists && exists.id !== req.user.sub) {
        throw new ForbiddenException('Email already in use');
      }
    }

    const user = await this.userService.update(req.user.sub, body);
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword };
  }

  /**
   * Update user password
   * PUT /api/users/password
   */
  @Put('/password')
  @Auth()
  async updatePassword(
    @Req() req: any,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    const user = await this.userService.findById(req.user.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const passwordService = this.authService.getPasswordService();
    const isValid = await passwordService.comparePassword(
      body.currentPassword,
      user.password
    );

    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password
    const validation = passwordService.validatePasswordStrength(body.newPassword);
    if (!validation.strong) {
      throw new BadRequestException('New password is too weak', 'WEAK_PASSWORD', {
        errors: validation.errors,
      });
    }

    // Hash and update
    const hashedPassword = await passwordService.hashPassword(body.newPassword);
    await this.userService.update(req.user.sub, {
      password: hashedPassword,
    });

    return { success: true, message: 'Password updated' };
  }

  /**
   * Delete user (ADMIN only or self)
   * DELETE /api/users/:id
   */
  @Delete('/:id')
  @Auth()
  @Permissions(Permission.DELETE_USER)
  async deleteUser(@Param('id') id: string, @Req() req: any) {
    const isSelf = req.user.sub === id;
    const isAdmin = req.user.roles.includes(Role.ADMIN);

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException('Cannot delete other users');
    }

    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userService.delete(id);
    return { success: true, message: 'User deleted' };
  }

  /**
   * Promote user to admin (SUPER_ADMIN only)
   * PUT /api/users/:id/promote
   */
  @Put('/:id/promote')
  @Auth()
  @RequireAllPermissions(Permission.MANAGE_ROLES, Permission.SYSTEM_ADMIN)
  async promoteUser(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.roles.includes(Role.ADMIN)) {
      user.roles.push(Role.ADMIN);
      await this.userService.update(id, { roles: user.roles });
    }

    return { success: true, message: 'User promoted to admin' };
  }

  /**
   * Assign permission to user
   * POST /api/users/:id/permissions
   */
  @Post('/:id/permissions')
  @Auth()
  @Permissions(Permission.MANAGE_ROLES)
  async assignPermission(
    @Param('id') id: string,
    @Body() body: { permission: Permission }
  ) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.permissions.includes(body.permission)) {
      user.permissions.push(body.permission);
      await this.userService.update(id, { permissions: user.permissions });
    }

    return { success: true, user };
  }
}

/**
 * Example: API Key Authentication
 *
 * Setup API key authentication for service-to-service communication
 */
export class ApiKeyExampleSetup {
  setupApiKeys(authService: AuthService) {
    const apiKeyGuard = authService.getApiKeyGuard();

    // Register API keys
    apiKeyGuard.registerApiKey(
      'mobile-app-key',
      'mobile-app-secret-xyz',
      [Role.USER, Role.GUEST]
    );

    apiKeyGuard.registerApiKey(
      'admin-tool-key',
      'admin-tool-secret-abc',
      [Role.ADMIN]
    );

    return apiKeyGuard;
  }

  exampleController(apiKeyGuard: any) {
    // Use in controller
    @Controller('/api-key-protected')
    class ProtectedController {
      @Post('/data')
      @UseGuard((req, res, next) => apiKeyGuard.authenticate(req, res, next))
      processData(@Body() body: any) {
        return { success: true, data: body };
      }
    }

    return ProtectedController;
  }
}

/**
 * Complete Authentication Flow Example
 *
 * 1. User registers
 * POST /auth/register
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123!",
 *   "name": "John Doe"
 * }
 *
 * Response:
 * {
 *   "accessToken": "eyJhbGc...",
 *   "refreshToken": "eyJhbGc...",
 *   "expiresIn": 3600,
 *   "user": { "id": "1", "email": "user@example.com", "name": "John Doe" }
 * }
 *
 * 2. User logs in
 * POST /auth/login
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123!"
 * }
 *
 * 3. Access protected resources
 * GET /api/users/profile
 * Headers: Authorization: Bearer <accessToken>
 *
 * 4. Refresh token
 * POST /auth/refresh
 * { "refreshToken": "<refreshToken>" }
 *
 * 5. Admin operations
 * GET /api/users (requires ADMIN role)
 * DELETE /api/users/:id (requires DELETE_USER permission)
 */

export {
  AuthController,
  UserController,
  UserService,
  ApiKeyExampleSetup,
};
