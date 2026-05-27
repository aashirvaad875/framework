# Enterprise CLI Design Specification

## Overview

**Goal:** Build an enterprise CLI for the framework that scaffolds complete, production-ready projects with intelligent code generation, interactive prompts, and extensible template system.

**User Request:** Seven scaffold commands (create app, generate module/controller/service/middleware/guard/interceptor) using commander.js for CLI structure, inquirer for interactive prompts, and a template system with code generators.

**Architecture:** Three-layer design with Command Layer (CLI interface), Generator Core (template rendering, AST manipulation, module intelligence), and Extension Layer (plugins, custom templates, hooks).

---

## Core Requirements

### Commands
1. **create app** — Scaffold a new framework application with project structure
2. **generate module** — Generate a new module with barrel exports
3. **generate controller** — Generate a controller class and register in module
4. **generate service** — Generate a service class with dependency injection support
5. **generate middleware** — Generate middleware and register in module
6. **generate guard** — Generate an authentication/authorization guard and register
7. **generate interceptor** — Generate an interceptor and register in module

### User Experience
- **Hybrid Mode:** Commands accept `--flag` options for fast scripting; fall back to interactive prompts if values are missing
- **File Conflicts:** Prompt user by default; `--force` flag skips prompts and overwrites silently
- **Progressive Disclosure:** Interactive prompts ask only essential questions; advanced options available via flags
- **Feedback:** Clear console output showing what was generated, where files were written, and what's next

### Code Generation Quality
- Generated code follows framework conventions (decorators, DI, error handling)
- Classes automatically registered in module (imports, barrel exports updated)
- TypeScript AST manipulation ensures safe code insertion
- Full type safety — generated code is immediately TypeScript-valid

### Extensibility
- Plugin system with before/after hooks (beforeGenerate, afterGenerate, beforeWrite, afterWrite)
- Custom templates loadable from user directory (`~/.framework-cli/templates/`)
- Configuration file (`.frameworkrc.json` or `framework.config.ts`) for project-level customization
- Built-in generators extendable via plugin mechanism

---

## Architecture

### Layer 1: Command Layer (CLI Interface)
Powered by **commander.js**.

**Responsibilities:**
- Parse command-line arguments and flags
- Display help text and usage
- Delegate to generators with parsed inputs
- Report results to user

**Entry Point:** `bin/framework.js` with shebang, calls `packages/@framework/cli/src/index.ts`

**Design Pattern:** Each command (create, generate-module, generate-controller, etc.) is a separate `.js` or `.ts` file that exports a handler. CommandRegistry loads and registers them.

**Hybrid Flag/Prompt Pattern:**
```
framework generate controller --module=users [--name=UserController] [--path=src/controllers]

If --name is missing, prompt: "What's the controller name?"
If --module is missing, prompt: "Select a module" (multiselect list)
--force flag suppresses all conflict prompts
```

### Layer 2: Generator Core (Generation + Transformation)
**Responsibilities:**
- Render templates with context variables
- Parse and manipulate TypeScript AST (module registration, imports)
- Detect existing module structure
- Apply plugins (hooks before/after generation)
- Enforce naming conventions and validation

**Key Components:**

#### BaseGenerator (Abstract)
All generators inherit from this. Provides:
- `execute()` — main entry point
- `validate()` — input validation (class name format, module existence)
- `render()` — template rendering via TemplateEngine
- `integrate()` — AST-based module registration and import updates
- `write()` — file I/O with conflict detection
- Hooks for plugins: `beforeGenerate`, `afterGenerate`, `beforeWrite`, `afterWrite`

#### TemplateEngine
Renders Handlebars templates with context:
- Built-in templates live in `packages/@framework/cli/templates/`
- Custom templates loaded from `~/.framework-cli/templates/` (if exists) or project `.frameworkrc.json` path
- Context variables: `appName`, `moduleName`, `className`, `fileName`, `description`, etc.
- Fallback: If custom template doesn't exist, use built-in

