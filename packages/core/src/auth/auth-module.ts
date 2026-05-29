import { Injectable, Module } from '../index.js';
import { JwtService } from './jwt.js';
import { PasswordService } from './password.js';
import { PermissionManager } from './permissions.js';
import {
  JwtAuthGuard,
  RoleGuard,
  PermissionGuard,
  ApiKeyGuard,
  CompositeAuthGuard,
} from './guards.js';
import type { AuthConfig } from './types.js';
import { Role, Permission } from './types.js';

@Injectable()
export class AuthService {
  private jwtService: JwtService;
  private passwordService: PasswordService;
  private permissionManager: PermissionManager;
  private jwtAuthGuard: JwtAuthGuard;
  private roleGuard: RoleGuard;
  private permissionGuard: PermissionGuard;
  private apiKeyGuard: ApiKeyGuard;
  private compositeAuthGuard: CompositeAuthGuard;

  constructor(config: AuthConfig) {
    this.jwtService = new JwtService(config);
    this.passwordService = new PasswordService();
    this.permissionManager = new PermissionManager();
    this.jwtAuthGuard = new JwtAuthGuard(this.jwtService);
    this.roleGuard = new RoleGuard(this.permissionManager);
    this.permissionGuard = new PermissionGuard(this.permissionManager);
    this.apiKeyGuard = new ApiKeyGuard();
    this.compositeAuthGuard = new CompositeAuthGuard(this.jwtAuthGuard, this.apiKeyGuard);
  }

  // JWT Service accessors
  getJwtService(): JwtService {
    return this.jwtService;
  }

  // Password Service accessors
  getPasswordService(): PasswordService {
    return this.passwordService;
  }

  // Permission Manager accessors
  getPermissionManager(): PermissionManager {
    return this.permissionManager;
  }

  // Guard accessors
  getJwtAuthGuard(): JwtAuthGuard {
    return this.jwtAuthGuard;
  }

  getRoleGuard(): RoleGuard {
    return this.roleGuard;
  }

  getPermissionGuard(): PermissionGuard {
    return this.permissionGuard;
  }

  getApiKeyGuard(): ApiKeyGuard {
    return this.apiKeyGuard;
  }

  getCompositeAuthGuard(): CompositeAuthGuard {
    return this.compositeAuthGuard;
  }

  // Convenience methods
  createTokenPair(userId: string, email: string, roles: Role[], permissions: Permission[] = []) {
    return this.jwtService.createTokenPair(userId, email, roles, permissions);
  }

  createAccessToken(userId: string, email: string, roles: Role[], permissions: Permission[] = []) {
    return this.jwtService.createAccessToken(userId, email, roles, permissions);
  }

  hashPassword(password: string): Promise<string> {
    return this.passwordService.hashPassword(password);
  }

  comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return this.passwordService.comparePassword(password, hashedPassword);
  }

  validatePasswordStrength(password: string) {
    return this.passwordService.validatePasswordStrength(password);
  }

  hasPermission(roles: Role[], permission: Permission): boolean {
    return this.permissionManager.hasPermission(roles, permission);
  }

  hasRole(roles: Role[], targetRole: Role): boolean {
    return this.permissionManager.hasRole(roles, targetRole);
  }
}

export const createAuthModule = (config: AuthConfig) => {
  @Module({
    providers: [
      {
        provide: AuthService,
        useValue: new AuthService(config),
      },
    ],
    exports: [AuthService],
  })
  class AuthModule {}

  return AuthModule;
};
