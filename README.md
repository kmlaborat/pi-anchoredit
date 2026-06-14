# pi-anchoredit

**pi-anchoredit** is the reference implementation of the AnchorEdit specification for Pi.

It enables LLM agents to perform safe, deterministic, and hierarchical code edits using AnchorScope.

## Overview

pi-anchoredit implements the Buffer-First and Tree-Navigation editing paradigms defined in AnchorEdit.

- Specification: https://github.com/kmlaborat/anchoredit
- Protocol: https://github.com/kmlaborat/AnchorScope

## Features

- Root Scope Establishment
- Buffer-First Editing
- Tree-Navigation Editing
- Deterministic Verification via AnchorScope
- Automatic Recovery from Errors

## Architecture

```
LLM → AnchorEdit → pi-anchoredit → AnchorScope → Source Code
```

## Installation

### pi-coding-agent

```bash
# User-level
git clone https://github.com/kmlaborat/pi-anchoredit ~/.pi/agent/skills/pi-anchoredit

# Or project-level
git clone https://github.com/kmlaborat/pi-anchoredit .pi/skills/pi-anchoredit
```

### Claude Code

Claude Code looks one level deep for SKILL.md files.
Clone and symlink the skill folder:

```bash
git clone https://github.com/kmlaborat/pi-anchoredit ~/pi-anchoredit
mkdir -p ~/.claude/skills
ln -s ~/pi-anchoredit/anchoredit ~/.claude/skills/anchoredit
```

## Available Skills

| Skill | Description |
| :--- | :--- |
| [anchoredit](anchoredit/SKILL.md) | Targeted, hash-verified code editing via AnchorScope and AnchorEdit |

## Status

Experimental reference implementation.

## License

MIT License
