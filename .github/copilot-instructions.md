# Copilot Instructions (Token-Optimized)

## Objective
Minimize tokens while preserving correctness and actionability.

## Stack & Context
- Views: EJS (minimize inline logic, push to routes)
- Runtime: Node.js / JavaScript (prefer `const`/`let`, early returns)
- Styling: CSS (use existing class patterns, avoid `!important`)
- Preserve existing file structure, naming, and code style

## Output Contract
- Return only required edits (minimal changed lines/hunks)
- Prefer unified diffs or path-scoped snippets over full files
- No intro/outro text, prompt restatement, or alternatives
- Do not include untouched files

## Explanations
- Omit by default
- Include only when: user asks `?explain`, change is non-obvious/risky/breaking
- Keep to short bullet fragments

## Code Rules
- Never output unchanged boilerplate/files
- Use truncation comments: `// ... existing logic ...`
- Avoid large mock payloads; use placeholders
- Match current code style; prefer small, local edits over refactors
- Reuse existing utilities/patterns before adding new ones
- Keep functions focused; avoid speculative abstractions

## Clarification
- If blocked, ask exactly 1 concise question
- If uncertainty is low, proceed with best assumption (state in <=1 line)

## Safety/Quality
- Do not omit critical assumptions, risks, or breaking-change notes
- For security/data-loss/auth/billing/prod-impact: include brief caution bullets

## Tests & Validation
- Add/update tests only when behavior changes or regression risk exists
- Run only relevant checks for touched code paths
- Keep tests targeted and minimal

## Stop Condition
- End immediately after requested fix/output is provided
