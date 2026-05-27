export class ValidationUtility {
  static validateClassName(name: string): { valid: boolean; error?: string } {
    if (!name) {
      return { valid: false, error: 'Class name is required' };
    }
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      return { valid: false, error: 'Class name must be PascalCase (e.g., UserController)' };
    }
    return { valid: true };
  }

  static validateModuleName(name: string): { valid: boolean; error?: string } {
    if (!name) {
      return { valid: false, error: 'Module name is required' };
    }
    if (!/^[a-z0-9-]+$/.test(name)) {
      return {
        valid: false,
        error: 'Module name must be lowercase with hyphens (e.g., user-profile)',
      };
    }
    return { valid: true };
  }

  static validatePath(filePath: string, projectRoot: string): { valid: boolean; error?: string } {
    const resolved = require('path').resolve(projectRoot, filePath);
    if (!resolved.startsWith(projectRoot)) {
      return { valid: false, error: 'Path must be within project root' };
    }
    return { valid: true };
  }

  static validateAppName(name: string): { valid: boolean; error?: string } {
    if (!name) {
      return { valid: false, error: 'App name is required' };
    }
    if (!/^[a-z0-9-]+$/.test(name)) {
      return { valid: false, error: 'App name must be lowercase with hyphens' };
    }
    return { valid: true };
  }
}
