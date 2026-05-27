import { Role, Permission } from './types.js';

const AUTH_METADATA_KEY = Symbol('auth:metadata');
const ROLES_METADATA_KEY = Symbol('auth:roles');
const PERMISSIONS_METADATA_KEY = Symbol('auth:permissions');
const PUBLIC_METADATA_KEY = Symbol('auth:public');

export interface AuthMetadata {
  roles?: Role[];
  permissions?: Permission[];
  requireAll?: boolean;
  public?: boolean;
}

/**
 * @Auth() - Mark endpoint as requiring authentication
 *
 * Usage:
 * @Auth()
 * @Get('/profile')
 * getProfile() { ... }
 */
export function Auth(metadata?: Partial<AuthMetadata>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingMetadata = Reflect.getOwnMetadata(AUTH_METADATA_KEY, descriptor.value) || {};
    Reflect.defineMetadata(
      AUTH_METADATA_KEY,
      { ...existingMetadata, ...metadata },
      descriptor.value
    );
  };
}

/**
 * @Roles(...roles) - Require specific roles
 *
 * Usage:
 * @Roles(Role.ADMIN, Role.MODERATOR)
 * @Get('/admin/stats')
 * getStats() { ... }
 */
export function Roles(...roles: Role[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(ROLES_METADATA_KEY, roles, descriptor.value);
  };
}

/**
 * @Permissions(...permissions) - Require specific permissions (any)
 *
 * Usage:
 * @Permissions(Permission.DELETE_USER)
 * @Delete('/:id')
 * deleteUser() { ... }
 */
export function Permissions(...permissions: Permission[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(PERMISSIONS_METADATA_KEY, permissions, descriptor.value);
  };
}

/**
 * @RequireAllPermissions(...permissions) - Require all specific permissions
 *
 * Usage:
 * @RequireAllPermissions(Permission.DELETE_USER, Permission.MANAGE_ROLES)
 * @Delete('/:id')
 * deleteUserPermanently() { ... }
 */
export function RequireAllPermissions(...permissions: Permission[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(PERMISSIONS_METADATA_KEY, { permissions, requireAll: true }, descriptor.value);
  };
}

/**
 * @Public() - Mark endpoint as public (no authentication required)
 *
 * Usage:
 * @Public()
 * @Post('/login')
 * login() { ... }
 */
export function Public() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(PUBLIC_METADATA_KEY, true, descriptor.value);
  };
}

/**
 * Get auth metadata from a method
 */
export function getAuthMetadata(target: any, propertyKey: string, handler: Function): AuthMetadata {
  const auth = Reflect.getOwnMetadata(AUTH_METADATA_KEY, handler) || {};
  const roles = Reflect.getOwnMetadata(ROLES_METADATA_KEY, handler);
  const permissions = Reflect.getOwnMetadata(PERMISSIONS_METADATA_KEY, handler);
  const isPublic = Reflect.getOwnMetadata(PUBLIC_METADATA_KEY, handler);

  return {
    public: isPublic || false,
    roles,
    permissions: Array.isArray(permissions) ? permissions : permissions?.permissions,
    requireAll: permissions?.requireAll || false,
    ...auth,
  };
}

/**
 * Check if endpoint is public
 */
export function isPublicEndpoint(handler: Function): boolean {
  return Reflect.getOwnMetadata(PUBLIC_METADATA_KEY, handler) === true;
}

/**
 * Check if endpoint requires authentication
 */
export function requiresAuthentication(handler: Function): boolean {
  if (isPublicEndpoint(handler)) return false;
  return true;
}

export {
  AUTH_METADATA_KEY,
  ROLES_METADATA_KEY,
  PERMISSIONS_METADATA_KEY,
  PUBLIC_METADATA_KEY,
};
