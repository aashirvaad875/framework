import { Role, Permission } from './types.js';

export class PermissionManager {
  private rolePermissions: Map<Role, Permission[]> = new Map();

  constructor() {
    this.initializeDefaultRoles();
  }

  private initializeDefaultRoles(): void {
    // Admin has all permissions
    this.rolePermissions.set(Role.ADMIN, Object.values(Permission));

    // Moderator has content management and viewing permissions
    this.rolePermissions.set(Role.MODERATOR, [
      Permission.READ_CONTENT,
      Permission.CREATE_CONTENT,
      Permission.UPDATE_CONTENT,
      Permission.DELETE_CONTENT,
      Permission.READ_USER,
      Permission.VIEW_LOGS,
    ]);

    // User has basic read and create permissions
    this.rolePermissions.set(Role.USER, [
      Permission.READ_CONTENT,
      Permission.CREATE_CONTENT,
      Permission.UPDATE_CONTENT,
      Permission.READ_USER,
    ]);

    // Guest has read-only permissions
    this.rolePermissions.set(Role.GUEST, [Permission.READ_CONTENT, Permission.READ_USER]);
  }

  getPermissionsForRole(role: Role): Permission[] {
    return this.rolePermissions.get(role) || [];
  }

  getPermissionsForRoles(roles: Role[]): Permission[] {
    const permissions = new Set<Permission>();
    for (const role of roles) {
      const rolePerms = this.getPermissionsForRole(role);
      rolePerms.forEach((p) => permissions.add(p));
    }
    return Array.from(permissions);
  }

  hasPermission(roles: Role[], permission: Permission): boolean {
    const permissions = this.getPermissionsForRoles(roles);
    return permissions.includes(permission);
  }

  hasAnyPermission(roles: Role[], permissions: Permission[]): boolean {
    const rolePermissions = this.getPermissionsForRoles(roles);
    return permissions.some((p) => rolePermissions.includes(p));
  }

  hasAllPermissions(roles: Role[], permissions: Permission[]): boolean {
    const rolePermissions = this.getPermissionsForRoles(roles);
    return permissions.every((p) => rolePermissions.includes(p));
  }

  setRolePermissions(role: Role, permissions: Permission[]): void {
    this.rolePermissions.set(role, permissions);
  }

  addPermissionToRole(role: Role, permission: Permission): void {
    const permissions = this.getPermissionsForRole(role);
    if (!permissions.includes(permission)) {
      permissions.push(permission);
      this.rolePermissions.set(role, permissions);
    }
  }

  removePermissionFromRole(role: Role, permission: Permission): void {
    const permissions = this.getPermissionsForRole(role);
    const index = permissions.indexOf(permission);
    if (index > -1) {
      permissions.splice(index, 1);
      this.rolePermissions.set(role, permissions);
    }
  }

  hasRole(roles: Role[], targetRole: Role): boolean {
    return roles.includes(targetRole);
  }

  hasAnyRole(roles: Role[], targetRoles: Role[]): boolean {
    return targetRoles.some((r) => roles.includes(r));
  }

  hasAllRoles(roles: Role[], targetRoles: Role[]): boolean {
    return targetRoles.every((r) => roles.includes(r));
  }
}
