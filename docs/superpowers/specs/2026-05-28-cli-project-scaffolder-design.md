# CLI Project Scaffolder Design

**Date:** 2026-05-28  
**Status:** Approved  
**Scope:** `packages/@framework/cli` — expand `framework create` into a full project scaffolder

---

## Goal

`npm i -g @framework/cli` then `framework create my-app` produces a fully working, zero-config Express/TypeScript project with all tooling configured, a User CRUD API, and Docker hosting files — ready to run with `npm run dev`.

---

## Command UX

```bash
npm i -g @framework/cli

framework create my-app
# interactive if no name given:
# ? What is your app name? › my-app
# ? Package manager: › npm / pnpm / yarn

✔ Creating project my-app...
✔ Copying scaffold files
✔ Initializing git repository
✔ Installing packages

✅ Project my-app created successfully!

  cd my-app
  cp .env.example .env
  npm run dev
```

**Flags:**
- `--path <dir>` — output directory (default: `process.cwd()/<appName>`)
- `--force` — overwrite existing directory without prompt
- `--skip-install` — skip `npm install` (useful for CI / offline)
- `--package-manager <npm|pnpm|yarn>` — override detected package manager

---

## Generated Project File Tree

```
my-app/
├── .git/                          ← git init runs automatically
├── .gitignore                     ← node_modules, dist, .env, coverage
├── .dockerignore                  ← node_modules, dist, .env, .git
├── .env.example                   ← PORT, DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME, JWT_SECRET
├── .prettierrc                    ← matches @framework/prettier-config style
├── eslint.config.js               ← ESLint v9 flat config
├── tsconfig.json                  ← strict TypeScript, decorators enabled
├── vitest.config.ts               ← unit test config
├── README.md                      ← project name, setup steps, API routes
├── Dockerfile                     ← multi-stage: build + production
├── docker-compose.yml             ← app service + postgres:15-alpine service
└── package.json                   ← name="__APP_NAME__"
                                      deps: @framework/core, @framework/logger,
                                            reflect-metadata, typeorm, pg,
                                            dotenv, bcrypt, jsonwebtoken, joi
                                      devDeps: typescript, tsx, vitest,
                                               @types/node, @types/express,
                                               @types/bcrypt, @types/jsonwebtoken
                                      scripts: dev, build, start, test, lint
└── src/
    ├── main.ts                    ← bootstrap: initializeDatabase + Application + registerModule
    ├── app.module.ts              ← @Module imports: [UserModule, HealthModule]
    ├── config/
    │   ├── app.config.ts          ← PORT, HOST, CORS_ENABLED from process.env
    │   └── database.config.ts    ← DB_* from process.env + TypeORM DataSourceOptions
    └── modules/
        ├── users/
        │   ├── user.module.ts
        │   ├── controllers/
        │   │   └── user.controller.ts    ← POST / GET / GET:id / PUT:id / DELETE:id
        │   ├── services/
        │   │   └── user.service.ts
        │   ├── repositories/
        │   │   └── user.repository.ts
        │   ├── entities/
        │   │   └── user.entity.ts        ← id(uuid), email, name, createdAt
        │   └── dto/
        │       ├── create-user.dto.ts    ← Joi schema + TS type
        │       ├── update-user.dto.ts
        │       └── index.ts
        └── health/
            ├── health.module.ts
            └── controllers/
                └── health.controller.ts  ← GET /health → { status: "ok", timestamp }
```

---

## Architecture

### Token substitution strategy

All files in `templates/project-scaffold/` use `__APP_NAME__` as the placeholder. This covers:
- `package.json` → `"name": "__APP_NAME__"`
- `README.md` → `# __APP_NAME__`
- `docker-compose.yml` → service/image names

`AppGenerator.execute()` copies the entire `templates/project-scaffold/` directory using `fs-extra.copy()`, then walks every text file and calls `.replaceAll('__APP_NAME__', appName)`. Binary files (none expected) are copied as-is.

The existing Handlebars `TemplateEngine` is **not used** for the scaffold copy — it remains unchanged for `generate` sub-commands (controller, service, etc.).

### AppGenerator changes

`AppGenerator.execute()` is replaced with the following sequence:

1. **Validate** app name (existing `ValidationUtility.validateAppName`)
2. **Resolve target path** — `options.path || path.join(process.cwd(), appName)`
3. **Check for conflicts** — if target dir exists and is non-empty: prompt user unless `--force`
4. **Copy scaffold** — `fs-extra.copy(scaffoldTemplatePath, targetPath)`, then replace `__APP_NAME__` tokens in all text files
5. **git init** — `child_process.execSync('git init', { cwd: targetPath })`
6. **Install packages** — `child_process.execSync('npm install', { cwd: targetPath, stdio: 'inherit' })` (or pnpm/yarn)
7. **Print success** with next-step instructions

### create.ts command changes

Add `--skip-install` and `--package-manager` options. Pass them through to `AppGenerator`.

---

## Docker files

**`Dockerfile`** — multi-stage:
- Stage 1 (`builder`): `node:20-alpine`, copy `package.json`, run `npm ci`, copy `src/`, run `npm run build`
- Stage 2 (`production`): `node:20-alpine`, copy `dist/` + `package.json`, run `npm ci --only=production`, `CMD ["node", "dist/main.js"]`

**`docker-compose.yml`:**
```yaml
services:
  app:
    build: .
    ports: ["${PORT:-3000}:${PORT:-3000}"]
    env_file: .env
    depends_on: [postgres]
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: ${DB_NAME}
    volumes: [postgres_data:/var/lib/postgresql/data]
    ports: ["5432:5432"]
volumes:
  postgres_data:
```

---

## npm publish

Add to `packages/@framework/cli/package.json`:

```json
"files": ["dist", "bin", "templates"],
"publishConfig": { "access": "public" }
```

This ensures `templates/project-scaffold/` is bundled when published. The `bin` entry (`"framework": "./bin/framework.js"`) already exists.

---

## Error handling

- App name fails `validateAppName` → print error, exit 1
- Target dir exists + non-empty + no `--force` → prompt; if declined, exit 0
- `git init` fails → warn but continue (non-fatal)
- `npm install` fails → warn with manual instructions; scaffold files remain on disk
- Any template copy error → print error, clean up target dir, exit 1

---

## What is NOT changing

- `framework generate controller|service|module|guard|middleware|interceptor` — untouched
- `TemplateEngine` (Handlebars) — untouched
- `templates/*.hbs` files — untouched
- All other CLI infrastructure (`ConfigLoader`, utils, AST manipulator) — untouched
