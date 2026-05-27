# Enterprise Authentication Guide

The framework provides a comprehensive, production-ready authentication system with JWT, role-based access control (RBAC), permission management, OAuth support, and API key authentication.

## Overview

- **JWT Authentication** - Signed tokens with refresh token support
- **Role-Based Access Control** - Admin, User, Moderator, Guest roles
- **Permission System** - Granular permission management
- **Multiple Auth Methods** - JWT, API Keys, OAuth-ready
- **Password Security** - Bcrypt hashing with strength validation
- **Guards & Decorators** - Easy-to-use authorization
- **Middleware Support** - Route protection and auth enforcement

## Quick Start

### 1. Configure Authentication

```typescript
import { AuthService, AuthConfig, Role, Permission } from '@framework/core';

const authConfig: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiration: 3600, // 1 hour
  refreshTokenExpiration: 604800, // 7 days
  issuer: 'your-app',
  audience: 'your-app-users',
};

const authService = new AuthService(authConfig);
```

### 2. Create Login Endpoint

```typescript
@Controller('/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService
  ) {}

  @Post('/login')
  @Public()
  async login(@Body() credentials: { email: string; password: string }) {
    // Find user
    const user = await this.userService.findByEmail(credentials.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isValid = await this.authService.getPasswordService()
      .comparePassword(credentials.password, user.password);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Create token pair
    const tokens = this.authService.createTokenPair(
      user.id,
      user.email,
      [Role.USER],
      []
    );

    return { ...tokens, user: { id: user.id, email: user.email } };
  }
}
```

### 3. Protect Routes with Authentication

```typescript
@Controller('/users')
export class UserController {
  @Get('/profile')
  @Auth()
  getProfile(@Req() req: any) {
    return { user: req.user };
  }

  @Get('/admin/stats')
  @Auth()
  @Roles(Role.ADMIN)
  getAdminStats() {
    return { totalUsers: 1000 };
  }

  @Delete('/:id')
  @Auth()
  @Permissions(Permission.DELETE_USER)
  deleteUser(@Param('id') id: string) {
    return { success: true };
  }
}
```

## Authentication Methods

### JWT Authentication

JWT (JSON Web Token) is the primary authentication method.

```typescript
// Create tokens
const tokens = authService.createTokenPair(
  userId,
  email,
  [Role.USER],
  permissions
);

// Verify token
const payload = authService.getJwtService().verify(accessToken);

// Refresh token pair
const newTokens = authService.getJwtService()
  .refreshAccessToken(refreshToken);
```

**Request Format:**
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/profile
```

### API Key Authentication

For service-to-service or client applications.

```typescript
const apiKeyGuard = authService.getApiKeyGuard();

// Register API key
apiKeyGuard.registerApiKey(
  'api-key-123',
  'api-secret-xyz',
  [Role.USER, Role.MODERATOR]
);

// Use in route
@Post('/data')
@UseGuard((req, res, next) => apiKeyGuard.authenticate(req, res, next))
processData() {
  return { success: true };
}
```

**Request Format:**
```bash
curl -H "x-api-key: api-key-123" \
     -H "x-api-secret: api-secret-xyz" \
     http://localhost:3000/api/data
```

### Composite Authentication

Support multiple auth methods simultaneously.

```typescript
const compositeGuard = authService.getCompositeAuthGuard();

@Post('/submit')
@UseGuard((req, res, next) => 
  compositeGuard.authenticate(req, res, next)
)
submitData() {
  return { success: true };
}
```

## Authorization

### Role-Based Access Control (RBAC)

```typescript
@Roles(Role.ADMIN, Role.MODERATOR)
@Get('/manage/users')
manageUsers() {
  return { users: [] };
}

@Roles(Role.ADMIN)
@Delete('/:id')
deleteUser(@Param('id') id: string) {
  return { deleted: true };
}
```

**Available Roles:**
- `ADMIN` - Full system access
- `MODERATOR` - Content management access
- `USER` - Basic user access
- `GUEST` - Read-only access

### Permission-Based Access Control

```typescript
@Permissions(Permission.DELETE_USER)
@Delete('/:id')
deleteUser(@Param('id') id: string) {
  return { deleted: true };
}

@RequireAllPermissions(
  Permission.DELETE_USER,
  Permission.MANAGE_ROLES
)
@Post('/purge-user')
purgeUser(@Body() body: any) {
  return { purged: true };
}
```

**Available Permissions:**
```typescript
enum Permission {
  // User management
  CREATE_USER = 'create_user',
  READ_USER = 'read_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',

  // Role management
  MANAGE_ROLES = 'manage_roles',

  // Content management
  CREATE_CONTENT = 'create_content',
  READ_CONTENT = 'read_content',
  UPDATE_CONTENT = 'update_content',
  DELETE_CONTENT = 'delete_content',

