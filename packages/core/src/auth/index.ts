// Types and Interfaces
export type { JwtPayload, TokenPair, AuthContext, AuthConfig, OAuthProvider, ApiKeyAuth } from './types.js';
export { Role, Permission } from './types.js';

// Services
export { JwtService } from './jwt.js';
export { PasswordService } from './password.js';
export { PermissionManager } from './permissions.js';

// Guards
export { JwtAuthGuard, RoleGuard, PermissionGuard, ApiKeyGuard, CompositeAuthGuard } from './guards.js';
export type { AuthRequest } from './guards.js';

// Decorators
export { Auth, Roles, Permissions, RequireAllPermissions, Public } from './decorators.js';
export { getAuthMetadata, isPublicEndpoint, requiresAuthentication } from './decorators.js';
export {
  AUTH_METADATA_KEY,
  ROLES_METADATA_KEY,
  PERMISSIONS_METADATA_KEY,
  PUBLIC_METADATA_KEY,
} from './decorators.js';
export type { AuthMetadata } from './decorators.js';

// Middleware
export { createAuthMiddleware, createRoleCheckMiddleware, createPermissionCheckMiddleware } from './middleware.js';

// Auth Service & Module
export { AuthService, createAuthModule } from './auth-module.js';
