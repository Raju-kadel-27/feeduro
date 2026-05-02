# Biome Setup for Feediyo

## Overview
Biome is a production-ready linter and formatter written in Rust, set up to run automatically before every Git commit via Husky. This is significantly faster than traditional ESLint + Prettier setups.

## What Was Installed

### Dependencies
- **@biomejs/biome**: ^2.4.14 - The linting and formatting engine
- **husky**: ^9.1.7 - Git hooks manager for automatic checks

## Configuration Files

### `biome.json`
Located at the project root. Key settings:
- **VCS Integration**: Enabled with Git, respects `.gitignore`
- **Formatter**: 2-space indentation, 100-char line width, double quotes
- **Linter**: Recommended rules with warnings for unused variables/imports
- **JavaScript**: Configured for JSX/TSX with proper formatting rules
- **Import Organization**: Automatic import sorting enabled

### `.husky/pre-commit`
Automatically runs before every commit:
```bash
npx biome check --staged --write --no-errors-on-unmatched
```
- `--staged`: Only checks files added to staging area (fast)
- `--write`: Automatically fixes safe issues
- `--no-errors-on-unmatched`: Doesn't fail on unsupported file types

## Available Commands

```bash
# Check formatting, linting, and imports (dry run)
pnpm lint

# Fix all formatting and safe lint errors
pnpm lint:fix

# Format code only (use lint:fix for comprehensive fixes)
pnpm format
```

## How It Works

1. **During Development**: Use `pnpm lint:fix` to fix issues before committing
2. **During Commit**: Husky automatically runs Biome on staged files
   - If fixable issues are found, Biome fixes them and the commit proceeds
   - If hard lint errors exist, the commit fails and you must fix them manually
3. **CI/CD**: Run `pnpm lint` in your CI pipeline to catch issues

## Benefits for This Project

- **Speed**: Biome is 10-20x faster than ESLint + Prettier as your project grows
- **React Router v7**: Full JSX/TSX support with proper React imports handling
- **Cloudflare Workers**: Works seamlessly with worker configuration files
- **VCS-Aware**: Only checks changed files, keeping commits snappy
- **Team Friendly**: Hooks automatically installed for all team members via `prepare` script

## Testing the Setup

To verify everything works:

```bash
# Make an intentional formatting error in a file
# Run git add on that file
# Try to commit - Biome will fix it and the commit will succeed
```

## Troubleshooting

**Pre-commit hook doesn't run**:
```bash
# Ensure hooks are installed
npx husky install
```

**Biome doesn't recognize your file types**:
- Check that `ignoreUnknown: true` is set in biome.json (it is)
- Biome will skip file types it doesn't understand

**Performance issues**:
- Biome is optimized to work with `--staged` flag in pre-commit
- Full project checks are normal for initial setup
