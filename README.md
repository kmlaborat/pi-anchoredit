# pi-anchoredit

Hash-verified targeted file editing for pi coding agent,
powered by AnchorEdit v2 / AnchorScope v2.0.0.

## What it does

Replaces the built-in `edit` tool with `anchoredit_apply` — a safer,
more precise editing tool that:
- Matches an exact byte sequence (anchor) in a file
- Verifies file state before writing (hash verification)
- Guarantees zero modification outside the matched scope

## Why pi-anchoredit?

Hash-anchored edit tools like [oh-my-pi's Hashline](https://github.com/can1357/oh-my-pi) operate on **line-level content hashes** — the model references line anchors instead of reproducing text, which eliminates whitespace conflicts and ambiguous matches.
This works well for conventional source code, where edits naturally align with line boundaries. However, modern workloads often break this assumption:
* Minified or generated code
* Large single-line JSON / config blobs
* Inline structures where meaningful edits occur *within* a line
In these cases, line-level anchoring becomes a limiting abstraction.

## pi-anchoredit approach

pi-anchoredit removes the notion of "lines" entirely and instead operates on **exact byte-level anchors**.
* Anchors are matched as raw byte sequences
* Edits target precise substrings within a file
* No dependence on line structure or formatting

This makes it particularly effective for:
* Inline edits inside long single-line structures
* JSON / minified / serialized formats
* Binary file patching (firmware, binary configs, packed data)
* Fine-grained patching where line granularity is too coarse

## Positioning

* **[oh-my-pi Hashline](https://github.com/can1357/oh-my-pi)**: optimized for *line-level editing efficiency*
* **pi-anchoredit**: optimized for *intra-line precision and structure-agnostic editing*
Rather than replacing line-based approaches, this project is designed as a **complementary tool for edge cases where line abstraction breaks down**.

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
