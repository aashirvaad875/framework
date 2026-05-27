var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/index.ts
import { Command as Command9 } from "commander";

// src/commands/create.ts
import { Command } from "commander";

// src/config-loader.ts
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var ConfigLoader = class {
  static async load(projectRoot = process.cwd()) {
    const jsonPath = path.join(projectRoot, ".frameworkrc.json");
    if (await fs.pathExists(jsonPath)) {
      const content = await fs.readJson(jsonPath);
      return this.normalizeConfig(content);
    }
    const tsPath = path.join(projectRoot, "framework.config.ts");
    if (await fs.pathExists(tsPath)) {
      try {
        const { default: config } = await import(`file://${tsPath}`);
        return this.normalizeConfig(config);
      } catch (err) {
        console.warn(`Warning: Could not load framework.config.ts: ${err.message}`);
      }
    }
    return this.getDefaults(projectRoot);
  }
  static normalizeConfig(config) {
    var _a, _b, _c;
    const cfg = config;
    return {
      modulePath: cfg.modulePath || "src/modules",
      templatePath: cfg.templatePath || path.join(__dirname, "../templates"),
      plugins: cfg.plugins || [],
      naming: {
        controllerSuffix: ((_a = cfg.naming) == null ? void 0 : _a.controllerSuffix) || "Controller",
        serviceSuffix: ((_b = cfg.naming) == null ? void 0 : _b.serviceSuffix) || "Service",
        modulePattern: ((_c = cfg.naming) == null ? void 0 : _c.modulePattern) || "*.module.ts"
      },
      overrides: cfg.overrides || {}
    };
  }
  static getDefaults(_projectRoot) {
    return {
      modulePath: "src/modules",
      templatePath: path.join(__dirname, "../templates"),
      plugins: [],
      naming: {
        controllerSuffix: "Controller",
        serviceSuffix: "Service",
        modulePattern: "*.module.ts"
      },
      overrides: {}
    };
  }
};

// src/utils/prompt.ts
import inquirer from "inquirer";
var PromptUtility = class {
  static async text(message, defaultValue) {
    const { answer } = await inquirer.prompt([
      {
        type: "input",
        name: "answer",
        message,
        default: defaultValue
      }
    ]);
    return answer;
  }
  static async select(message, choices) {
    const { answer } = await inquirer.prompt([
      {
        type: "list",
        name: "answer",
        message,
        choices
      }
    ]);
    return answer;
  }
  static async multiSelect(message, choices) {
    const { answer } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "answer",
        message,
        choices
      }
    ]);
    return answer;
  }
  static async confirm(message, defaultValue = false) {
    const { answer } = await inquirer.prompt([
      {
        type: "confirm",
        name: "answer",
        message,
        default: defaultValue
      }
    ]);
    return answer;
  }
};

// src/utils/file.ts
import fs2 from "fs-extra";
import path2 from "path";
var FileUtility = class {
  static async exists(filePath) {
    return fs2.pathExists(filePath);
  }
  static async write(filePath, content, overwrite = false) {
    if (await this.exists(filePath) && !overwrite) {
      throw new Error(`File already exists: ${filePath}`);
    }
    await fs2.ensureDir(path2.dirname(filePath));
    await fs2.writeFile(filePath, content, "utf-8");
  }
  static async read(filePath) {
    return fs2.readFile(filePath, "utf-8");
  }
  static async remove(filePath) {
    await fs2.remove(filePath);
  }
  static async ensureDirectory(dirPath) {
    await fs2.ensureDir(dirPath);
  }
  static normalizePath(filePath) {
    return filePath.replace(/\\/g, "/");
  }
  static async listFiles(dirPath, pattern) {
    const files = await fs2.readdir(dirPath);
    if (!pattern) {
      return files;
    }
    return files.filter((f) => pattern.test(f));
  }
};

// src/utils/validation.ts
var ValidationUtility = class {
  static validateClassName(name) {
    if (!name) {
      return { valid: false, error: "Class name is required" };
    }
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      return { valid: false, error: "Class name must be PascalCase (e.g., UserController)" };
    }
    return { valid: true };
  }
  static validateModuleName(name) {
    if (!name) {
      return { valid: false, error: "Module name is required" };
    }
    if (!/^[a-z0-9-]+$/.test(name)) {
      return {
        valid: false,
        error: "Module name must be lowercase with hyphens (e.g., user-profile)"
      };
    }
    return { valid: true };
  }
  static validatePath(filePath, projectRoot) {
    const resolved = __require("path").resolve(projectRoot, filePath);
    if (!resolved.startsWith(projectRoot)) {
      return { valid: false, error: "Path must be within project root" };
    }
    return { valid: true };
  }
  static validateAppName(name) {
    if (!name) {
      return { valid: false, error: "App name is required" };
    }
    if (!/^[a-z0-9-]+$/.test(name)) {
      return { valid: false, error: "App name must be lowercase with hyphens" };
    }
    return { valid: true };
  }
};

