import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { AppGenerator } from '../generators/app-generator.js';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

function makeGenerator(tmpDir: string): AppGenerator {
  const templateEngine = {
    templatesPath: path.join(process.cwd(), 'templates'),
    render: vi.fn(),
  } as any;
  return new AppGenerator(tmpDir, templateEngine, {} as any, {} as any, {} as any);
}

describe('AppGenerator', () => {
  let tmpDir: string;
  let generator: AppGenerator;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fw-test-'));
    generator = makeGenerator(tmpDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
    vi.clearAllMocks();
  });

  it('returns error for invalid app name', async () => {
    const result = await generator.execute({
      projectRoot: tmpDir,
      appName: 'Invalid Name!',
      modulePath: 'src/modules',
      skipInstall: true,
    });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('lowercase');
  });

  it('creates all expected scaffold files', async () => {
    const targetPath = path.join(tmpDir, 'my-app');
    const result = await generator.execute({
      projectRoot: tmpDir,
      appName: 'my-app',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: true,
    });

    expect(result.success).toBe(true);
    const expectedFiles = [
      'package.json',
      'tsconfig.json',
      '.prettierrc',
      'eslint.config.js',
      'vitest.config.ts',
      'README.md',
      '.env.example',
      '.gitignore',
      '.dockerignore',
      'Dockerfile',
      'docker-compose.yml',
      'src/main.ts',
      'src/config/app.config.ts',
      'src/config/database.config.ts',
      'src/modules/health/health.module.ts',
      'src/modules/health/controllers/health.controller.ts',
      'src/modules/users/user.module.ts',
      'src/modules/users/entities/user.entity.ts',
      'src/modules/users/dto/create-user.dto.ts',
      'src/modules/users/dto/update-user.dto.ts',
      'src/modules/users/dto/index.ts',
      'src/modules/users/repositories/user.repository.ts',
      'src/modules/users/services/user.service.ts',
      'src/modules/users/controllers/user.controller.ts',
    ];
    for (const file of expectedFiles) {
      expect(await fs.pathExists(path.join(targetPath, file)), `expected ${file} to exist`).toBe(
        true
      );
    }
  });

  it('replaces __APP_NAME__ token in package.json name field', async () => {
    const targetPath = path.join(tmpDir, 'cool-api');
    await generator.execute({
      projectRoot: tmpDir,
      appName: 'cool-api',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: true,
    });
    const pkg = await fs.readJson(path.join(targetPath, 'package.json'));
    expect(pkg.name).toBe('cool-api');
  });

  it('replaces __APP_NAME__ token in README.md', async () => {
    const targetPath = path.join(tmpDir, 'cool-api');
    await generator.execute({
      projectRoot: tmpDir,
      appName: 'cool-api',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: true,
    });
    const readme = await fs.readFile(path.join(targetPath, 'README.md'), 'utf-8');
    expect(readme).toContain('cool-api');
    expect(readme).not.toContain('__APP_NAME__');
  });

  it('calls git init in the target directory', async () => {
    const { execSync } = await import('child_process');
    const targetPath = path.join(tmpDir, 'my-app');
    await generator.execute({
      projectRoot: tmpDir,
      appName: 'my-app',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: true,
    });
    expect(execSync).toHaveBeenCalledWith('git init', expect.objectContaining({ cwd: targetPath }));
  });

  it('does not call npm install when skipInstall is true', async () => {
    const { execSync } = await import('child_process');
    const targetPath = path.join(tmpDir, 'my-app');
    await generator.execute({
      projectRoot: tmpDir,
      appName: 'my-app',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: true,
    });
    const calls = (execSync as any).mock.calls.map((c: any[]) => c[0] as string);
    expect(calls.some((c: string) => c.includes('install'))).toBe(false);
  });

  it('calls npm install when skipInstall is false', async () => {
    const { execSync } = await import('child_process');
    const targetPath = path.join(tmpDir, 'my-app');
    await generator.execute({
      projectRoot: tmpDir,
      appName: 'my-app',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: false,
    });
    expect(execSync).toHaveBeenCalledWith(
      'npm install',
      expect.objectContaining({ cwd: targetPath })
    );
  });

  it('uses pnpm install when packageManager is pnpm', async () => {
    const { execSync } = await import('child_process');
    const targetPath = path.join(tmpDir, 'my-app');
    await generator.execute({
      projectRoot: tmpDir,
      appName: 'my-app',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: false,
      packageManager: 'pnpm',
    });
    expect(execSync).toHaveBeenCalledWith(
      'pnpm install',
      expect.objectContaining({ cwd: targetPath })
    );
  });

  it('returns error when target dir is non-empty and force is false', async () => {
    const targetPath = path.join(tmpDir, 'my-app');
    await fs.ensureDir(targetPath);
    await fs.writeFile(path.join(targetPath, 'existing.txt'), 'hello');

    const result = await generator.execute({
      projectRoot: tmpDir,
      appName: 'my-app',
      modulePath: 'src/modules',
      path: targetPath,
      skipInstall: true,
      force: false,
    });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('already exists');
  });
});
