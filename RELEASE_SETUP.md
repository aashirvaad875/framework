# GitHub Actions Release Automation Setup

This framework uses GitHub Actions to automatically publish packages to npm when you push to `main` or `feat/cli-project-scaffolder`.

## Prerequisites

### 1. Create @dancha npm Organization

- Go to https://www.npmjs.com/org/create
- Create organization named `dancha`
- Accept the terms (free tier available)

### 2. Create npm Publish Token

1. Login to npm: https://www.npmjs.com
2. Go to Account Settings → Auth Tokens
3. Create a new token with **Publish** permission
4. Copy the token (you'll only see it once)

### 3. Add GitHub Secret

1. Go to your GitHub repository: https://github.com/aashirvaad875/framework
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: Paste your npm token
6. Click "Add secret"

## How It Works

When you push to `main` or `feat/cli-project-scaffolder`:

1. **GitHub Actions** triggers the release workflow
2. **Changesets** detects package changes
3. **Creates a PR** with version bumps (if needed)
4. **Publishes to npm** when the PR is merged or push is direct
5. **Users can install**: `npm install -g @dancha/cli`

## Usage

### Adding a Changeset (Manual)

```bash
pnpm changeset
```

Then choose packages and bump level (patch/minor/major).

### Publishing Manually (If needed)

```bash
pnpm release
```

## Next Steps

1. ✅ Set up @dancha npm organization
2. ✅ Create npm authentication token
3. ✅ Add NPM_TOKEN to GitHub secrets
4. Push this branch to GitHub
5. Create a PR to `main`
6. Packages will auto-publish on merge!

## Verify Setup

```bash
# Test installation locally
npm install -g @dancha/cli

# Run the CLI
framework create my-project
```