// src/utils/naming.ts
var NamingUtility = class {
  // kebab-case to PascalCase: user-controller → UserController
  static toPascalCase(kebab) {
    return kebab.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
  }
  // PascalCase to kebab-case: UserController → user-controller
  static toKebabCase(pascal) {
    return pascal.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }
  // PascalCase to camelCase: UserController → userController
  static toCamelCase(pascal) {
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }
  // PascalCase to snake_case: UserController → user_controller
  static toSnakeCase(pascal) {
    return pascal.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  }
  // Generate filename from class name: UserController → user.controller.ts
  static classNameToFileName(className, suffix = "") {
    const withoutSuffix = className.replace(new RegExp(suffix + "$"), "");
    return this.toKebabCase(withoutSuffix) + (suffix ? "." + this.toKebabCase(suffix) : "") + ".ts";
  }
};

// src/core/template-engine.ts
import Handlebars from "handlebars";
import fs3 from "fs-extra";
import path3 from "path";
import os from "os";
var TemplateEngine = class {
  builtInTemplatesPath;
  customTemplatesPath;
  constructor(builtInPath, customPath) {
    this.builtInTemplatesPath = builtInPath;
    this.customTemplatesPath = customPath || path3.join(os.homedir(), ".framework-cli", "templates");
  }
  async render(templateName, context) {
    const templateContent = await this.loadTemplate(templateName);
    const template = Handlebars.compile(templateContent);
    return template(context);
  }
  async loadTemplate(templateName) {
    const fileName = templateName.endsWith(".hbs") ? templateName : `${templateName}.hbs`;
    const customPath = path3.join(this.customTemplatesPath, fileName);
    if (await fs3.pathExists(customPath)) {
      console.log(`Loading custom template: ${customPath}`);
      return fs3.readFile(customPath, "utf-8");
    }
    const builtInPath = path3.join(this.builtInTemplatesPath, fileName);
    if (await fs3.pathExists(builtInPath)) {
      return fs3.readFile(builtInPath, "utf-8");
    }
    throw new Error(
      `Template not found: ${templateName} (searched: ${customPath}, ${builtInPath})`
    );
  }
  registerHelper(name, fn) {
    Handlebars.registerHelper(name, fn);
  }
  registerPartial(name, content) {
    Handlebars.registerPartial(name, content);
  }
};

// src/core/module-intelligence.ts
import fs4 from "fs-extra";
import path4 from "path";
import { Project } from "ts-morph";
var ModuleIntelligence = class {
  project;
  constructor(projectRoot) {
    this.project = new Project({
      tsConfigFilePath: path4.join(projectRoot, "tsconfig.json")
    });
  }
  async findModule(moduleName, modulesPath) {
    const files = await fs4.readdir(modulesPath);
    for (const file of files) {
      if (file.endsWith(".module.ts")) {
        const baseName = file.replace(".module.ts", "");
        if (baseName === moduleName || baseName.replace(/-/g, "") === moduleName.replace(/-/g, "")) {
          return path4.join(modulesPath, baseName, `${baseName}.module.ts`);
        }
      }
    }
    throw new Error(`Module not found: ${moduleName}`);
  }
  async listModules(modulesPath) {
    const modules = [];
    const dirs = await fs4.readdir(modulesPath, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const moduleFile = path4.join(modulesPath, dir.name, `${dir.name}.module.ts`);
        if (await fs4.pathExists(moduleFile)) {
          modules.push(dir.name);
        }
      }
    }
    return modules;
  }
  async analyzeModule(modulePath) {
    const content = await fs4.readFile(modulePath, "utf-8");
    const hasControllers = content.includes("controllers:");
    const hasProviders = content.includes("providers:");
    const isModule = content.includes("@Module(");
    return { hasControllers, hasProviders, isModule };
  }
  async getRegistrationTarget(modulePath, registrationType) {
    var _a;
    const sourceFile = this.project.addSourceFileAtPath(modulePath);
    const moduleDecorator = (_a = sourceFile.getClassByName(path4.basename(modulePath, ".ts").replace(".module", ""))) == null ? void 0 : _a.getDecorators().find((d) => d.getName() === "Module");
    if (!moduleDecorator) {
      throw new Error(`@Module decorator not found in ${modulePath}`);
    }
    const arrayKey = registrationType === "controller" ? "controllers" : "providers";
    return arrayKey;
  }
};

