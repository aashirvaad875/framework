import type { Request, Response, NextFunction } from 'express';
import { JwtService } from './jwt.js';
import { PermissionManager } from './permissions.js';
import { JwtAuthGuard, RoleGuard, PermissionGuard, AuthRequest } from './guards.js';
import { UnauthorizedException } from '../exceptions/index.js';
import { Role, Permission } from './types.js';
import { getAuthMetadata, isPublicEndpoint } from './decorators.js';

export function createAuthMiddleware(
  jwtService: JwtService,
  permissionManager: PermissionManager,
  publicPaths: RegExp[] = []
) {
  const jwtAuthGuard = new JwtAuthGuard(jwtService);
  const roleGuard = new RoleGuard(permissionManager);
  const permissionGuard = new PermissionGuard(permissionManager);

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Check if path is public
    if (publicPaths.some((path) => path.test(req.path))) {
      next();
      return;
    }

    // Try to authenticate with JWT
    try {
      const token = req.get('authorization')?.substring(7);
      if (!token) {
        throw new UnauthorizedException('Missing authentication token');
      }

      const payload = jwtService.verify(token);
      req.user = payload;
      req.token = token;
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          message: (error as Error).message,
          code: 'UNAUTHORIZED',
          statusCode: 401,
        },
        path: req.path,
        timestamp: new Date().toISOString(),
      });
    }
  };
}

export function createRoleCheckMiddleware(requiredRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
          code: 'UNAUTHORIZED',
          statusCode: 401,
        },
      });
      return;
    }

    const hasRole = requiredRoles.some((r) => req.user!.roles.includes(r));

    if (!hasRole) {
      res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient role permissions',
          code: 'FORBIDDEN',
          statusCode: 403,
        },
      });
      return;
    }

    next();
  };
}

export function createPermissionCheckMiddleware(requiredPermissions: Permission[], requireAll = false) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
          code: 'UNAUTHORIZED',
          statusCode: 401,
        },
      });
      return;
    }

    const hasPermission = requireAll
      ? requiredPermissions.every((p) => req.user!.permissions.includes(p))
      : requiredPermissions.some((p) => req.user!.permissions.includes(p));

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          statusCode: 403,
        },
      });
      return;
    }

    next();
  };
}
