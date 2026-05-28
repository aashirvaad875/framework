import path from 'path';
import fs from 'fs-extra';
import { execSync } from 'child_process';
import { GeneratorContext, GenerateResult } from '../types.js';
import { BaseGenerator } from './base-generator.js';
import { ValidationUtility } from '../utils/index.js';

export class AppGenerator extends BaseGenerator {
  getTemplateName(): string {
    return 'app';
  }

  getRegistrationType(): null {
    return null;
  }

  validate(context: GeneratorContext): { valid: boolean; error?: string } {
    return ValidationUtility.validateAppName(context.appName!);
  }

  protected generateFilePath(context: GeneratorContext): string {
    return path.join(context.path || process.cwd(), 'src', 'main.ts');
  }

  protected getGeneratorType(): string {
    return 'Application';
  }

  async execute(context: GeneratorContext): Promise<GenerateResult> {
    const validation = this.validate(context);
    if (!validation.valid) {
      return { success: false, files: [], errors: [validation.error!], message: validation.error! };
    }

    const appName = context.appName!;
    const targetPath = context.path || path.join(process.cwd(), appName);
    const skipInstall = context.skipInstall ?? false;
    const packageManager = context.packageManager ?? 'npm';

    try {
      if ((await fs.pathExists(targetPath)) && !context.force) {
        const items = await fs.readdir(targetPath);
        if (items.length > 0) {
          return {
            success: false,
            files: [],
            errors: [
              `Directory already exists and is not empty: ${targetPath}. Use --force to overwrite.`,
            ],
            message: 'Target directory already exists',
          };
        }
      }

      if (context.force && (await fs.pathExists(targetPath))) {
        await fs.emptyDir(targetPath);
      }
      const scaffoldPath = path.join(this.templateEngine.templatesPath, 'project-scaffold');
      await fs.copy(scaffoldPath, targetPath, { overwrite: true });
      await this.replaceTokens(targetPath, appName);

      try {
        execSync('git init', { cwd: targetPath, stdio: 'pipe' });
      } catch {
        console.warn('Warning: git init failed. Initialize manually.');
      }

      if (!skipInstall) {
        const installCmd =
          packageManager === 'pnpm'
            ? 'pnpm install'
            : packageManager === 'yarn'
              ? 'yarn install'
              : 'npm install';
        try {
          execSync(installCmd, { cwd: targetPath, stdio: 'inherit' });
        } catch {
          console.warn(`Warning: ${installCmd} failed. Run it manually in the project directory.`);
        }
      }

      const runCmd =
        packageManager === 'pnpm' ? 'pnpm' : packageManager === 'yarn' ? 'yarn' : 'npm';
      const installNote = skipInstall ? `  ${runCmd} install\n` : '';
      const displayPath = path.relative(process.cwd(), targetPath) || targetPath;

      return {
        success: true,
        files: [],
        errors: [],
        message: [
          `\n✅ Project ${appName} created successfully!`,
          `\n  cd ${displayPath}`,
          `  cp .env.example .env`,
          installNote,
          `  ${runCmd} run dev\n`,
        ]
          .filter(Boolean)
          .join('\n'),
      };
    } catch (err) {
      await fs.remove(targetPath).catch(() => {});
      return {
        success: false,
        files: [],
        errors: [(err as Error).message],
        message: `Error creating project: ${(err as Error).message}`,
      };
    }
  }

  private async replaceTokens(dir: string, appName: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const textExts = new Set([
      '.ts',
      '.js',
      '.json',
      '.md',
      '.yml',
      '.yaml',
      '.txt',
      '.example',
      '.prettierrc',
      '.gitignore',
      '.dockerignore',
      '',
    ]);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.replaceTokens(fullPath, appName);
      } else if (textExts.has(path.extname(entry.name))) {
        const content = await fs.readFile(fullPath, 'utf-8');
        if (content.includes('__APP_NAME__') || content.includes('APP_NAME_PLACEHOLDER')) {
          await fs.writeFile(
            fullPath,
            content.replaceAll('__APP_NAME__', appName).replaceAll('APP_NAME_PLACEHOLDER', appName),
            'utf-8'
          );
        }
      }
    }
  }
}