// src/core/ast-manipulator.ts
import { Project as Project2 } from "ts-morph";
import path5 from "path";
var ASTManipulator = class {
  project;
  constructor(projectRoot) {
    this.project = new Project2({
      tsConfigFilePath: path5.join(projectRoot, "tsconfig.json")
    });
  }
  addImport(filePath, importPath, namedImports) {
    const sourceFile = this.project.addSourceFileAtPath(filePath);
    const names = Array.isArray(namedImports) ? namedImports : [namedImports];
    const existing = sourceFile.getImportDeclaration((d) => {
      return d.getModuleSpecifierValue() === importPath;
    });
    if (existing) {
      for (const name of names) {
        if (!existing.getNamedImports().some((n) => n.getName() === name)) {
          existing.addNamedImport(name);
        }
      }
    } else {
      sourceFile.addImportDeclaration({
        moduleSpecifier: importPath,
        namedImports: names
      });
    }
  }
  registerInModule(filePath, className, arrayType) {
    const sourceFile = this.project.addSourceFileAtPath(filePath);
    const moduleClass = sourceFile.getClasses()[0];
    if (!moduleClass) {
      throw new Error(`No class found in ${filePath}`);
    }
    const moduleDecorator = moduleClass.getDecorators().find((d) => d.getName() === "Module");
    if (!moduleDecorator) {
      throw new Error(`@Module decorator not found in ${filePath}`);
    }
    const decoratorArg = moduleDecorator.getArguments()[0];
    if (!decoratorArg) {
      throw new Error(`@Module decorator has no arguments`);
    }
    const objLiteral = decoratorArg.asKindOrThrow(
      /* kind: SyntaxKind.ObjectLiteralExpression */
    );
    const arrayProp = objLiteral.getChildrenOfKind(
      /* SyntaxKind.PropertyAssignment */
    ).find((prop) => {
      var _a;
      return ((_a = prop.getChildAtIndex(0)) == null ? void 0 : _a.getText()) === arrayType;
    });
    if (!arrayProp) {
      objLiteral.addPropertyAssignment({
        name: arrayType,
        initializer: `[${className}]`
      });
    } else {
      const arrayChild = arrayProp.getLastChild();
      if (arrayChild == null ? void 0 : arrayChild.getText().includes("[")) {
        const arrayText = arrayChild.getText();
        const newArrayText = arrayText.replace(/]$/, `, ${className}]`);
        arrayChild.replaceWithText(newArrayText);
      }
    }
  }
  updateBarrelExport(indexFilePath, exportPath) {
    const sourceFile = this.project.addSourceFileAtPath(indexFilePath);
    const existingExport = sourceFile.getExportDeclarations().find((e) => e.getModuleSpecifierValue() === exportPath);
    if (!existingExport) {
      sourceFile.addExportDeclaration({
        moduleSpecifier: exportPath
      });
    }
  }
  async saveChanges() {
    await this.project.save();
  }
};

// src/core/plugin-registry.ts
var PluginRegistry = class {
  plugins = [];
  register(plugin) {
    this.plugins.push(plugin);
  }
  async executeBeforeGenerate(context) {
    let result = context;
    for (const plugin of this.plugins) {
      if (plugin.beforeGenerate) {
        try {
          result = await plugin.beforeGenerate(result);
        } catch (err) {
          console.warn(`Plugin ${plugin.name} beforeGenerate failed:`, err);
        }
      }
    }
    return result;
  }
  async executeAfterGenerate(result) {
    let output = result;
    for (const plugin of this.plugins) {
      if (plugin.afterGenerate) {
        try {
          output = await plugin.afterGenerate(output);
        } catch (err) {
          console.warn(`Plugin ${plugin.name} afterGenerate failed:`, err);
        }
      }
    }
    return output;
  }
  async executeBeforeWrite(file) {
    let output = file;
    for (const plugin of this.plugins) {
      if (plugin.beforeWrite) {
        try {
          output = await plugin.beforeWrite(output);
        } catch (err) {
          console.warn(`Plugin ${plugin.name} beforeWrite failed:`, err);
        }
      }
    }
    return output;
  }
  async executeAfterWrite(file) {
    for (const plugin of this.plugins) {
      if (plugin.afterWrite) {
        try {
          await plugin.afterWrite(file);
        } catch (err) {
          console.warn(`Plugin ${plugin.name} afterWrite failed:`, err);
        }
      }
    }
  }
};