  // Admin operations
  SYSTEM_ADMIN = 'system_admin',
  VIEW_LOGS = 'view_logs',
  MANAGE_SETTINGS = 'manage_settings',
}
```

## Decorators

### @Auth()
Require authentication.

```typescript
@Get('/profile')
@Auth()
getProfile() { ... }
```

### @Roles(...)
Require specific roles.

```typescript
@Get('/admin')
@Roles(Role.ADMIN, Role.MODERATOR)
adminPanel() { ... }
```

### @Permissions(...)
Require specific permissions (any).

```typescript
@Delete('/:id')
@Permissions(Permission.DELETE_USER)
deleteUser() { ... }
```

### @RequireAllPermissions(...)
Require all specific permissions.

```typescript
@Post('/purge')
@RequireAllPermissions(
  Permission.DELETE_USER,
  Permission.MANAGE_ROLES
)
purgeUser() { ... }
```

### @Public()
Mark endpoint as public (no auth required).

```typescript
@Post('/login')
@Public()
login() { ... }

@Get('/docs')
@Public()
documentation() { ... }
```

## Password Management

### Hashing Passwords

```typescript
const passwordService = authService.getPasswordService();

// Hash password
const hashedPassword = await passwordService.hashPassword(plainPassword);

// Compare password
const isValid = await passwordService.comparePassword(
  plainPassword,
  hashedPassword
);
```

### Password Strength Validation

```typescript
const result = passwordService.validatePasswordStrength(password);

if (!result.strong) {
  console.log('Errors:', result.errors);
  // Output:
  // Errors: [
  //   "Password must be at least 8 characters long",
  //   "Password must contain at least one uppercase letter",
  //   "Password must contain at least one special character"
  // ]
}
```

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Permission Management

### Default Role Permissions

```typescript
const permManager = authService.getPermissionManager();

// Admin - all permissions
const adminPerms = permManager.getPermissionsForRole(Role.ADMIN);

// Moderator - content & moderation
const modPerms = permManager.getPermissionsForRole(Role.MODERATOR);

// User - basic permissions
const userPerms = permManager.getPermissionsForRole(Role.USER);

// Guest - read-only
const guestPerms = permManager.getPermissionsForRole(Role.GUEST);
```

### Custom Role Permissions

```typescript
const permManager = authService.getPermissionManager();

// Set role permissions
permManager.setRolePermissions(Role.MODERATOR, [
  Permission.READ_USER,
  Permission.UPDATE_USER,
  Permission.VIEW_LOGS,
]);

// Add permission to role
permManager.addPermissionToRole(Role.USER, Permission.CREATE_CONTENT);

// Remove permission from role
permManager.removePermissionFromRole(Role.GUEST, Permission.DELETE_USER);
```

### Check Permissions

```typescript
const permManager = authService.getPermissionManager();

// Check single permission
const canDelete = permManager.hasPermission(
  [Role.ADMIN],
  Permission.DELETE_USER
);

// Check any permission
const canManage = permManager.hasAnyPermission(
  [Role.MODERATOR],
  [Permission.CREATE_CONTENT, Permission.DELETE_CONTENT]
);

// Check all permissions
const canPurge = permManager.hasAllPermissions(
  [Role.ADMIN],
  [Permission.DELETE_USER, Permission.MANAGE_ROLES]
);
```

## Guards

### Using Guards Directly

```typescript
@Controller('/api')
export class ApiController {
  constructor(private authService: AuthService) {}

  @Post('/protected')
  @UseGuard((req, res, next) => {
    const jwtGuard = this.authService.getJwtAuthGuard();
    try {
      jwtGuard.authenticate(req, res, next);
    } catch (error) {
      // Handle auth error
      throw error;
    }
  })
  protectedEndpoint() {
    return { data: 'secret' };
  }
}
```

### Role Guard

```typescript
const roleGuard = authService.getRoleGuard();

@Post('/admin-only')
@UseGuard((req, res, next) => 
  roleGuard.authorize([Role.ADMIN])(req, res, next)
)
adminOnly() {
  return { admin: true };
}
```

### Permission Guard

```typescript
const permissionGuard = authService.getPermissionGuard();

@Delete('/:id')
@UseGuard((req, res, next) =>
  permissionGuard.authorize([Permission.DELETE_USER])(req, res, next)
)
deleteUser(@Param('id') id: string) {
  return { deleted: true };
}
```

## Middleware Integration

### Auth Middleware

```typescript
import { createAuthMiddleware } from '@framework/core';

const app = new Application();

