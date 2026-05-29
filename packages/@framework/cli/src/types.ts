// Plugin system types
export interface GeneratorContext {
  projectRoot: string;
  modulePath: string;
  appName: string;
  moduleName?: string;
  className?: string;
  description?: string;
  path?: string;
  force?: boolean;
  skipInstall?: boolean;
  packageManager?: 'npm' | 'pnpm' | 'yarn';
  [key: string]: any; // Additional context from user input
}

export interface FrameworkPlugin {
  name: string;
  beforeGenerate?(context: GeneratorContext): Promise<GeneratorContext>;
  afterGenerate?(result: GenerateResult): Promise<GenerateResult>;
  beforeWrite?(file: FileToWrite): Promise<FileToWrite>;
  afterWrite?(file: FileToWrite): Promise<void>;
}

export interface GenerateResult {
  success: boolean;
  files: FileToWrite[];
  errors: string[];
  message: string;
}

export interface FileToWrite {
  path: string;
  content: string;
  overwrite?: boolean;
  skip?: boolean;
}

export interface ModuleMetadata {
  modulePath: string;
  className: string;
  importPath: string;
  registrationType: 'controller' | 'provider' | 'middleware' | 'guard' | 'interceptor';
}

export interface FrameworkConfig {
  modulePath?: string;
  templatePath?: string;
  plugins?: string[];
  naming?: {
    controllerSuffix?: string;
    serviceSuffix?: string;
    modulePattern?: string;
  };
  overrides?: {
    [generatorName: string]: string; // Template override paths
  };
}

export interface TemplateContext {
  appName: string;
  moduleName: string;
  className: string;
  fileName: string;
  description: string;
  [key: string]: any;
}

export interface CommandOptions {
  name?: string;
  module?: string;
  path?: string;
  description?: string;
  force?: boolean;
  skip?: boolean;
  template?: string;
}
