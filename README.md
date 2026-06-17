# pi-anchoredit

Hash-verified targeted file editing for pi coding agent,
powered by AnchorEdit v2 / AnchorScope v2.0.0.

## What it does

Provides `anchoredit_apply` — a single tool that safely applies
targeted edits to files with hash verification.

## Prerequisites

- AnchorScope v2.0.0: https://github.com/kmlaborat/AnchorScope
- AnchorEdit v2: https://github.com/kmlaborat/AnchorEdit

Install both:
```bash
git clone https://github.com/kmlaborat/AnchorScope
cd AnchorScope && cargo install --path .

git clone https://github.com/kmlaborat/AnchorEdit
cd AnchorEdit && cargo install --path .
```

Optional: custom binary path
```bash
export ANCHOREDIT_BIN=/path/to/anchoredit
```

## Installation

```bash
pi install git:github.com/kmlaborat/pi-anchoredit
```

## Tool: anchoredit_apply

```
anchoredit_apply(
  file: "src/calculator.rs",
  anchor: "fn calculate_area(width: f64, height: f64) -> f64 {\n    width * height\n}",
  content: "fn calculate_area(width: f64, height: f64) -> f64 {\n    if width < 0.0 { return 0.0; }\n    width * height\n}"
)
```

## Documents

| Document | Description |
| :--- | :--- |
| [docs/SPEC.md](docs/SPEC.md) | Extension and Skill specification |
| [skills/anchoredit/SKILL.md](skills/anchoredit/SKILL.md) | LLM-facing usage guide |

## License

MIT License
