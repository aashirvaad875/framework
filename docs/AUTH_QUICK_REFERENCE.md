# Authentication Quick Reference

## Setup

```typescript
import { AuthService, AuthConfig } from '@framework/core';

const authService = new AuthService({
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiration: 3600,           // 1 hour
  refreshTokenExpiration: 604800, // 7 days
  issuer: 'your-app',
  audience: 'your-app-users',
});
```

## Decorators

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@Auth()` | Require authentication | `@Get('/profile') @Auth() getProfile() { }` |
| `@Roles(...)` | Require specific roles | `@Get('/admin') @Roles(Role.ADMIN) getAdmin() { }` |
| `@Permissions(...)` | Require permission (any) | `@Delete('/:id') @Permissions(Permission.DELETE_USER) delete() { }` |
| `@RequireAllPermissions(...)` | Require all permissions | `@Post('/purge') @RequireAllPermissions(P.DELETE, P.MANAGE) purge() { }` |
| `@Public()` | Mark as public | `@Post('/login') @Public() login() { }` |

## Services

### JWT Service
```typescript
const jwt = authService.getJwtService();

jwt.sign(payload, expiresIn);
jwt.signTokenPair(payload);        // { accessToken, refreshToken, expiresIn }
jwt.verify(token);                 // Throws if invalid
jwt.decode(token);                 // No verification
jwt.isTokenExpired(token);
jwt.getTokenExpirationTime(token);
jwt.refreshAccessToken(refreshToken);
jwt.createAccessToken(userId, email, roles, perms);
jwt.createTokenPair(userId, email, roles, perms);
```

### Password Service
```typescript
const pwd = authService.getPasswordService();

pwd.hashPassword(plainPassword);           // async
pwd.comparePassword(plainPassword, hash);  // async
pwd.validatePasswordStrength(password);    // { strong: bool, errors: [] }
```

### Permission Manager
```typescript
const perm = authService.getPermissionManager();

perm.getPermissionsForRole(role);                    // Permission[]
perm.getPermissionsForRoles([role1, role2]);        // Permission[]
perm.hasPermission(roles, permission);              // bool
perm.hasAnyPermission(roles, [perm1, perm2]);       // bool
perm.hasAllPermissions(roles, [perm1, perm2]);      // bool
perm.hasRole(roles, targetRole);                    // bool
perm.hasAnyRole(roles, [role1, role2]);             // bool
perm.hasAllRoles(roles, [role1, role2]);            // bool
perm.setRolePermissions(role, [perm1, perm2]);      // void
perm.addPermissionToRole(role, permission);         // void
perm.removePermissionFromRole(role, permission);    // void
```

### Guards
```typescript
const jwtGuard = authService.getJwtAuthGuard();
const roleGuard = authService.getRoleGuard();
const permGuard = authService.getPermissionGuard();
const apiKeyGuard = authService.getApiKeyGuard();
const compositeGuard = authService.getCompositeAuthGuard();

// Use with @UseGuard decorator
@Post('/data')
@UseGuard((req, res, next) => jwtGuard.authenticate(req, res, next))
handleData() { }