// src/generators/base-generator.ts
var BaseGenerator = class {
  projectRoot;
  templateEngine;
  moduleIntelligence;
  astManipulator;
  pluginRegistry;
  constructor(projectRoot, templateEngine, moduleIntelligence, astManipulator, pluginRegistry) {
    this.projectRoot = projectRoot;
    this.templateEngine = templateEngine;
    this.moduleIntelligence = moduleIntelligence;
    this.astManipulator = astManipulator;
    this.pluginRegistry = pluginRegistry;
  }
  async execute(context) {
    try {
      const validation = this.validate(context);
      if (!validation.valid) {
        return {
          success: false,
          files: [],
          errors: [validation.error || "Validation failed"],
          message: `Validation failed: ${validation.error}`
        };
      }
      const modifiedContext = await this.pluginRegistry.executeBeforeGenerate(context);
      const content = await this.templateEngine.render(this.getTemplateName(), {
        appName: modifiedContext.appName,
        moduleName: modifiedContext.moduleName || "",
        className: modifiedContext.className || "",
        fileName: NamingUtility.classNameToFileName(modifiedContext.className || "Index"),
        description: modifiedContext.description || ""
      });
      const filePath = this.generateFilePath(modifiedContext);
      const file = { path: filePath, content };
      const modifiedFile = await this.pluginRegistry.executeBeforeWrite(file);
      const fileExists = await FileUtility.exists(modifiedFile.path);
      if (fileExists && !modifiedFile.overwrite) {
        return {
          success: false,
          files: [],
          errors: [`File already exists: ${modifiedFile.path}`],
          message: `Conflict: ${modifiedFile.path} already exists`
        };
      }
      await FileUtility.write(modifiedFile.path, modifiedFile.content, modifiedFile.overwrite);
      await this.pluginRegistry.executeAfterWrite(modifiedFile);
      const result = {
        success: true,
        files: [modifiedFile],
        errors: [],
        message: `\u2705 Generated ${this.getGeneratorType()}: ${modifiedFile.path}`
      };
      const finalResult = await this.pluginRegistry.executeAfterGenerate(result);
      return finalResult;
    } catch (err) {
      return {
        success: false,
        files: [],
        errors: [err.message],
        message: `Error: ${err.message}`
      };
    }
  }
};

// src/generators/controller-generator.ts
import path6 from "path";
var ControllerGenerator = class extends BaseGenerator {
  getTemplateName() {
    return "controller";
  }
  getRegistrationType() {
    return "controller";
  }
  validate(context) {
    const validation = ValidationUtility.validateClassName(context.className);
    if (!validation.valid) {
      return validation;
    }
    if (!context.className.endsWith("Controller")) {
      return { valid: false, error: 'Controller name must end with "Controller"' };
    }
    return { valid: true };
  }
  generateFilePath(context) {
    const fileName = NamingUtility.classNameToFileName(context.className, "Controller");
    return path6.join(
      this.projectRoot,
      context.path || "src/modules",
      context.moduleName,
      "controllers",
      fileName
    );
  }
  getGeneratorType() {
    return "Controller";
  }
};

// src/generators/service-generator.ts
import path7 from "path";
var ServiceGenerator = class extends BaseGenerator {
  getTemplateName() {
    return "service";
  }
  getRegistrationType() {
    return "provider";
  }
  validate(context) {
    const validation = ValidationUtility.validateClassName(context.className);
    if (!validation.valid) {
      return validation;
    }
    if (!context.className.endsWith("Service")) {
      return { valid: false, error: 'Service name must end with "Service"' };
    }
    return { valid: true };
  }
  generateFilePath(context) {
    const fileName = NamingUtility.classNameToFileName(context.className, "Service");
    return path7.join(
      this.projectRoot,
      context.path || "src/modules",
      context.moduleName,
      "services",
      fileName
    );
  }
  getGeneratorType() {
    return "Service";
  }
};

// src/generators/middleware-generator.ts
import path8 from "path";
var MiddlewareGenerator = class extends BaseGenerator {
  getTemplateName() {
    return "middleware";
  }
  getRegistrationType() {
    return null;
  }
  validate(context) {
    return ValidationUtility.validateClassName(context.className);
  }
  generateFilePath(context) {
    const fileName = NamingUtility.classNameToFileName(context.className);
    return path8.join(this.projectRoot, context.path || "src/middleware", fileName);
  }
  getGeneratorType() {
    return "Middleware";
  }
};

