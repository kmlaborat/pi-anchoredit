# pi-anchoredit Specification

Version: 2.0.0
Status: Draft

The key words "MUST", "MUST NOT", "SHOULD", and "MAY" in this document are to
be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

---

## 1. Overview

**pi-anchoredit** is a pi coding agent extension that provides hash-verified,
targeted file editing via AnchorEdit v2 (which wraps AnchorScope v2.0.0).

It exposes a single tool to the LLM:

| Tool | Use |
| :--- | :--- |
| `anchoredit_apply` | The only tool needed for file edits |

**Recommended workflow:** Use `anchoredit_apply` for all edits.

---

## 2. Architecture

```
LLM Agent
  ↓ anchoredit_apply(file, anchor, content)
pi-anchoredit Extension
  ↓ anchoredit apply --file --anchor --replacement
AnchorEdit v2 (Rust)
  ↓ anchoredit apply (internal: read + write with hash verification)
AnchorScope v2.0.0
  ↓
Source File
```

pi-anchoredit is a thin wrapper. All byte-level matching, hashing, and
writing is performed by the AnchorEdit binary (which uses AnchorScope as
a Rust library dependency). The extension handles:

- Path resolution (including Windows/Unix path conversion)
- Calling `anchoredit apply` as a single command
- File mutation queuing (`withFileMutationQueue`) to prevent race conditions
- Structured error reporting to the LLM

---

## 3. Extension API (Normative)

### 3.1 anchoredit_apply

The primary and only tool for all file edits. Calls the `anchoredit apply`
subcommand as a single invocation. The `apply` subcommand internally
performs read (to get scope_hash) then write (with hash verification)
atomically. The LLM does not need to manage `scope_hash`.

**Parameters:**

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `file` | string | Path to the file to edit |
| `anchor` | string | Exact byte sequence to match. Must appear exactly once in the file. |
| `content` | string | Complete replacement for the matched anchor text. |

**Internal flow:**

```
1. Resolve file path
2. anchoredit apply --file <file> --anchor <anchor> --replacement <content>
   → OK: written N bytes
```

**Output on success:**

```
OK: written N bytes
```

**Error conditions:**

| Error | Cause | Agent action |
| :--- | :--- | :--- |
| `NO_MATCH` | anchor not found in file | Revise anchor string |
| `MULTIPLE_MATCHES` | anchor not unique | Use a longer anchor |
| `HASH_MISMATCH` | file changed between read and write | Retry anchoredit_apply |
| `IO_ERROR` | file not found or permission denied | Check file path |

---

### 3.2 Path Resolution

On Windows, Unix-style paths (e.g., `/tmp/file.rs`) are resolved via
`cygpath -w` when available (Git Bash / MSYS2 environments).
If `cygpath` is not available, the original path is passed to AnchorEdit,
which will return `IO_ERROR: file not found` for unresolvable paths.

Relative paths are resolved against the agent's current working directory (`ctx.cwd`).

---

### 3.3 File Mutation Safety

`anchoredit_apply` uses `withFileMutationQueue` to serialize concurrent
writes to the same file. This prevents data loss when multiple tool calls
target the same file in the same agent turn.

---

## 4. Skill (Informative)

The `skills/anchoredit/SKILL.md` file provides LLM-facing guidance for
using this extension. It is loaded automatically by pi when the package
is installed.

### 4.1 When to Use anchoredit_apply

Use `anchoredit_apply` for **all file edits**, including small files.
Do not use the built-in `edit` or `write` tools.

`anchoredit_apply` provides:
- Hash verification (detects concurrent modifications)
- Exact byte-level matching (no fuzzy replacement)
- Zero modification outside the matched scope

### 4.2 Choosing an Anchor

The anchor must be an exact byte sequence that appears **exactly once**
in the file.

Good anchors:
- A unique function signature with its opening brace
- A unique comment followed by the code below it
- A block of code that includes enough context to be unique

Bad anchors:
- A single common word (e.g., `width`) — causes `MULTIPLE_MATCHES`
- An empty string — causes `NO_MATCH`
- A string that does not exist in the file — causes `NO_MATCH`

If `MULTIPLE_MATCHES` is returned, widen the anchor to include more
surrounding context.

### 4.3 Constructing content

`content` is the **complete replacement** for the matched anchor text.

- The entire anchor is replaced by `content`
- Content outside the anchor is never modified
- The agent is responsible for correctness of the replacement

### 4.4 Error Handling

| Error | Action |
| :--- | :--- |
| `NO_MATCH` | Read the file, verify the anchor exists, revise |
| `MULTIPLE_MATCHES` | Add more surrounding context to the anchor |
| `HASH_MISMATCH` | File was modified concurrently — retry |
| `IO_ERROR` | Check file path and permissions |

---

## 5. Non-Goals

- Anchor discovery or scope localization
- Multi-file operations
- Version history or snapshots
- Semantic understanding of file content
- AST parsing or language awareness

---

## 6. Guarantees

1. Every edit targets exactly one uniquely identified scope
2. No edit is applied if the file state changed between read and write
3. Zero modification occurs outside the matched anchor scope
4. File mutation is serialized per file path within a single agent turn
5. All byte-level guarantees from AnchorScope v2.0.0 apply

---

## 7. References

- AnchorEdit v2: https://github.com/kmlaborat/AnchorEdit
- AnchorEdit SPEC: https://github.com/kmlaborat/AnchorEdit/blob/main/docs/SPEC.md
- AnchorScope v2.0.0: https://github.com/kmlaborat/AnchorScope