#### ModuleIntelligence
Analyzes existing module structure:
- Detects module files (`user.module.ts`, `*.module.ts` pattern)
- Parses imports, class definitions, barrel exports
- Identifies where to insert new class registration
- Returns metadata: { modulePath, importPath, classListLocation }
- Used by controllers, services, etc. to auto-register

#### ASTManipulator
Uses **ts-morph** for safe TypeScript modification:
- Add import statements to module file
- Register class in module decorator (imports array, providers array)
- Update barrel exports in `index.ts`
- Preserves formatting, comments, existing code

### Layer 3: Extension Layer (Plugins + Templates)
**Plugin System:**
- Plugins implement `FrameworkPlugin` interface
- Hooks: `beforeGenerate(context)`, `afterGenerate(result)`, `beforeWrite(file)`, `afterWrite(file)`
- Registered via `.frameworkrc.json` or `framework.config.ts`
- Access to generate context (module name, class name, paths)

**Template Structure:**
```
packages/@framework/cli/templates/
├── controller.hbs          — Controller class template
├── service.hbs            — Service class template
├── middleware.hbs         — Middleware class template
├── guard.hbs              — Guard class template
├── interceptor.hbs        — Interceptor class template
├── module.hbs             — Module class template
└── app.hbs                — App bootstrap template

~/.framework-cli/templates/ (user custom, optional)
├── my-controller.hbs      — Custom override
└── ...
```

**Configuration File Locations (in order):**
1. `framework.config.ts` (TypeScript, supports full API)
2. `.frameworkrc.json` (JSON, simple key-value)
3. Environment variables (FRAMEWORK_CLI_*)

---

## Command Definitions

### 1. `create app`
Scaffolds a complete new framework application.

**Flags:**
- `--name <name>` — Application name (default: prompt)
- `--template <template>` — Starter template (default: 'basic')
- `--path <path>` — Output directory (default: current directory)
- `--force` — Overwrite without prompting

**Inputs (if flags missing):**
- App name: text input
- Starter template: single-select (basic, api, full-stack)
- Output path: text with validation

**Output:**
- Project directory with: `src/`, `package.json`, `tsconfig.json`, `src/main.ts`, `.frameworkrc.json`
- First module (default `app.module.ts`)
- Initial controller (default `app.controller.ts`)

### 2. `generate module`
Creates a new feature module.

**Flags:**
- `--name <name>` — Module name (default: prompt)
- `--path <path>` — Module directory (default: `src/modules/<name>/`)
- `--force` — Overwrite without prompting

**Inputs (if flags missing):**
- Module name: text input (validated: alphanumeric, lowercase)
- Custom path: optional text input

**Output:**
- `src/modules/<name>/<name>.module.ts` (module class with empty imports/providers)
- `src/modules/<name>/index.ts` (barrel export)
- `src/modules/<name>/controllers/`, `services/`, `dto/` directories

### 3. `generate controller`
Creates a controller and registers it in a module.

**Flags:**
- `--name <name>` — Controller class name (default: prompt)
- `--module <module>` — Target module name (default: prompt)
- `--path <path>` — Custom path within module (default: `controllers/`)
- `--force` — Overwrite without prompting

**Inputs (if flags missing):**
- Controller name: text input (validated: PascalCase, ends with 'Controller')
- Module: multiselect list of existing modules
- Description: optional text input

**Output:**
- Controller class file in target module
- Automatically updated module imports and providers
- Updated barrel export

### 4-7. `generate service|middleware|guard|interceptor`
Same pattern as controller but with different templates and registration hooks (some use `providers`, some use `middleware`, some use `guards`).

---

## File Structure

