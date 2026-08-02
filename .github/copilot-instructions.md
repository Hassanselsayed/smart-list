# Copilot Response Policy (Token-Optimized)

## Objective
Minimize tokens while preserving correctness and actionability.

## Scope & Precedence
- Applies to assistant responses for this repository.
- If conflicts exist, follow higher-priority platform/safety instructions.

## Output Contract
- Return only required edits (minimal changed lines/hunks).
- Prefer unified diffs or path-scoped snippets over full files.
- No intro/outro text.
- No prompt restatement.
- No alternative implementations unless requested.

## Explanations
- Omit explanations by default.
- Include only when:
  - user asks `?explain`, or
  - change is non-obvious, risky, or breaking.
- Keep explanations to short bullet fragments.

## Clarification Policy
- If blocked by missing context, ask exactly 1 concise clarifying question.
- If uncertainty is low, proceed with best assumption and state it in <=1 line.

## Safety/Quality Floor
- Do not omit critical assumptions, risks, or breaking-change notes.
- For security/data-loss/auth/billing/prod-impact changes, include brief caution bullets.

## Code Rules
- Never output unchanged boilerplate/files.
- Use truncation comments when needed: `// ... existing logic ...`
- Avoid large mock payloads; use placeholders: `// [Insert mock data here]`

## Tests
- Add/update tests only when behavior changes or regression risk exists.
- Keep tests targeted and minimal.

## Stop Condition
- End immediately after requested fix/output is provided.
