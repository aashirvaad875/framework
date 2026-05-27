import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ModuleGenerator } from '../generators/module-generator.js';
import { TemplateEngine } from '../core/template-engine.js';
import { ModuleIntelligence } from '../core/module-intelligence.js';
import { ASTManipulator } from '../core/ast-manipulator.js';
import { PluginRegistry } from '../core/plugin-registry.js';

describe('ModuleGenerator', () => {
  let testDir: string;
  let generator: ModuleGenerator;

  beforeEach(async () => {
    testDir = path.join('/tmp', 'test-framework-cli-' + Date.now());
    await fs.ensureDir(testDir);

    const templateEngine = new TemplateEngine(path.join(process.cwd(), 'templates'));
    const moduleIntelligence = new ModuleIntelligence(testDir);
    const astManipulator = new ASTManipulator(testDir);
    const pluginRegistry = new PluginRegistry();

    generator = new ModuleGenerator(
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

  it('should validate module name format', () => {
    const result = generator.validate({
      projectRoot: testDir,
      moduleName: 'user-profile',
      modulePath: 'src/modules',
      appName: 'test-app',
    });

    expect(result.valid).toBe(true);
  });

  it('should reject uppercase module names', () => {
    const result = generator.validate({
      projectRoot: testDir,
      moduleName: 'UserProfile',
      modulePath: 'src/modules',
      appName: 'test-app',
    });

    expect(result.valid).toBe(false);
  });
});
