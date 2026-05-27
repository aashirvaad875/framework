export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
  MODERATOR = 'moderator',
}

export enum Permission {
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

export interface JwtPayload {
  sub: string; // subject (user id)
  email: string;
  roles: Role[];
  permissions: Permission[];
  iat?: number; // issued at
  exp?: number; // expiration time
  aud?: string; // audience
  iss?: string; // issuer
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthContext {
  userId: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
  token: string;
  refreshToken?: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiration: number; // in seconds
  refreshTokenExpiration: number; // in seconds
  issuer?: string;
  audience?: string;
  algorithm?: 'HS256' | 'HS512' | 'RS256';
}

export interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope?: string[];
}

export interface ApiKeyAuth {
  key: string;
  secret: string;
  active: boolean;
  createdAt: Date;
  expiresAt?: Date;
}
