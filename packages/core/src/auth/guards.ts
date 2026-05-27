import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedException, ForbiddenException } from '../exceptions/index.js';
import { JwtService } from './jwt.js';
import { PermissionManager } from './permissions.js';
import { Role, Permission, JwtPayload } from './types.js';

export interface AuthRequest extends Request {
  user?: JwtPayload;
  token?: string;
  apiKey?: string;
}

export class JwtAuthGuard {
  constructor(private jwtService: JwtService) {}

  authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
    const token = this.extractToken(req);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = this.jwtService.verify(token);
      req.user = payload;
      req.token = token;
      next();
    } catch (error) {
      throw new UnauthorizedException(`Invalid token: ${(error as Error).message}`);
    }
  }

  private extractToken(req: AuthRequest): string | null {
    const authHeader = req.get('authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    if (req.query.token && typeof req.query.token === 'string') {
      return req.query.token;
    }

    return null;
  }

  hasValidToken(req: AuthRequest): boolean {
    const token = this.extractToken(req);
    if (!token) return false;

    try {
      this.jwtService.verify(token);
      return true;
    } catch {
      return false;
    }
  }
}

export class RoleGuard {
  constructor(private permissionManager: PermissionManager) {}

  authorize(requiredRoles: Role[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        throw new UnauthorizedException('User not authenticated');
      }

      if (!this.permissionManager.hasAnyRole(req.user.roles, requiredRoles)) {
        throw new ForbiddenException('Insufficient role permissions');
      }

      next();
    };
  }
}

export class PermissionGuard {
  constructor(private permissionManager: PermissionManager) {}

  authorize(requiredPermissions: Permission[], requireAll: boolean = false) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        throw new UnauthorizedException('User not authenticated');
      }

      const hasPermission = requireAll
        ? this.permissionManager.hasAllPermissions(req.user.roles, requiredPermissions)
        : this.permissionManager.hasAnyPermission(req.user.roles, requiredPermissions);

      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }

      next();
    };
  }
}

export class ApiKeyGuard {
  private apiKeys: Map<string, { secret: string; active: boolean; roles: Role[] }> = new Map();

  registerApiKey(
    key: string,
    secret: string,
    roles: Role[] = [Role.USER],
    active: boolean = true
  ): void {
    this.apiKeys.set(key, { secret, active, roles });
  }

  authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
    const apiKey = this.extractApiKey(req);

    if (!apiKey) {
      throw new UnauthorizedException('Missing API key');
    }

    const keyData = this.apiKeys.get(apiKey.key);

    if (!keyData || !keyData.active) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (keyData.secret !== apiKey.secret) {
      throw new UnauthorizedException('Invalid API secret');
    }

    req.user = {
      sub: apiKey.key,
      email: `api-${apiKey.key}@system`,
      roles: keyData.roles,
      permissions: [],
    };

    req.apiKey = apiKey.key;
    next();
  }

  private extractApiKey(req: AuthRequest): { key: string; secret: string } | null {
    const key = req.get('x-api-key');
    const secret = req.get('x-api-secret');

    if (key && secret) {
      return { key, secret };
    }

    return null;
  }

  deactivateApiKey(key: string): void {
    const keyData = this.apiKeys.get(key);
    if (keyData) {
      keyData.active = false;
    }
  }

  activateApiKey(key: string): void {
    const keyData = this.apiKeys.get(key);
    if (keyData) {
      keyData.active = true;
    }
  }
}

export class CompositeAuthGuard {
  constructor(
    private jwtGuard: JwtAuthGuard,
    private apiKeyGuard: ApiKeyGuard
  ) {}

  authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
    // Try JWT first
    if (req.get('authorization')?.startsWith('Bearer ')) {
      try {
        this.jwtGuard.authenticate(req, res, () => {});
        next();
        return;
      } catch (error) {
        // Fall through to API key
      }
    }

    // Try API key
    if (req.get('x-api-key')) {
      try {
        this.apiKeyGuard.authenticate(req, res, () => {});
        next();
        return;
      } catch (error) {
        // Fall through to error
      }
    }

    throw new UnauthorizedException('No valid authentication method provided');
  }
}