// src/generators/guard-generator.ts
import path9 from "path";
var GuardGenerator = class extends BaseGenerator {
  getTemplateName() {
    return "guard";
  }
  getRegistrationType() {
    return "provider";
  }
  validate(context) {
    return ValidationUtility.validateClassName(context.className);
  }
  generateFilePath(context) {
    const fileName = NamingUtility.classNameToFileName(context.className);
    return path9.join(this.projectRoot, context.path || "src/guards", fileName);
  }
  getGeneratorType() {
    return "Guard";
  }
};

// src/generators/interceptor-generator.ts
import path10 from "path";
var InterceptorGenerator = class extends BaseGenerator {
  getTemplateName() {
    return "interceptor";
  }
  getRegistrationType() {
    return "provider";
  }
  validate(context) {
    return ValidationUtility.validateClassName(context.className);
  }
  generateFilePath(context) {
    const fileName = NamingUtility.classNameToFileName(context.className);
    return path10.join(this.projectRoot, context.path || "src/interceptors", fileName);
  }
  getGeneratorType() {
    return "Interceptor";
  }
};

// src/generators/module-generator.ts
import path11 from "path";
var ModuleGenerator = class extends BaseGenerator {
  getTemplateName() {
    return "module";
  }
  getRegistrationType() {
    return null;
  }
  validate(context) {
    return ValidationUtility.validateModuleName(context.moduleName);
  }
  generateFilePath(context) {
    const fileName = `${context.moduleName}.module.ts`;
    return path11.join(this.projectRoot, "src/modules", context.moduleName, fileName);
  }
  getGeneratorType() {
    return "Module";
  }
  async execute(context) {
    const validation = this.validate(context);
    if (!validation.valid) {
      return { success: false, files: [], errors: [validation.error], message: validation.error };
    }
    try {
      const modulePath = path11.join(this.projectRoot, "src/modules", context.moduleName);
      await FileUtility.ensureDirectory(modulePath);
      const moduleContent = await this.templateEngine.render("module", {
        appName: context.appName,
        moduleName: context.moduleName,
        className: NamingUtility.toPascalCase(context.moduleName) + "Module",
        fileName: `${context.moduleName}.module.ts`,
        description: context.description || ""
      });
      const moduleFile = path11.join(modulePath, `${context.moduleName}.module.ts`);
      await FileUtility.write(moduleFile, moduleContent);
      const indexContent = `export * from './${context.moduleName}.module.js';
`;
      const indexFile = path11.join(modulePath, "index.ts");
      await FileUtility.write(indexFile, indexContent);
      await FileUtility.ensureDirectory(path11.join(modulePath, "controllers"));
      await FileUtility.ensureDirectory(path11.join(modulePath, "services"));
      await FileUtility.ensureDirectory(path11.join(modulePath, "dto"));
      return {
        success: true,
        files: [
          { path: moduleFile, content: moduleContent },
          { path: indexFile, content: indexContent }
        ],
        errors: [],
        message: `\u2705 Generated Module: ${context.moduleName}`
      };
    } catch (err) {
      return {
        success: false,
        files: [],
        errors: [err.message],
        message: `Error: ${err.message}`
      };
    }
  }
};

// src/generators/app-generator.ts
import path12 from "path";
var AppGenerator = class extends BaseGenerator {
  getTemplateName() {
    return "app";
  }
  getRegistrationType() {
    return null;
  }
  validate(context) {
    return ValidationUtility.validateAppName(context.appName);
  }
  generateFilePath(context) {
    return path12.join(context.path || process.cwd(), "src", "main.ts");
  }
  getGeneratorType() {
    return "Application";
  }
  async execute(context) {
    const validation = this.validate(context);
    if (!validation.valid) {
      return { success: false, files: [], errors: [validation.error], message: validation.error };
    }
    try {
      const appPath = context.path || process.cwd();
      const srcPath = path12.join(appPath, "src");
      await FileUtility.ensureDirectory(srcPath);
      const mainContent = await this.templateEngine.render("app", {
        appName: context.appName,
        moduleName: "app",
        className: "AppModule",
        fileName: "main.ts",
        description: "Application entry point"
      });
      const mainFile = path12.join(srcPath, "main.ts");
      await FileUtility.write(mainFile, mainContent);
      const moduleContent = await this.templateEngine.render("module", {
        appName: context.appName,
        moduleName: "app",
        className: "AppModule",
        fileName: "app.module.ts",
        description: "Root application module"
      });
      const moduleFile = path12.join(srcPath, "app.module.ts");
      await FileUtility.write(moduleFile, moduleContent);
      return {
        success: true,
        files: [
          { path: mainFile, content: mainContent },
          { path: moduleFile, content: moduleContent }
        ],
        errors: [],
        message: `\u2705 Created Application: ${context.appName}`
      };
    } catch (err) {
      return {
        success: false,
        files: [],
        errors: [err.message],
        message: `Error: ${err.message}`
      };
    }
  }
};

