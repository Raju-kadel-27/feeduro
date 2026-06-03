# /create-commits

Stage and commit all pending changes, grouped by concern, on a clean working branch.

## Steps

1. **Check branch state** — run in parallel:
   - `git rev-parse --abbrev-ref HEAD` — current branch name
   - `git branch -r` — list remote branches
   - `git status --short` — all changed/untracked files

2. **Create a new branch if needed** — create one if the current branch is `main`, `master`, or any branch that already exists on the remote (i.e. appears in `git branch -r`). Derive the branch name from the dominant concern in the diff (e.g. `feat/views-chip-refactor`, `fix/billing-ui`). Skip this step if already on a local-only branch.

3. **Scan the diff** — run in parallel:
   - `git diff HEAD --stat` — files changed with ±line counts
   - `git diff HEAD -- '*.ts' '*.tsx' '*.sql'` — enough of the diff to understand what each file is doing (read, don't quote verbatim)

4. **Group into commits** — divide all changed/untracked files into logical groups by concern. Rules:
   - Aim for 4–5 commits; never more than 10
   - One group = one coherent concern (e.g. "extract shared primitives", "refactor chip consumers", "UI polish", "billing copy fix")
   - High-level groupings are fine — don't over-analyse; if files clearly belong together, batch them
   - New files and the existing files that use them belong in the same commit
   - Unrelated one-liner fixes (copy, className tweak) can be bundled into a single "polish" commit

5. **Stage and commit each group** — for each group, in order:
   ```
   git add <files in this group>
   git commit -m "<type>(<scope>): <what and why in one line>"
   ```
   Commit message rules:
   - Conventional commits format: `type(scope): message`
   - No Co-Authored-By, no AI attribution
   - No trailing period
   - Keep it high-level — a sentence a teammate would scan in `git log --oneline`

6. **Report** — after all commits, print `git log --oneline` from the branch point so the user can see the full commit list at a glance.

## Branch naming

- Pattern: `<type>/<short-slug>` — e.g. `feat/chip-primitives`, `fix/sidebar-nav`, `refactor/post-panel`
- Slug should reflect the dominant change, kebab-case, max ~4 words
- If the changes span multiple unrelated areas, pick the most significant one for the slug

## When NOT to create a new branch

- Already on a local-only branch (not present in `git branch -r`) — commit directly to it
