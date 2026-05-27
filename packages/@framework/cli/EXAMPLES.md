# CLI Examples

## Scenario 1: Create a New App

```bash
framework create users-api
# Output:
# Created Application: users-api
# Generated:
#   - src/main.ts
#   - src/app.module.ts
```

## Scenario 2: Generate Module with Controllers

```bash
framework generate module users
framework generate controller UserController --module users
framework generate service UserService --module users
# Creates complete module structure with auto-registration
```

## Scenario 3: Fast Mode with Flags

```bash
framework generate controller PostController --module posts --force
# No prompts, overwrites silently
```

## Scenario 4: Interactive Prompts

```bash
framework generate controller
# Prompts:
# Controller name? PostController
# Select module: (multiselect list)
```