// src/commands/create.ts
function createAppCommand() {
  return new Command("create").description("Create a new framework application").argument("[name]", "Application name").option("--path <path>", "Output directory").option("--force", "Overwrite without prompting").action(async (name, options) => {
    try {
      let appName = name;
      if (!appName) {
        appName = await PromptUtility.text("What is your app name?", "my-app");
      }
      const validation = ValidationUtility.validateAppName(appName);
      if (!validation.valid) {
        console.error(`\u274C ${validation.error}`);
        process.exit(1);
      }
      const config = await ConfigLoader.load();
      const templateEngine = new TemplateEngine(config.templatePath);
      const moduleIntelligence = new ModuleIntelligence(process.cwd());
      const astManipulator = new ASTManipulator(process.cwd());
      const pluginRegistry = new PluginRegistry();
      const generator = new AppGenerator(
        process.cwd(),
        templateEngine,
        moduleIntelligence,
        astManipulator,
        pluginRegistry
      );
      const result = await generator.execute({
        projectRoot: process.cwd(),
        appName,
        modulePath: config.modulePath,
        path: options.path
      });
      console.log(result.message);
      if (!result.success) {
        result.errors.forEach((err) => console.error(`  - ${err}`));
        process.exit(1);
      }
    } catch (err) {
      console.error("Error creating app:", err);
      process.exit(1);
    }
  });
}

// src/commands/generate.ts
import { Command as Command2 } from "commander";
function generateCommand() {
  const generate = new Command2("generate").description("Generate code for your application");
  generate.addCommand(controllerCommand());
  generate.addCommand(serviceCommand());
  generate.addCommand(middlewareCommand());
  generate.addCommand(guardCommand());
  generate.addCommand(interceptorCommand());
  generate.addCommand(moduleCommand());
  return generate;
}

// src/commands/controller.ts
import { Command as Command3 } from "commander";
function controllerCommand() {
  return new Command3("controller").description("Generate a new controller").argument("[name]", "Controller class name").option("--module <module>", "Target module").option("--path <path>", "Custom path within module").option("--description <description>", "Controller description").option("--force", "Overwrite without prompting").action(async (name, options) => {
    try {
      const config = await ConfigLoader.load();
      const modules = await new ModuleIntelligence(process.cwd()).listModules(config.modulePath);
      let className = name;
      if (!className) {
        className = await PromptUtility.text("Controller name?", "ExampleController");
      }
      if (!className.endsWith("Controller")) {
        className += "Controller";
      }
      let moduleName = options.module;
      if (!moduleName) {
        moduleName = await PromptUtility.select("Select module:", modules);
      }
      const validation = ValidationUtility.validateClassName(className);
      if (!validation.valid) {
        console.error(`\u274C ${validation.error}`);
        process.exit(1);
      }
      const templateEngine = new TemplateEngine(config.templatePath);
      const moduleIntelligence = new ModuleIntelligence(process.cwd());
      const astManipulator = new ASTManipulator(process.cwd());
      const pluginRegistry = new PluginRegistry();
      const generator = new ControllerGenerator(
        process.cwd(),
        templateEngine,
        moduleIntelligence,
        astManipulator,
        pluginRegistry
      );
      const result = await generator.execute({
        projectRoot: process.cwd(),
        modulePath: config.modulePath,
        appName: "app",
        moduleName,
        className,
        path: options.path,
        description: options.description
      });
      console.log(result.message);
      if (!result.success) {
        result.errors.forEach((err) => console.error(`  - ${err}`));
        process.exit(1);
      }
    } catch (err) {
      console.error("Error generating controller:", err);
      process.exit(1);
    }
  });
}

