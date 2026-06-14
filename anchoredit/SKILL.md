---
name: anchoredit
description: Targeted, hash-verified code editing using AnchorScope and AnchorEdit. Use when editing a specific part of a file — fixing bugs, refactoring functions, updating configuration values, or replacing any text block. Do NOT use full-file rewrites. Always use this skill for precise targeted edits.
compatibility: Requires anchoredit and anchorscope installed. Install: cargo install --path . in each repo.
---

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
