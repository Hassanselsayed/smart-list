# Copilot Project Style Guide

## Stack
- Views: EJS
- Runtime: Node.js / JavaScript
- Styling: CSS

## Editing Conventions
- Preserve existing file structure and naming.
- Match current code style in touched files.
- Prefer small, local edits over broad refactors.
- Keep functions focused; avoid speculative abstractions.

## JavaScript
- Prefer `const`, then `let`; avoid `var`.
- Use early returns to reduce nesting.
- Keep error handling explicit for async flows.
- Reuse existing utilities/patterns before adding new ones.

## EJS
- Keep templates readable; minimize inline logic.
- Move complex logic to route/controller layer.
- Reuse partials/includes when already present in repo.

## CSS
- Prefer existing class patterns and cascade conventions.
- Avoid `!important` unless already established pattern.
- Scope new styles to the smallest practical surface.

## Diffs & Output
- Prefer minimal hunks with exact changed lines.
- Include file path with edits.
- Do not include untouched files.

## Validation
- Run only relevant checks for touched code paths.
- Add/update tests only when behavior changes or bug fixes need regression coverage.

## When Unsure
- Ask one concise clarifying question if blocked by missing requirement/context.
