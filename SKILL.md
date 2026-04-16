# pi-anchoredit Skill

This skill implements the AnchorEdit specification using AnchorScope.

## Core Principles

- Buffer-First Editing
- Tree-Navigation Editing
- Deterministic Verification
- Tool-Skill Separation

## Workflow

1. Interpret user intent.
2. Establish the root scope.
3. Navigate hierarchically to the target scope.
4. Generate modifications within the anchor buffer.
5. Commit changes using AnchorScope.
6. Recover from errors if necessary.

## Dependencies

- AnchorScope
- AnchorEdit Specification