// src/commands/service.ts
import { Command as Command4 } from "commander";
function serviceCommand() {
  return new Command4("service").description("Generate a new service").argument("[name]", "Service class name").option("--module <module>", "Target module").option("--path <path>", "Custom path within module").option("--description <description>", "Service description").option("--force", "Overwrite without prompting").action(async (name, options) => {
    try {
      const config = await ConfigLoader.load();
      const modules = await new ModuleIntelligence(process.cwd()).listModules(config.modulePath);
      let className = name;
      if (!className) {
        className = await PromptUtility.text("Service name?", "ExampleService");
      }
      if (!className.endsWith("Service")) {
        className += "Service";
      }
      let moduleName = options.module;
      if (!moduleName) {
        moduleName = await PromptUtility.select("Select module:", modules);
      }
      const validation = ValidationUtility.validateClassName(className);
      if (!validation.valid) {
        console.error(`\u274C ${validation.error}`);
        process.exit(1);
      }
      const templateEngine = new TemplateEngine(config.templatePath);
      const moduleIntelligence = new ModuleIntelligence(process.cwd());
      const astManipulator = new ASTManipulator(process.cwd());
      const pluginRegistry = new PluginRegistry();
      const generator = new ServiceGenerator(
        process.cwd(),
        templateEngine,
        moduleIntelligence,
        astManipulator,
        pluginRegistry
      );
      const result = await generator.execute({
        projectRoot: process.cwd(),
        modulePath: config.modulePath,
        appName: "app",
        moduleName,
        className,
        path: options.path,
        description: options.description
      });
      console.log(result.message);
      if (!result.success) {
        result.errors.forEach((err) => console.error(`  - ${err}`));
        process.exit(1);
      }
    } catch (err) {
      console.error("Error generating service:", err);
      process.exit(1);
    }
  });
}

// src/commands/middleware.ts
import { Command as Command5 } from "commander";
function middlewareCommand() {
  return new Command5("middleware").description("Generate a new middleware").argument("[name]", "Middleware class name").option("--module <module>", "Target module").option("--path <path>", "Custom path within module").option("--description <description>", "Middleware description").option("--force", "Overwrite without prompting").action(async (name, options) => {
    try {
      const config = await ConfigLoader.load();
      const modules = await new ModuleIntelligence(process.cwd()).listModules(config.modulePath);
      let className = name;
      if (!className) {
        className = await PromptUtility.text("Middleware name?", "ExampleMiddleware");
      }
      if (!className.endsWith("Middleware")) {
        className += "Middleware";
      }
      let moduleName = options.module;
      if (!moduleName) {
        moduleName = await PromptUtility.select("Select module:", modules);
      }
      const validation = ValidationUtility.validateClassName(className);
      if (!validation.valid) {
        console.error(`\u274C ${validation.error}`);
        process.exit(1);
      }
      const templateEngine = new TemplateEngine(config.templatePath);
      const moduleIntelligence = new ModuleIntelligence(process.cwd());
      const astManipulator = new ASTManipulator(process.cwd());
      const pluginRegistry = new PluginRegistry();
      const generator = new MiddlewareGenerator(
        process.cwd(),
        templateEngine,
        moduleIntelligence,
        astManipulator,
        pluginRegistry
      );
      const result = await generator.execute({
        projectRoot: process.cwd(),
        modulePath: config.modulePath,
        appName: "app",
        moduleName,
        className,
        path: options.path,
        description: options.description
      });
      console.log(result.message);
      if (!result.success) {
        result.errors.forEach((err) => console.error(`  - ${err}`));
        process.exit(1);
      }
    } catch (err) {
      console.error("Error generating middleware:", err);
      process.exit(1);
    }
  });
}

// src/commands/guard.ts
import { Command as Command6 } from "commander";
function guardCommand() {
  return new Command6("guard").description("Generate a new guard").argument("[name]", "Guard class name").option("--module <module>", "Target module").option("--path <path>", "Custom path within module").option("--description <description>", "Guard description").option("--force", "Overwrite without prompting").action(async (name, options) => {
    try {
      const config = await ConfigLoader.load();
      const modules = await new ModuleIntelligence(process.cwd()).listModules(config.modulePath);
      let className = name;
      if (!className) {
        className = await PromptUtility.text("Guard name?", "ExampleGuard");
      }
      if (!className.endsWith("Guard")) {
        className += "Guard";
      }
      let moduleName = options.module;
      if (!moduleName) {
        moduleName = await PromptUtility.select("Select module:", modules);
      }
      const validation = ValidationUtility.validateClassName(className);
      if (!validation.valid) {
        console.error(`\u274C ${validation.error}`);
        process.exit(1);
      }
      const templateEngine = new TemplateEngine(config.templatePath);
      const moduleIntelligence = new ModuleIntelligence(process.cwd());
      const astManipulator = new ASTManipulator(process.cwd());
      const pluginRegistry = new PluginRegistry();
      const generator = new GuardGenerator(
        process.cwd(),
        templateEngine,
        moduleIntelligence,
        astManipulator,
        pluginRegistry
      );
      const result = await generator.execute({
        projectRoot: process.cwd(),
        modulePath: config.modulePath,
        appName: "app",
        moduleName,
        className,
        path: options.path,
        description: options.description
      });
      console.log(result.message);
      if (!result.success) {
        result.errors.forEach((err) => console.error(`  - ${err}`));
        process.exit(1);
      }
    } catch (err) {
      console.error("Error generating guard:", err);
      process.exit(1);
    }
  });
}

