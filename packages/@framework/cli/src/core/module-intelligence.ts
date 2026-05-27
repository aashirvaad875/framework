import fs from 'fs-extra';
import path from 'path';
import { Project } from 'ts-morph';

export class ModuleIntelligence {
  private project: Project;

  constructor(projectRoot: string) {
    this.project = new Project({
      tsConfigFilePath: path.join(projectRoot, 'tsconfig.json'),
    });
  }

  async findModule(moduleName: string, modulesPath: string): Promise<string> {
    // Look for module file: user.module.ts, user-profile.module.ts, etc.
    const files = await fs.readdir(modulesPath);

    for (const file of files) {
      if (file.endsWith('.module.ts')) {
        // Check if this is the right module
        const baseName = file.replace('.module.ts', '');
        if (
          baseName === moduleName ||
          baseName.replace(/-/g, '') === moduleName.replace(/-/g, '')
        ) {
          return path.join(modulesPath, baseName, `${baseName}.module.ts`);
        }
      }
    }

    throw new Error(`Module not found: ${moduleName}`);
  }

  async listModules(modulesPath: string): Promise<string[]> {
    const modules: string[] = [];
    const dirs = await fs.readdir(modulesPath, { withFileTypes: true });

    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const moduleFile = path.join(modulesPath, dir.name, `${dir.name}.module.ts`);
        if (await fs.pathExists(moduleFile)) {
          modules.push(dir.name);
        }
      }
    }

    return modules;
  }

  async analyzeModule(
    modulePath: string
  ): Promise<{ hasControllers: boolean; hasProviders: boolean; isModule: boolean }> {
    const content = await fs.readFile(modulePath, 'utf-8');

    const hasControllers = content.includes('controllers:');
    const hasProviders = content.includes('providers:');
    const isModule = content.includes('@Module(');

    return { hasControllers, hasProviders, isModule };
  }

  async getRegistrationTarget(
    modulePath: string,
    registrationType: 'controller' | 'provider'
  ): Promise<string> {
    const sourceFile = this.project.addSourceFileAtPath(modulePath);
    const moduleDecorator = sourceFile
      .getClassByName(path.basename(modulePath, '.ts').replace('.module', ''))
      ?.getDecorators()
      .find(d => d.getName() === 'Module');

    if (!moduleDecorator) {
      throw new Error(`@Module decorator not found in ${modulePath}`);
    }

    const arrayKey = registrationType === 'controller' ? 'controllers' : 'providers';
    return arrayKey;
  }
}