```
packages/@framework/cli/
├── src/
│   ├── index.ts                    — CLI entry point, loads commander setup
│   ├── commands/
│   │   ├── create.ts               — create-app command handler
│   │   ├── generate.ts             — generate command router
│   │   ├── controller.ts            — generate-controller handler
│   │   ├── service.ts               — generate-service handler
│   │   ├── middleware.ts            — generate-middleware handler
│   │   ├── guard.ts                 — generate-guard handler
│   │   ├── interceptor.ts           — generate-interceptor handler
│   │   ├── module.ts                — generate-module handler
│   │   └── index.ts                 — Command registry and loader
│   ├── generators/
│   │   ├── base-generator.ts        — BaseGenerator abstract class
│   │   ├── controller-generator.ts  — ControllerGenerator implementation
│   │   ├── service-generator.ts     — ServiceGenerator implementation
│   │   ├── middleware-generator.ts  — MiddlewareGenerator implementation
│   │   ├── guard-generator.ts       — GuardGenerator implementation
│   │   ├── interceptor-generator.ts — InterceptorGenerator implementation
│   │   ├── module-generator.ts      — ModuleGenerator implementation
│   │   ├── app-generator.ts         — AppGenerator for create-app
│   │   └── index.ts                 — Generator registry
│   ├── core/
│   │   ├── template-engine.ts       — Handlebars rendering + custom template loading
│   │   ├── module-intelligence.ts   — Analyze module structure, find registration points
│   │   ├── ast-manipulator.ts       — ts-morph wrapper for safe AST edits
│   │   ├── plugin-registry.ts       — Plugin management and hook execution
│   │   └── index.ts                 — Barrel export
│   ├── utils/
│   │   ├── prompt.ts                — Inquirer wrapper for interactive prompts
│   │   ├── file.ts                  — File I/O utilities, conflict detection
│   │   ├── validation.ts            — Name validation, path validation
│   │   ├── naming.ts                — Convert names (kebab → PascalCase, etc.)
│   │   └── index.ts                 — Barrel export
│   ├── types.ts                     — TypeScript interfaces (Plugin, Generator, Config)
│   └── config-loader.ts             — Load .frameworkrc.json or framework.config.ts
├── templates/
│   ├── controller.hbs
│   ├── service.hbs
│   ├── middleware.hbs
│   ├── guard.hbs
│   ├── interceptor.hbs
│   ├── module.hbs
│   └── app.hbs
├── package.json                     — Dependencies: commander, inquirer, ts-morph, handlebars, fs-extra
├── tsconfig.json
└── bin/
    └── framework.js                 — Executable entry point with #!/usr/bin/env node
```

---

## Data Flow

```
User Input (CLI + Flags)
    ↓
CommandHandler (commander.js)
    ↓
Interactive Prompts (inquirer) [if values missing]
    ↓
Input Validation
    ↓
Plugin: beforeGenerate Hook
    ↓
Generator.validate()
    ↓
TemplateEngine.render() — Load template, interpolate context
    ↓
ModuleIntelligence.analyze() — Detect where to register class
    ↓
ASTManipulator.integrate() — Add imports, register in module
    ↓
Plugin: beforeWrite Hook
    ↓
FileWriter.write() — Check conflicts (prompt or --force override)
    ↓
Plugin: afterWrite Hook
    ↓
Plugin: afterGenerate Hook
    ↓
Success Report to User
```

---

## Error Handling & Validation

### Input Validation
- **Class names:** PascalCase, no special characters
- **Module names:** lowercase, alphanumeric, hyphens (converted to snake_case)
- **Paths:** Must be within project, cannot create files outside project root
- **Module existence:** Verify target module exists before generating controller/service/etc.

### File Conflicts
- **Default:** Prompt user "File exists. Overwrite? (y/n)"
- **--force flag:** Silently overwrite
- **--skip flag:** Skip file, don't generate (useful in CI)

### Plugin Errors
- Catch plugin errors without stopping generation
- Log plugin errors to console but continue to output
- Mark files with plugin failures in success report

### Missing Templates
- Use built-in template as fallback if custom not found
- Log warning: "Custom template not found, using built-in"

---

## Configuration File Format