// Or use role/permission guard methods
roleGuard.authorize([Role.ADMIN]);      // Returns middleware
permGuard.authorize([Permission.DELETE], false); // Returns middleware
```

## Roles

| Role | Permissions |
|------|-------------|
| `Role.ADMIN` | All (13) permissions |
| `Role.MODERATOR` | Content management, user read, logging |
| `Role.USER` | Read, create content, read profiles |
| `Role.GUEST` | Read-only access |

## Permissions (13 Total)

**User Management (4)**
- `Permission.CREATE_USER`
- `Permission.READ_USER`
- `Permission.UPDATE_USER`
- `Permission.DELETE_USER`

**Role Management (1)**
- `Permission.MANAGE_ROLES`

**Content Management (4)**
- `Permission.CREATE_CONTENT`
- `Permission.READ_CONTENT`
- `Permission.UPDATE_CONTENT`
- `Permission.DELETE_CONTENT`

**Admin Operations (3)**
- `Permission.SYSTEM_ADMIN`
- `Permission.VIEW_LOGS`
- `Permission.MANAGE_SETTINGS`

## Common Patterns

### Registration
```typescript
@Post('/register')
@Public()
async register(@Body() body: { email, password, name }) {
  const validation = authService.getPasswordService()
    .validatePasswordStrength(body.password);
  if (!validation.strong) {
    throw new BadRequestException('Weak password', 'WEAK_PASSWORD');
  }

  const hash = await authService.getPasswordService()
    .hashPassword(body.password);

  // Create user in database
  const user = await userService.create({
    ...body,
    password: hash,
    roles: [Role.USER],
  });

  const tokens = authService.createTokenPair(
    user.id, user.email, user.roles, []
  );

  return { ...tokens, user: { id: user.id, email: user.email } };
}
```

### Login
```typescript
@Post('/login')
@Public()
async login(@Body() body: { email, password }) {
  const user = await userService.findByEmail(body.email);
  if (!user) throw new UnauthorizedException('Invalid credentials');

  const isValid = await authService.getPasswordService()
    .comparePassword(body.password, user.password);
  if (!isValid) throw new UnauthorizedException('Invalid credentials');

  const tokens = authService.createTokenPair(
    user.id, user.email, user.roles, user.permissions
  );

  return tokens;
}
```

### Access Protected Resource
```typescript
@Get('/profile')
@Auth()
getProfile(@Req() req: any) {
  // req.user = JwtPayload { sub, email, roles, permissions, iat, exp }
  return { user: req.user };
}
```

### Admin-Only Endpoint
```typescript
@Get('/stats')
@Auth()
@Roles(Role.ADMIN)
getStats() {
  return { totalUsers: 1000 };
}
```

### Permission-Based Endpoint
```typescript
@Delete('/users/:id')
@Auth()
@Permissions(Permission.DELETE_USER)
deleteUser(@Param('id') id: string) {
  return { deleted: true };
}
```

### Refresh Token
```typescript
@Post('/refresh')
@Public()
refresh(@Body() body: { refreshToken: string }) {
  try {
    const tokens = authService.getJwtService()
      .refreshAccessToken(body.refreshToken);
    return tokens;
  } catch (error) {
    throw new UnauthorizedException('Invalid refresh token');
  }
}
```

### API Key Authentication
```typescript
const apiKeyGuard = authService.getApiKeyGuard();

// Register
apiKeyGuard.registerApiKey('key', 'secret', [Role.USER]);

// Use in route
@Post('/api-data')
@UseGuard((req, res, next) => apiKeyGuard.authenticate(req, res, next))
handleApiKeyRequest() {
  return { success: true };
}
```

## Headers & Query Params

### JWT
```
Authorization: Bearer <token>
OR
GET /api/resource?token=<token>
```

### API Key
```
x-api-key: <key>
x-api-secret: <secret>
```

## Token Payload

```typescript
{
  sub: "user-id",              // subject
  email: "user@example.com",
  roles: [Role.USER],
  permissions: [Permission.READ_CONTENT],
  iat: 1234567890,            // issued at
  exp: 1234571490,            // expiration
  aud: "your-app-users",      // audience
  iss: "your-app"             // issuer
}
```

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | No valid token/credentials |
| `INVALID_TOKEN` | 401 | Token signature/format invalid |
| `TOKEN_EXPIRED` | 401 | Token lifetime exceeded |
| `FORBIDDEN` | 403 | Valid auth but insufficient permissions |
| `WEAK_PASSWORD` | 400 | Password doesn't meet requirements |
| `USER_EXISTS` | 409 | Email already registered |

## Best Practices

1. ✅ Use HTTPS only for token transmission
2. ✅ Keep JWT secret in environment variables
3. ✅ Use short access token expiration (1-2 hours)
4. ✅ Use longer refresh token expiration (7-30 days)
5. ✅ Hash passwords with bcrypt, never store plaintext
6. ✅ Store refresh tokens securely (secure cookies recommended)
7. ✅ Implement rate limiting on /login and /refresh
8. ✅ Log authentication events for auditing
9. ✅ Use generic error messages (don't reveal user exists)
10. ✅ Rotate JWT secrets periodically

## Middleware Example

```typescript
import { createAuthMiddleware } from '@framework/core';

const authMiddleware = createAuthMiddleware(
  authService.getJwtService(),
  authService.getPermissionManager(),
  [/^\/auth\//, /^\/health$/] // public paths
);

app.use(authMiddleware);
```

---

Save this reference for quick access to authentication APIs!
