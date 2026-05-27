export class NamingUtility {
  // kebab-case to PascalCase: user-controller → UserController
  static toPascalCase(kebab: string): string {
    return kebab
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  // PascalCase to kebab-case: UserController → user-controller
  static toKebabCase(pascal: string): string {
    return pascal.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  // PascalCase to camelCase: UserController → userController
  static toCamelCase(pascal: string): string {
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  // PascalCase to snake_case: UserController → user_controller
  static toSnakeCase(pascal: string): string {
    return pascal.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  }

  // Generate filename from class name: UserController → user.controller.ts
  static classNameToFileName(className: string, suffix: string = ''): string {
    const withoutSuffix = className.replace(new RegExp(suffix + '$'), '');
    return this.toKebabCase(withoutSuffix) + (suffix ? '.' + this.toKebabCase(suffix) : '') + '.ts';
  }
}
