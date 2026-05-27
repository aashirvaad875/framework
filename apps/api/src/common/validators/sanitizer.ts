import { CreateUserDto, UpdateUserDto } from './dto.js';

export class RequestSanitizer {
  static sanitizeString(value: string): string {
    if (!value) return '';
    return value
      .trim()
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/["']/g, '') // Remove quotes
      .substring(0, 1000); // Limit length
  }

  static sanitizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  static sanitizeUserDto<T extends CreateUserDto | UpdateUserDto>(dto: T): T {
    const sanitized: any = { ...dto };
    if (sanitized.email) sanitized.email = this.sanitizeEmail(sanitized.email);
    if (sanitized.name) sanitized.name = this.sanitizeString(sanitized.name);
    return sanitized;
  }

  static sanitizeQuery(query: any): any {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
