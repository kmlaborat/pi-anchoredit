# pi-anchoredit

A skill for [pi coding agent](https://pi.dev) that enables
targeted, hash-verified code editing using AnchorScope and AnchorEdit.

## How it Works

```
LLM Agent
  ↓ uses anchoredit skill
Sliding Bisection (anchoredit search)
  ↓ narrows to target region
AnchorScope (anchorscope read / write)
  ↓ hash-verified deterministic edit
Source File
```

## Prerequisites

- [AnchorScope](https://github.com/kmlaborat/AnchorScope) v2.0.0 or later
- [AnchorEdit](https://github.com/kmlaborat/AnchorEdit) v0.2.0 or later

Install both:
```bash
# AnchorScope
git clone https://github.com/kmlaborat/AnchorScope
cd AnchorScope && cargo install --path .

# AnchorEdit
git clone https://github.com/kmlaborat/AnchorEdit
cd AnchorEdit && cargo install --path .
```

## Installation

### pi-coding-agent

```bash
pi install git:github.com/kmlaborat/pi-anchoredit
```

### Try without installing

```bash
pi -e git:github.com/kmlaborat/pi-anchoredit
```

### Claude Code

Claude Code looks one level deep for SKILL.md files.
Clone and symlink the skill folder:

```bash
git clone https://github.com/kmlaborat/pi-anchoredit ~/pi-anchoredit
mkdir -p ~/.claude/skills
ln -s ~/pi-anchoredit/skills/anchoredit ~/.claude/skills/anchoredit
```

## Available Skills

| Skill | Description |
| :--- | :--- |
| [anchoredit](skills/anchoredit/SKILL.md) | Targeted, hash-verified code editing via AnchorScope and AnchorEdit |

## Status

Experimental. v0.1.0.

## License

MIT License