### .frameworkrc.json
```json
{
  "modulePath": "src/modules",
  "templatePath": "~/.framework-cli/templates",
  "plugins": [
    "@framework/cli-plugin-openapi",
    "./local-plugin.js"
  ],
  "naming": {
    "controllerSuffix": "Controller",
    "serviceSuffix": "Service",
    "modulePattern": "*.module.ts"
  },
  "overrides": {
    "controller": "custom-controller.hbs"
  }
}
```

### framework.config.ts (Alternative)
```typescript
import { FrameworkConfig } from '@framework/cli';

export default {
  modulePath: 'src/modules',
  plugins: ['@framework/cli-plugin-openapi'],
  // ... same structure, with TypeScript support
} as FrameworkConfig;
```

---

## Hybrid UX Examples

### Scenario 1: Fast Flag Mode (Scripting)
```bash
framework generate controller --name UserController --module users --force
# Runs silently, no prompts. Overwrites if files exist.
```

### Scenario 2: Interactive Fallback
```bash
framework generate controller --name UserController
# Prompts: "Select module:" [users, posts, comments, ...]
# Generates and reports result
```

### Scenario 3: Fully Interactive
```bash
framework generate controller
# Prompts: "Controller name?" → "UserController"
# Prompts: "Select module:" → "users"
# Generates and reports result
```

### Scenario 4: Show Help
```bash
framework generate controller --help
# Shows all available flags, examples, and descriptions
```

---

## Technology Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| CLI Framework | commander.js v11+ | Industry standard, clear syntax, built-in help |
| Interactive Prompts | inquirer v9+ | Progressive disclosure, multiselect support, validation |
| TypeScript AST | ts-morph | Safe code manipulation, preserves formatting |
| Templating | Handlebars | Simple syntax, familiar to most developers, good performance |
| File I/O | fs-extra | Promisified fs, recursive operations, cross-platform |
| Config Loading | TypeScript + JSON | Support both .ts and .json configs |

---

## Implementation Notes

### Module Intelligence Strategy
Most value is in auto-registering generated classes. For example:
```typescript
// Before
@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class UserModule {}

// User: framework generate service --name UserService --module users
// ModuleIntelligence detects: "providers array is where classes go"
// ASTManipulator adds import and registers

// After
import { UserService } from './services/user.service';

@Module({
  imports: [],
  controllers: [],
  providers: [UserService],
})
export class UserModule {}
```

This requires:
1. **Parsing** the module file to find `@Module({...})` decorator
2. **Identifying** which array to update (providers, controllers, guards, middleware, etc.)
3. **Inserting** the class reference and import statement
4. **Updating** barrel exports in `index.ts`

ts-morph handles all of this safely.

### Plugin System Rationale
Hooks enable third-party tools to:
- `beforeGenerate`: Modify context (e.g., prompt for additional fields)
- `afterGenerate`: Custom transformations
- `beforeWrite`: Reformat code, add linting, validate
- `afterWrite`: Copy files, trigger builds, push to git

Keeps CLI core focused, allows ecosystem growth.

---

## Success Criteria

✅ All 7 commands work end-to-end
✅ Generated code is valid TypeScript (type-checks)
✅ Generated code follows framework conventions
✅ Classes automatically registered in modules
✅ Imports and barrel exports updated automatically
✅ Interactive prompts work as fallback to flags
✅ --force flag suppresses all prompts
✅ Custom templates load if present
✅ Plugin system functional with hook execution
✅ Configuration file loading works (.json and .ts)
✅ Clear user feedback on what was generated
✅ Cross-platform (Windows, macOS, Linux)

---

## Out of Scope (Future Work)

- Scaffolding additional file types (migrations, tests, fixtures) — keep initial scope focused
- Advanced template syntax beyond Handlebars (Pug, EJS) — stick with one to start
- GUI or web-based scaffolding — CLI is faster for power users
- Built-in database schema generation — let plugins handle this
- Language support beyond TypeScript — future expansion
