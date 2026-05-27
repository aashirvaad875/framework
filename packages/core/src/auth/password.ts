import { hash, compare } from 'bcrypt';

export class PasswordService {
  private readonly saltRounds: number = 10;

  constructor(saltRounds?: number) {
    if (saltRounds) {
      this.saltRounds = saltRounds;
    }
  }

  async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 1) {
      throw new Error('Password cannot be empty');
    }
    return hash(password, this.saltRounds);
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    if (!password || !hashedPassword) {
      return false;
    }
    return compare(password, hashedPassword);
  }

  validatePasswordStrength(password: string): {
    strong: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      strong: errors.length === 0,
      errors,
    };
  }
}
