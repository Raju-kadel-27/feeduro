# UX Audit — Pro Design Benchmarking

**Usage:** `/ux-audit [optional: path/to/component or page]`

Look at the file referenced in the argument (or currently open / recently discussed file if none given) and answer the following:

## 1. What does this UI currently do?
Briefly describe the user-facing purpose and the current visual/interaction structure.

## 2. How do world-class products solve the same problem?

Research and compare how **at least 3 design-forward companies** handle the exact same UI surface. Pull concrete examples from companies like:

- **Linear** — interaction polish, keyboard-first, micro-animations
- **Vercel / Stripe** — information density, hierarchy, precision controls
- **Notion / Cron** — settings UX, form layout, empty states
- **Figma** — color/token pickers, toolbars, contextual controls
- **Loom / Pitch** — branding/customization flows, live preview patterns
- **Raycast / Arc** — command-palette UX, personalization panels

For each: describe what they do differently, why it works, and what interaction pattern or visual technique they use.

## 3. Gap analysis — what's missing or weak in the current implementation?

Rate each dimension 1–5 and explain:

| Dimension | Score | Notes |
|-----------|-------|-------|
| Visual hierarchy | | |
| Information density | | |
| Feedback & affordances | | |
| Empty / loading states | | |
| Accessibility | | |
| Mobile / responsive | | |
| Delight & polish | | |

## 4. Concrete improvement recommendations

List the **top 5 highest-leverage changes**, ordered by impact vs. effort:

For each change:
- **What:** exactly what to add/change/remove
- **Why:** the UX principle it addresses (Fitts's Law, progressive disclosure, etc.)
- **How:** specific implementation hint (component, pattern, library)
- **Reference:** which company does this well

## 5. Quick wins (< 1 hour each)

List 2–3 changes that can be dropped in right now with minimal risk — things like spacing tweaks, color contrast fixes, label copy improvements, or adding a missing `aria-label`.

---

Be opinionated. Don't hedge with "you could consider." Make a recommendation. Assume the goal is to ship a product that doesn't feel like a SaaS template.
