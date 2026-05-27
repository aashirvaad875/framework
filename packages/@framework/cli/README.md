# @framework/cli

Enterprise CLI for scaffolding Framework applications and modules.

## Installation

```bash
npm install -g @framework/cli
# or
pnpm add -g @framework/cli
```

## Commands

### Create App

Create a new Framework application:

```bash
framework create my-app
```

### Generate Module

Generate a new module:

```bash
framework generate module users
```

### Generate Controller

Generate a controller and register it in a module:

```bash
framework generate controller UserController --module users
```

### Generate Service

Generate a service:

```bash
framework generate service UserService --module users
```

### Generate Middleware

Generate middleware:

```bash
framework generate middleware AuthMiddleware
```

### Generate Guard

Generate a guard:

```bash
framework generate guard IsAdmin
```

### Generate Interceptor

Generate an interceptor:

```bash
framework generate interceptor LoggingInterceptor
```

## Configuration

Create a `.frameworkrc.json` in your project root:

```json
{
  "modulePath": "src/modules",
  "templatePath": "~/.framework-cli/templates",
  "plugins": [],
  "naming": {
    "controllerSuffix": "Controller",
    "serviceSuffix": "Service"
  }
}
```

## Options

- `--force` — Overwrite files without prompting
- `--path <path>` — Custom file path
- `--description <text>` — Add description to generated class