// src/commands/interceptor.ts
import { Command as Command7 } from "commander";
function interceptorCommand() {
  return new Command7("interceptor").description("Generate a new interceptor").argument("[name]", "Interceptor class name").option("--module <module>", "Target module").option("--path <path>", "Custom path within module").option("--description <description>", "Interceptor description").option("--force", "Overwrite without prompting").action(async (name, options) => {
    try {
      const config = await ConfigLoader.load();
      const modules = await new ModuleIntelligence(process.cwd()).listModules(config.modulePath);
      let className = name;
      if (!className) {
        className = await PromptUtility.text("Interceptor name?", "ExampleInterceptor");
      }
      if (!className.endsWith("Interceptor")) {
        className += "Interceptor";
      }
      let moduleName = options.module;
      if (!moduleName) {
        moduleName = await PromptUtility.select("Select module:", modules);
      }
      const validation = ValidationUtility.validateClassName(className);
      if (!validation.valid) {
        console.error(`\u274C ${validation.error}`);
        process.exit(1);
      }
      const templateEngine = new TemplateEngine(config.templatePath);
      const moduleIntelligence = new ModuleIntelligence(process.cwd());
      const astManipulator = new ASTManipulator(process.cwd());
      const pluginRegistry = new PluginRegistry();
      const generator = new InterceptorGenerator(
        process.cwd(),
        templateEngine,
        moduleIntelligence,
        astManipulator,
        pluginRegistry
      );
      const result = await generator.execute({
        projectRoot: process.cwd(),
        modulePath: config.modulePath,
        appName: "app",
        moduleName,
        className,
        path: options.path,
        description: options.description
      });
      console.log(result.message);
      if (!result.success) {
        result.errors.forEach((err) => console.error(`  - ${err}`));
        process.exit(1);
      }
    } catch (err) {
      console.error("Error generating interceptor:", err);
      process.exit(1);
    }
  });
}

// src/commands/module.ts
import { Command as Command8 } from "commander";
function moduleCommand() {
  return new Command8("module").description("Generate a new module").argument("[name]", "Module name").option("--path <path>", "Custom path within modules directory").option("--description <description>", "Module description").option("--force", "Overwrite without prompting").action(async (name, options) => {
    try {
      const config = await ConfigLoader.load();
      let moduleName = name;
      if (!moduleName) {
        moduleName = await PromptUtility.text("Module name?", "example");
      }
      const validation = ValidationUtility.validateModuleName(moduleName);
      if (!validation.valid) {
        console.error(`\u274C ${validation.error}`);
        process.exit(1);
      }
      const templateEngine = new TemplateEngine(config.templatePath);
      const moduleIntelligence = new ModuleIntelligence(process.cwd());
      const astManipulator = new ASTManipulator(process.cwd());
      const pluginRegistry = new PluginRegistry();
      const generator = new ModuleGenerator(
        process.cwd(),
        templateEngine,
        moduleIntelligence,
        astManipulator,
        pluginRegistry
      );
      const result = await generator.execute({
        projectRoot: process.cwd(),
        modulePath: config.modulePath,
        appName: "app",
        moduleName,
        path: options.path,
        description: options.description
      });
      console.log(result.message);
      if (!result.success) {
        result.errors.forEach((err) => console.error(`  - ${err}`));
        process.exit(1);
      }
    } catch (err) {
      console.error("Error generating module:", err);
      process.exit(1);
    }
  });
}

// src/index.ts
import { readFileSync } from "fs";
import { fileURLToPath as fileURLToPath2 } from "url";
import { dirname, join } from "path";
var __dirname2 = dirname(fileURLToPath2(import.meta.url));
var packageJsonPath = join(__dirname2, "../package.json");
var packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
var program = new Command9().name("framework").description("Framework CLI - Scaffold projects and modules").version(packageJson.version).helpOption("-h, --help", "Display help for command");
program.addCommand(createAppCommand());
program.addCommand(generateCommand());
program.exitOverride((err) => {
  if (err.code !== "executeSubcommand") {
    console.error(`Error: ${err.message}`);
  }
  process.exit(err.exitCode);
});
if (process.argv.length < 3) {
  program.help();
} else {
  program.parse(process.argv);
}
export {
  program
};
