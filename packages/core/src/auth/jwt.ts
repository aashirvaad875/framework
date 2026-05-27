import { sign, verify, decode } from 'jsonwebtoken';
import { JwtPayload, TokenPair, AuthConfig } from './types.js';

export class JwtService {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    if (!config.jwtSecret) {
      throw new Error('JWT secret is required');
    }
    this.config = {
      algorithm: 'HS256',
      ...config,
    };
  }

  sign(payload: JwtPayload, expiresIn?: number): string {
    const opts = {
      expiresIn: expiresIn || this.config.jwtExpiration,
      issuer: this.config.issuer,
      audience: this.config.audience,
      algorithm: this.config.algorithm as any,
    };

    return sign(payload, this.config.jwtSecret, opts);
  }

  signTokenPair(payload: JwtPayload): TokenPair {
    const accessToken = this.sign(payload, this.config.jwtExpiration);
    const refreshToken = this.sign(payload, this.config.refreshTokenExpiration);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.jwtExpiration,
    };
  }

  verify(token: string): JwtPayload {
    try {
      return verify(token, this.config.jwtSecret, {
        algorithms: [this.config.algorithm as any],
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as JwtPayload;
    } catch (error) {
      throw new Error(`Invalid token: ${(error as Error).message}`);
    }
  }

  decode(token: string): JwtPayload | null {
    return decode(token) as JwtPayload | null;
  }

  isTokenExpired(token: string): boolean {
    const payload = this.decode(token);
    if (!payload || !payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  }

  getTokenExpirationTime(token: string): Date | null {
    const payload = this.decode(token);
    if (!payload || !payload.exp) return null;
    return new Date(payload.exp * 1000);
  }

  refreshAccessToken(refreshToken: string): TokenPair {
    const payload = this.verify(refreshToken);
    return this.signTokenPair(payload);
  }

  createAccessToken(userId: string, email: string, roles: any[], permissions: any[]): string {
    const payload: JwtPayload = {
      sub: userId,
      email,
      roles,
      permissions,
    };
    return this.sign(payload);
  }

  createTokenPair(userId: string, email: string, roles: any[], permissions: any[]): TokenPair {
    const payload: JwtPayload = {
      sub: userId,
      email,
      roles,
      permissions,
    };
    return this.signTokenPair(payload);
  }
}
