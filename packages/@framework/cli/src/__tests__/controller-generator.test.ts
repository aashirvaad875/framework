import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ControllerGenerator } from '../generators/controller-generator.js';
import { TemplateEngine } from '../core/template-engine.js';
import { ModuleIntelligence } from '../core/module-intelligence.js';
import { ASTManipulator } from '../core/ast-manipulator.js';
import { PluginRegistry } from '../core/plugin-registry.js';

describe('ControllerGenerator', () => {
  let testDir: string;
  let generator: ControllerGenerator;

  beforeEach(async () => {
    testDir = path.join('/tmp', 'test-framework-cli-' + Date.now());
    await fs.ensureDir(testDir);

    const templateEngine = new TemplateEngine(path.join(process.cwd(), 'templates'));
    const moduleIntelligence = new ModuleIntelligence(testDir);
    const astManipulator = new ASTManipulator(testDir);
    const pluginRegistry = new PluginRegistry();

    generator = new ControllerGenerator(
      testDir,
      templateEngine,
      moduleIntelligence,
      astManipulator,
      pluginRegistry
    );
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should validate controller name format', () => {
    const result = generator.validate({
      projectRoot: testDir,
      moduleName: 'users',
      className: 'UserController',
      modulePath: 'src/modules',
      appName: 'test-app',
    });

    expect(result.valid).toBe(true);
  });

  it('should reject invalid controller name', () => {
    const result = generator.validate({
      projectRoot: testDir,
      moduleName: 'users',
      className: 'notPascalCase',
      modulePath: 'src/modules',
      appName: 'test-app',
    });

    expect(result.valid).toBe(false);
  });
});