const authMiddleware = createAuthMiddleware(
  authService.getJwtService(),
  authService.getPermissionManager(),
  [/^\/auth\//, /^\/health$/] // public paths
);

app.use(authMiddleware);
```

### Role Check Middleware

```typescript
import { createRoleCheckMiddleware } from '@framework/core';

const roleCheckMiddleware = createRoleCheckMiddleware([Role.ADMIN]);

app.use('/api/admin', roleCheckMiddleware);
```

### Permission Check Middleware

```typescript
import { createPermissionCheckMiddleware } from '@framework/core';

const permCheckMiddleware = createPermissionCheckMiddleware(
  [Permission.DELETE_USER],
  false // require any permission
);

app.use('/api/users/:id', permCheckMiddleware);
```

## Token Management

### Create Tokens

```typescript
const jwtService = authService.getJwtService();

// Single access token
const accessToken = jwtService.createAccessToken(
  userId,
  email,
  [Role.USER],
  [Permission.READ_CONTENT]
);

// Token pair (access + refresh)
const tokens = jwtService.createTokenPair(
  userId,
  email,
  [Role.USER],
  [Permission.READ_CONTENT]
);

// Manual sign
const token = jwtService.sign({
  sub: userId,
  email,
  roles: [Role.USER],
  permissions: [],
});
```

### Verify Tokens

```typescript
try {
  const payload = jwtService.verify(token);
  console.log(payload); // { sub, email, roles, permissions, iat, exp, ... }
} catch (error) {
  console.error('Invalid token:', error.message);
}
```

### Refresh Tokens

```typescript
try {
  const newTokens = jwtService.refreshAccessToken(refreshToken);
  return { accessToken: newTokens.accessToken };
} catch (error) {
  throw new UnauthorizedException('Invalid refresh token');
}
```

### Token Expiration

```typescript
const isExpired = jwtService.isTokenExpired(token);

const expiresAt = jwtService.getTokenExpirationTime(token);
console.log(`Token expires at: ${expiresAt}`);
```

## Example: Complete Auth Flow

```typescript
// 1. User registers
@Post('/register')
@Public()
async register(@Body() body: { email: string; password: string }) {
  // Validate password strength
  const validation = this.authService.getPasswordService()
    .validatePasswordStrength(body.password);
  
  if (!validation.strong) {
    throw new BadRequestException(
      'Password is too weak',
      'WEAK_PASSWORD',
      { errors: validation.errors }
    );
  }

  // Hash password
  const hashedPassword = await this.authService
    .getPasswordService()
    .hashPassword(body.password);

  // Create user
  const user = await this.userService.create({
    email: body.email,
    password: hashedPassword,
    roles: [Role.USER],
  });

  // Create tokens
  const tokens = this.authService.createTokenPair(
    user.id,
    user.email,
    [Role.USER],
    []
  );

  return { ...tokens, user: { id: user.id, email: user.email } };
}

// 2. User logs in
@Post('/login')
@Public()
async login(@Body() credentials: { email: string; password: string }) {
  const user = await this.userService.findByEmail(credentials.email);
  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const isValid = await this.authService.getPasswordService()
    .comparePassword(credentials.password, user.password);

  if (!isValid) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const tokens = this.authService.createTokenPair(
    user.id,
    user.email,
    user.roles,
    []
  );

  return { ...tokens };
}

// 3. User accesses protected resource
@Get('/profile')
@Auth()
getProfile(@Req() req: any) {
  return { user: req.user };
}

// 4. User refreshes token
@Post('/refresh')
@Public()
refresh(@Body() body: { refreshToken: string }) {
  try {
    const tokens = this.authService.getJwtService()
      .refreshAccessToken(body.refreshToken);
    return tokens;
  } catch (error) {
    throw new UnauthorizedException('Invalid refresh token');
  }
}

// 5. Admin-only operations
@Get('/users')
@Auth()
@Roles(Role.ADMIN)
getAllUsers() {
  return { users: [] };
}

@Delete('/users/:id')
@Auth()
@Permissions(Permission.DELETE_USER)
deleteUser(@Param('id') id: string) {
  return { deleted: true };
}

// 6. User logs out (client-side token deletion)
@Post('/logout')
@Auth()
logout(@Req() req: any) {
  // Server-side: invalidate refresh token if stored
  // Client-side: delete access token and refresh token
  return { success: true };
}
```

## Best Practices

1. **Keep JWT Secret Safe** - Use environment variables, never hardcode
2. **Use HTTPS** - Always transmit tokens over encrypted channels
3. **Short Expiration** - Access tokens should expire in 1 hour or less
4. **Longer Refresh** - Refresh tokens can last 7-30 days
5. **Validate Input** - Always validate password strength
6. **Hash Passwords** - Always use bcrypt, never store plaintext
7. **Rotate Keys** - Periodically rotate JWT secrets
8. **Monitor Tokens** - Log token creation/validation for auditing
9. **Use Guards** - Leverage decorators for consistent protection
10. **Error Messages** - Be generic in error responses (don't reveal user exists)

## Security Considerations

### CORS Headers
Ensure CORS is configured to prevent token theft from unauthorized origins.

### Token Storage
- **Browser**: HttpOnly cookies (safest) or localStorage
- **Mobile**: Secure storage APIs
- **Never**: Session storage or localStorage for sensitive apps

### Refresh Token Rotation
Implement refresh token rotation to minimize damage from token theft.

### Rate Limiting
Implement rate limiting on `/login` and `/refresh` endpoints to prevent brute force attacks.

### Audit Logging
Log all authentication attempts, role changes, and permission modifications.

---

**Status**: ✅ Enterprise authentication fully implemented and production-ready
